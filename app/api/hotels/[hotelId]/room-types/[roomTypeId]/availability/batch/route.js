import pool from '@/lib/db';
import { NextResponse } from 'next/server';
import { checkEventViewOnly } from '@/lib/apiViewOnlyCheck';

export async function PUT(request, { params }) {
    const client = await pool.connect();

    try {
        const hotelId = parseInt(params.hotelId);
        const roomTypeId = parseInt(params.roomTypeId);
        const { updates } = await request.json();

        if (!Array.isArray(updates)) {
            return NextResponse.json({ error: 'Updates must be an array' }, { status: 400 });
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

        // Start a transaction
        await client.query('BEGIN');

        const results = [];
        try {
            for (const update of updates) {
                const { date, available_rooms, price_per_night } = update;

                // Check if an entry exists for this date
                const existingEntry = await client.query(
                    'SELECT * FROM room_availability WHERE room_type_id = $1 AND date = $2::date',
                    [roomTypeId, date]
                );

                let result;
                if (existingEntry.rows.length > 0) {
                    // Update existing entry
                    result = await client.query(
                        `UPDATE room_availability 
                         SET available_rooms = $1, 
                             price_per_night = $2
                         WHERE room_type_id = $3 
                         AND date = $4::date
                         RETURNING room_type_id, date::text, available_rooms, price_per_night::numeric`,
                        [available_rooms, price_per_night, roomTypeId, date]
                    );
                } else {
                    // Insert new entry
                    result = await client.query(
                        `INSERT INTO room_availability 
                         (room_type_id, date, available_rooms, price_per_night)
                         VALUES ($1, $2::date, $3, $4)
                         RETURNING room_type_id, date::text, available_rooms, price_per_night::numeric`,
                        [roomTypeId, date, available_rooms, price_per_night]
                    );
                }

                results.push(result.rows[0]);
            }

            // Commit the transaction
            await client.query('COMMIT');

            return NextResponse.json(results);
        } catch (error) {
            // Rollback on error
            await client.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Error in batch update:', error);
        return NextResponse.json(
            { error: 'Failed to update availability' },
            { status: 500 }
        );
    } finally {
        client.release();
    }
} 