import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET hotels associated with an event
export async function GET(request, { params }) {
  try {
    const eventId = await params.id;
    const query = `
      SELECT h.*
      FROM hotels h
      INNER JOIN event_hotels eh ON h.hotel_id = eh.hotel_id
      WHERE eh.event_id = $1
      ORDER BY h.category DESC, h.stars DESC, h.name
    `;
    
    const { rows } = await pool.query(query, [eventId]);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error getting event hotels:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST associate hotels with an event
export async function POST(request, { params }) {
  try {
    const eventId = await params.id;
    const { hotelIds } = await request.json();

    if (!Array.isArray(hotelIds)) {
      return NextResponse.json({ error: 'hotelIds must be an array' }, { status: 400 });
    }

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing associations for this event
      await client.query('DELETE FROM event_hotels WHERE event_id = $1', [eventId]);

      // Insert new associations
      if (hotelIds.length > 0) {
        const values = hotelIds.map((hotelId) => `(${eventId}, ${hotelId})`).join(',');
        await client.query(`
          INSERT INTO event_hotels (event_id, hotel_id)
          VALUES ${values}
        `);
      }

      await client.query('COMMIT');
      return NextResponse.json({ message: 'Hotels associated successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error associating hotels:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE remove all hotel associations for an event
export async function DELETE(request, { params }) {
  try {
    const eventId = await params.id;
    await pool.query('DELETE FROM event_hotels WHERE event_id = $1', [eventId]);
    return NextResponse.json({ message: 'Hotel associations removed successfully' });
  } catch (error) {
    console.error('Error removing hotel associations:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 