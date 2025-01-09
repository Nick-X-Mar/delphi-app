import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET event-room-types associations with optional filtering
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const eventId = searchParams.get('eventId');
        const hotelId = searchParams.get('hotelId');
        const roomTypeId = searchParams.get('roomTypeId');

        let query = `
            SELECT 
                ert.*,
                e.name as event_name,
                h.name as hotel_name,
                rt.name as room_type_name
            FROM event_room_types ert
            JOIN events e ON e.event_id = ert.event_id
            JOIN hotels h ON h.hotel_id = ert.hotel_id
            JOIN room_types rt ON rt.room_type_id = ert.room_type_id
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 1;

        if (eventId) {
            query += ` AND ert.event_id = $${paramCount}`;
            values.push(eventId);
            paramCount++;
        }
        if (hotelId) {
            query += ` AND ert.hotel_id = $${paramCount}`;
            values.push(hotelId);
            paramCount++;
        }
        if (roomTypeId) {
            query += ` AND ert.room_type_id = $${paramCount}`;
            values.push(roomTypeId);
            paramCount++;
        }

        query += ` ORDER BY e.start_date DESC, h.name, rt.name`;

        const { rows } = await pool.query(query, values);
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Error getting event-room-types:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST create event-room-type association
export async function POST(request) {
    try {
        const { eventId, hotelId, roomTypeId } = await request.json();

        // Validate required fields
        if (!eventId || !hotelId || !roomTypeId) {
            return NextResponse.json({
                error: 'Event ID, Hotel ID, and Room Type ID are required'
            }, { status: 400 });
        }

        // Verify that the hotel is associated with the event
        const hotelEventQuery = `
            SELECT 1 FROM event_hotels
            WHERE event_id = $1 AND hotel_id = $2
        `;
        const { rows: hotelEventRows } = await pool.query(hotelEventQuery, [eventId, hotelId]);
        if (hotelEventRows.length === 0) {
            return NextResponse.json({
                error: 'Hotel is not associated with this event'
            }, { status: 400 });
        }

        // Verify that the room type belongs to the hotel
        const roomTypeQuery = `
            SELECT 1 FROM room_types
            WHERE hotel_id = $1 AND room_type_id = $2
        `;
        const { rows: roomTypeRows } = await pool.query(roomTypeQuery, [hotelId, roomTypeId]);
        if (roomTypeRows.length === 0) {
            return NextResponse.json({
                error: 'Room type does not belong to this hotel'
            }, { status: 400 });
        }

        // Create the association
        const query = `
            INSERT INTO event_room_types (event_id, hotel_id, room_type_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (event_id, hotel_id, room_type_id) DO NOTHING
            RETURNING *
        `;

        const { rows } = await pool.query(query, [eventId, hotelId, roomTypeId]);
        return NextResponse.json(rows[0], { status: 201 });
    } catch (error) {
        console.error('Creation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
} 