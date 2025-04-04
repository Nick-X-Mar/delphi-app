import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAgreementUrl } from '@/lib/s3';
import { isValidHotelCategory } from '@/lib/hotelCategories';

// GET single hotel
export async function GET(request, { params }) {
    const { hotelId } = await params;

    try {
        const query = `
      SELECT 
        h.*,
        (
          SELECT json_agg(rt.*)
          FROM room_types rt
          WHERE rt.hotel_id = h.hotel_id
        ) as room_types
      FROM hotels h
      WHERE h.hotel_id = $1
    `;

        const { rows } = await pool.query(query, [hotelId]);

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
        }

        // If there's an agreement file, generate a pre-signed URL
        if (rows[0].agreement_file_link) {
            try {
                const signedUrl = await getAgreementUrl(rows[0].agreement_file_link);
                rows[0].agreement_file_link = signedUrl;
            } catch (error) {
                console.error('Error generating pre-signed URL:', error);
                // Don't fail the whole request if we can't generate the URL
                rows[0].agreement_file_link = null;
            }
        }

        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error('Error getting hotel:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT update hotel
export async function PUT(request, { params }) {
    const { hotelId } = await params;
    const client = await pool.connect();

    try {
        const {
            name,
            area,
            stars,
            category,
            address,
            phone_number,
            email,
            website_link,
            map_link,
            contact_name,
            contact_phone,
            contact_mobile,
            contact_email,
            eventId
        } = await request.json();

        // Validate required fields
        if (!name || !area || !category || !address || !eventId) {
            return NextResponse.json({
                error: 'Name, area, category, address, and event are required'
            }, { status: 400 });
        }

        // Convert stars to numeric and validate range if provided
        let starsNumeric = null;
        if (stars !== null && stars !== undefined && stars !== '') {
            starsNumeric = Number(stars);
            if (isNaN(starsNumeric) || starsNumeric < 0.0 || starsNumeric > 5.0) {
                return NextResponse.json({
                    error: 'Stars must be between 0.0 and 5.0'
                }, { status: 400 });
            }
        }

        // Validate category
        if (!isValidHotelCategory(category)) {
            return NextResponse.json({
                error: 'Invalid category'
            }, { status: 400 });
        }

        await client.query('BEGIN');

        // First update the hotel
        const updateQuery = `
          UPDATE hotels 
          SET 
            name = $1,
            area = $2,
            stars = $3,
            category = $4,
            address = $5,
            phone_number = $6,
            email = $7,
            website_link = $8,
            map_link = $9,
            contact_name = $10,
            contact_phone = $11,
            contact_mobile = $12,
            contact_email = $13,
            updated_at = CURRENT_TIMESTAMP
          WHERE hotel_id = $14
          RETURNING *
        `;

        const values = [
            name,
            area,
            starsNumeric,
            category,
            address || null,
            phone_number || null,
            email || null,
            website_link || null,
            map_link || null,
            contact_name || null,
            contact_phone || null,
            contact_mobile || null,
            contact_email || null,
            hotelId
        ];

        const { rows } = await client.query(updateQuery, values);

        if (rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
        }

        // Update event_hotels association
        // Use UPSERT (INSERT ... ON CONFLICT) to handle the event association
        const eventHotelQuery = `
          INSERT INTO event_hotels (event_id, hotel_id)
          VALUES ($1, $2)
          ON CONFLICT (event_id, hotel_id) DO NOTHING
        `;

        await client.query(eventHotelQuery, [eventId, hotelId]);

        await client.query('COMMIT');
        return NextResponse.json(rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}

// DELETE hotel
export async function DELETE(request, { params }) {
    const client = await pool.connect();
    
    try {
        const { hotelId } = await params;
        
        await client.query('BEGIN');

        // First, delete all bookings for all room types in this hotel
        const { rows: deletedBookings } = await client.query(`
          DELETE FROM bookings
          WHERE room_type_id IN (
            SELECT room_type_id 
            FROM room_types 
            WHERE hotel_id = $1
          )
          RETURNING booking_id
        `, [hotelId]);

        // Then delete all availability records
        await client.query(`
          DELETE FROM room_availability
          WHERE room_type_id IN (
            SELECT room_type_id 
            FROM room_types 
            WHERE hotel_id = $1
          )
        `, [hotelId]);

        // Delete all room types
        const { rows: deletedRoomTypes } = await client.query(`
          DELETE FROM room_types
          WHERE hotel_id = $1
          RETURNING room_type_id
        `, [hotelId]);

        // Finally delete the hotel
        const { rows: deletedHotel } = await client.query(`
          DELETE FROM hotels
          WHERE hotel_id = $1
          RETURNING hotel_id
        `, [hotelId]);

        if (deletedHotel.length === 0) {
            throw new Error('Hotel not found');
        }

        await client.query('COMMIT');

        return NextResponse.json({
            message: 'Hotel and all associated data deleted successfully',
            deletedBookings: deletedBookings.length,
            deletedRoomTypes: deletedRoomTypes.length
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting hotel:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    } finally {
        client.release();
    }
} 