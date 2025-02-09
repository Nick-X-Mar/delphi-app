import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET hotel's event
export async function GET(request, { params }) {
    const { hotelId } = await params;

    try {
        const query = `
            SELECT e.*
            FROM events e
            INNER JOIN event_hotels eh ON e.event_id = eh.event_id
            WHERE eh.hotel_id = $1
            ORDER BY e.start_date DESC
            LIMIT 1
        `;

        const { rows } = await pool.query(query, [hotelId]);

        if (rows.length === 0) {
            return NextResponse.json({ error: 'No event found for this hotel' }, { status: 404 });
        }

        return NextResponse.json(rows[0]);
    } catch (error) {
        console.error('Error getting hotel event:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST to assign event to hotel
export async function POST(request, { params }) {
    const { hotelId } = params;
    const client = await pool.connect();

    try {
        const { eventId } = await request.json();

        if (!eventId) {
            return NextResponse.json({
                error: 'Event ID is required'
            }, { status: 400 });
        }

        await client.query('BEGIN');

        // Verify hotel exists
        const hotelExists = await client.query(
            'SELECT hotel_id FROM hotels WHERE hotel_id = $1',
            [hotelId]
        );

        if (hotelExists.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
        }

        // Verify event exists
        const eventExists = await client.query(
            'SELECT event_id FROM events WHERE event_id = $1',
            [eventId]
        );

        if (eventExists.rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Create or update the association
        const query = `
            INSERT INTO event_hotels (event_id, hotel_id)
            VALUES ($1, $2)
            ON CONFLICT (event_id, hotel_id) DO NOTHING
            RETURNING *
        `;

        const { rows } = await client.query(query, [eventId, hotelId]);

        await client.query('COMMIT');
        return NextResponse.json(rows[0], { status: 201 });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error assigning event to hotel:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
}

// DELETE to remove event association
export async function DELETE(request, { params }) {
    const { hotelId } = params;
    const client = await pool.connect();

    try {
        const { eventId } = await request.json();

        if (!eventId) {
            return NextResponse.json({
                error: 'Event ID is required'
            }, { status: 400 });
        }

        await client.query('BEGIN');

        const query = `
            DELETE FROM event_hotels
            WHERE event_id = $1 AND hotel_id = $2
            RETURNING *
        `;

        const { rows } = await client.query(query, [eventId, hotelId]);

        if (rows.length === 0) {
            await client.query('ROLLBACK');
            return NextResponse.json({ error: 'Association not found' }, { status: 404 });
        }

        await client.query('COMMIT');
        return NextResponse.json({ message: 'Event association removed successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error removing event association:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        client.release();
    }
} 