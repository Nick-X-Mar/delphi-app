import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkEventViewOnly } from '@/lib/apiViewOnlyCheck';

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
    const client = await pool.connect();
    
    try {
        const { name, description, total_rooms, base_price_per_night, single_price_per_night } = await request.json();

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

        // Validate that the formatted price is a valid number and greater than or equal to 0
        if (isNaN(formattedBasePrice) || parseFloat(formattedBasePrice) < 0) {
            return NextResponse.json({
                error: 'Base price per night must be a valid number (0 or greater)'
            }, { status: 400 });
        }

        // Get event ID from room type's hotel
        const eventResult = await client.query(
            `SELECT e.event_id FROM events e
             JOIN event_hotels eh ON e.event_id = eh.event_id
             JOIN room_types rt ON rt.hotel_id = eh.hotel_id
             WHERE rt.room_type_id = $1
             ORDER BY e.start_date DESC LIMIT 1`,
            [roomTypeId]
        );
        
        if (eventResult.rows.length > 0) {
            const eventId = eventResult.rows[0].event_id;
            // Check if event has passed (view-only mode)
            const { isViewOnly } = await checkEventViewOnly(eventId);
            if (isViewOnly) {
                return NextResponse.json({
                    error: 'Event has passed. Modifications are not allowed.'
                }, { status: 403 });
            }
        }

        await client.query('BEGIN');

        const formattedSinglePrice = single_price_per_night != null && single_price_per_night !== ''
            ? Number(single_price_per_night).toFixed(2)
            : null;

        // First, get the current room type to check if prices have changed
        const getCurrentRoomType = `
            SELECT base_price_per_night, single_price_per_night
            FROM room_types
            WHERE room_type_id = $1
        `;
        const { rows: [currentRoomType] } = await client.query(getCurrentRoomType, [roomTypeId]);
        const priceHasChanged = !currentRoomType || 
            parseFloat(currentRoomType.base_price_per_night) !== parseFloat(formattedBasePrice) ||
            (currentRoomType.single_price_per_night == null) !== (formattedSinglePrice == null) ||
            (currentRoomType.single_price_per_night != null && formattedSinglePrice != null && parseFloat(currentRoomType.single_price_per_night) !== parseFloat(formattedSinglePrice));

        // Update the room type
        const updateQuery = `
            UPDATE room_types 
            SET 
                name = $1,
                description = $2,
                total_rooms = $3,
                base_price_per_night = $4,
                single_price_per_night = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE hotel_id = $6 AND room_type_id = $7
            RETURNING *
        `;

        const values = [name, description, parseInt(total_rooms), formattedBasePrice, formattedSinglePrice, hotelId, roomTypeId];
        const { rows } = await client.query(updateQuery, values);

        if (rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Room type not found' }, { status: 404 });
        }

        // If prices have changed, recalculate booking costs
        if (priceHasChanged) {
            const getBookingsQuery = `
                SELECT 
                    b.booking_id,
                    b.check_in_date,
                    b.check_out_date,
                    b.person_id,
                    pd.room_size,
                    p.room_type as person_room_type
                FROM bookings b
                LEFT JOIN people_details pd ON b.person_id = pd.person_id
                LEFT JOIN people p ON b.person_id = p.person_id
                WHERE b.room_type_id = $1
                AND b.status NOT IN ('cancelled', 'invalidated')
            `;

            const { rows: bookings } = await client.query(getBookingsQuery, [roomTypeId]);

            const getAvailabilityQuery = `
                SELECT 
                    date,
                    price_per_night,
                    single_price_per_night
                FROM room_availability
                WHERE room_type_id = $1
            `;

            const { rows: availability } = await client.query(getAvailabilityQuery, [roomTypeId]);

            const priceMap = new Map();
            const singlePriceMap = new Map();
            availability.forEach(a => {
                const dateStr = a.date.toISOString().split('T')[0];
                priceMap.set(dateStr, parseFloat(a.price_per_night));
                if (a.single_price_per_night != null) {
                    singlePriceMap.set(dateStr, parseFloat(a.single_price_per_night));
                }
            });

            const newSinglePrice = formattedSinglePrice != null ? parseFloat(formattedSinglePrice) : null;

            for (const booking of bookings) {
                const roomSize = booking.room_size != null
                    ? booking.room_size
                    : (booking.person_room_type === 'single' ? 1 : booking.person_room_type === 'double' ? 2 : null);
                const isSinglePax = roomSize === 1;

                let totalCost = 0;
                let currentDate = new Date(booking.check_in_date);
                const checkOutDate = new Date(booking.check_out_date);

                while (currentDate < checkOutDate) {
                    const dateStr = currentDate.toISOString().split('T')[0];
                    let dailyPrice;

                    if (isSinglePax) {
                        const dailySingle = singlePriceMap.get(dateStr);
                        if (dailySingle != null) {
                            dailyPrice = dailySingle;
                        } else if (newSinglePrice != null) {
                            dailyPrice = newSinglePrice;
                        } else {
                            dailyPrice = priceMap.get(dateStr) || parseFloat(formattedBasePrice);
                        }
                    } else {
                        dailyPrice = priceMap.get(dateStr) || parseFloat(formattedBasePrice);
                    }

                    totalCost += dailyPrice;
                    currentDate.setDate(currentDate.getDate() + 1);
                }

                const updateBookingQuery = `
                    UPDATE bookings
                    SET 
                        total_cost = $1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE booking_id = $2
                `;

                await client.query(updateBookingQuery, [totalCost.toFixed(2), booking.booking_id]);
            }
        }

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

export async function DELETE(request, { params }) {
  const client = await pool.connect();
  
  try {
    const { roomTypeId } = await params;
    
    // Get event ID from room type's hotel
    const eventResult = await client.query(
        `SELECT e.event_id FROM events e
         JOIN event_hotels eh ON e.event_id = eh.event_id
         JOIN room_types rt ON rt.hotel_id = eh.hotel_id
         WHERE rt.room_type_id = $1
         ORDER BY e.start_date DESC LIMIT 1`,
        [roomTypeId]
    );
    
    if (eventResult.rows.length > 0) {
        const eventId = eventResult.rows[0].event_id;
        // Check if event has passed (view-only mode)
        const { isViewOnly } = await checkEventViewOnly(eventId);
        if (isViewOnly) {
            return NextResponse.json({
                error: 'Event has passed. Modifications are not allowed.'
            }, { status: 403 });
        }
    }
    
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