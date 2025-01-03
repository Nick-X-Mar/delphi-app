import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
    const client = await pool.connect();

    try {
        const hotelId = parseInt(params.hotelId);
        const roomTypeId = parseInt(params.roomTypeId);
        const { updates } = await request.json();

        if (!Array.isArray(updates)) {
            return NextResponse.json({ error: 'Updates must be an array' }, { status: 400 });
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