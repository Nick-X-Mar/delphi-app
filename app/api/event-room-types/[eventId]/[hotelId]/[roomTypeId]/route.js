import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// DELETE event-room-type association
export async function DELETE(request, { params }) {
    try {
        const { eventId, hotelId, roomTypeId } = params;

        const query = `
            DELETE FROM event_room_types
            WHERE event_id = $1 AND hotel_id = $2 AND room_type_id = $3
            RETURNING *
        `;

        const { rows } = await pool.query(query, [eventId, hotelId, roomTypeId]);

        if (rows.length === 0) {
            return NextResponse.json({ error: 'Association not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Association deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
} 