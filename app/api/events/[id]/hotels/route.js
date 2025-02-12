import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET hotels associated with an event
export async function GET(request, { params }) {
  try {
    const eventId = await params.id;
    const query = `
      WITH date_range AS (
        SELECT generate_series(
          (SELECT accommodation_start_date FROM events WHERE event_id = $1),
          (SELECT accommodation_end_date FROM events WHERE event_id = $1),
          '1 day'::interval
        )::date AS date
      ),
      bookings_per_date AS (
        SELECT 
          b.room_type_id,
          d.date,
          COUNT(*) as booked_rooms
        FROM date_range d
        INNER JOIN bookings b ON d.date >= (b.check_in_date AT TIME ZONE 'UTC')::date
          AND d.date < (b.check_out_date AT TIME ZONE 'UTC')::date
          AND b.event_id = $1
          AND b.status != 'cancelled'
        GROUP BY b.room_type_id, d.date
      )
      SELECT h.*,
        (
          SELECT json_agg(room_type_info)
          FROM (
            SELECT 
              rt.*,
              (
                SELECT json_agg(availability_info)
                FROM (
                  SELECT 
                    dr.date,
                    COALESCE(ra.available_rooms, rt.total_rooms) - COALESCE(bpd.booked_rooms, 0) as available_rooms,
                    COALESCE(ra.price_per_night, rt.base_price_per_night) as price_per_night
                  FROM date_range dr
                  LEFT JOIN room_availability ra ON ra.room_type_id = rt.room_type_id 
                    AND ra.date = dr.date
                  LEFT JOIN bookings_per_date bpd ON bpd.room_type_id = rt.room_type_id
                    AND bpd.date = dr.date
                  ORDER BY dr.date
                ) availability_info
              ) as availability
            FROM room_types rt
            WHERE rt.hotel_id = h.hotel_id
          ) room_type_info
        ) as room_types
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