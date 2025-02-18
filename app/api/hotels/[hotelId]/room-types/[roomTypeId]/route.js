import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET single room type
export async function GET(request, { params }) {
    const { hotelId, roomTypeId } = await params;


    try {
        const query = `
      SELECT 
        rt.*,
        (
          SELECT json_agg(ra.*)
          FROM (
            SELECT *
            FROM room_availability ra
            WHERE ra.room_type_id = rt.room_type_id
            AND ra.date >= CURRENT_DATE
            ORDER BY ra.date
            LIMIT 10
          ) ra
        ) as availability
      FROM room_types rt
      WHERE rt.hotel_id = $1 AND rt.room_type_id = $2
    `;

        const { rows } = await pool.query(query, [hotelId, roomTypeId]);

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Room type not found' }, { status: 404 });
        }

        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error('Error getting room type:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT update room type
export async function PUT(request, { params }) {
    const { hotelId, roomTypeId } = await params;
    try {
        const { name, description, total_rooms, base_price_per_night } = await request.json();

        // Validate required fields
        if (!name || !total_rooms || !base_price_per_night) {
            return NextResponse.json({
                error: 'Name, total rooms, and base price per night are required'
            }, { status: 400 });
        }

        // Validate numeric fields
        if (parseInt(total_rooms) <= 0) {
            return NextResponse.json({
                error: 'Total rooms must be greater than 0'
            }, { status: 400 });
        }

        // Format base price to have two decimal places
        const formattedBasePrice = Number(base_price_per_night).toFixed(2);

        // Validate that the formatted price is a valid number and greater than 0
        if (isNaN(formattedBasePrice) || parseFloat(formattedBasePrice) <= 0) {
            return NextResponse.json({
                error: 'Base price per night must be a valid number greater than 0'
            }, { status: 400 });
        }

        const query = `
      UPDATE room_types 
      SET 
        name = $1,
        description = $2,
        total_rooms = $3,
        base_price_per_night = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE hotel_id = $5 AND room_type_id = $6
      RETURNING *
    `;

        const values = [name, description, parseInt(total_rooms), formattedBasePrice, hotelId, roomTypeId];

        const { rows } = await pool.query(query, values);

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Room type not found' }, { status: 404 });
        }

        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error('Update error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
  const client = await pool.connect();
  
  try {
    const { roomTypeId } = params;
    
    await client.query('BEGIN');

    // First, delete all bookings for this room type
    const { rows: deletedBookings } = await client.query(`
      DELETE FROM bookings
      WHERE room_type_id = $1
      RETURNING booking_id
    `, [roomTypeId]);

    // Then delete all availability records
    await client.query(`
      DELETE FROM room_availability
      WHERE room_type_id = $1
    `, [roomTypeId]);

    // Finally delete the room type
    const { rows: deletedRoomTypes } = await client.query(`
      DELETE FROM room_types
      WHERE room_type_id = $1
      RETURNING room_type_id
    `, [roomTypeId]);

    if (deletedRoomTypes.length === 0) {
      throw new Error('Room type not found');
    }

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Room type and all associated bookings deleted successfully',
      deletedBookings: deletedBookings.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting room type:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 