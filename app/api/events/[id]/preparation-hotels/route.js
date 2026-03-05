import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const eventId = (await params).id;

    const query = `
      SELECT h.hotel_id, h.name, h.area, h.category,
             CASE WHEN eph.hotel_id IS NOT NULL THEN true ELSE false END AS is_preparation_hotel
      FROM hotels h
      INNER JOIN event_hotels eh ON h.hotel_id = eh.hotel_id AND eh.event_id = $1
      LEFT JOIN event_preparation_hotels eph ON h.hotel_id = eph.hotel_id AND eph.event_id = $1
      ORDER BY h.category DESC, h.name
    `;

    const { rows } = await pool.query(query, [eventId]);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error getting preparation hotels:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const eventId = (await params).id;
    const { hotelIds } = await request.json();

    if (!Array.isArray(hotelIds)) {
      return NextResponse.json({ error: 'hotelIds must be an array' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        'DELETE FROM event_preparation_hotels WHERE event_id = $1',
        [eventId]
      );

      if (hotelIds.length > 0) {
        const values = hotelIds.map((_, i) => `($1, $${i + 2})`).join(', ');
        await client.query(
          `INSERT INTO event_preparation_hotels (event_id, hotel_id) VALUES ${values}`,
          [eventId, ...hotelIds]
        );
      }

      await client.query('COMMIT');
      return NextResponse.json({ message: 'Preparation hotels saved successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error saving preparation hotels:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
