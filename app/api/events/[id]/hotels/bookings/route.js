import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const eventId = await params.id;
    
    const query = `
      WITH event_hotels AS (
        SELECT h.*,
          (
            SELECT COUNT(*)
            FROM bookings b
            WHERE b.event_id = $1
            AND b.room_type_id IN (
              SELECT rt.room_type_id
              FROM room_types rt
              WHERE rt.hotel_id = h.hotel_id
            )
          ) as total_bookings
        FROM hotels h
        INNER JOIN event_hotels eh ON h.hotel_id = eh.hotel_id
        WHERE eh.event_id = $1
      )
      SELECT 
        h.*,
        (
          SELECT json_agg(room_type_info)
          FROM (
            SELECT 
              rt.*,
              (
                SELECT json_agg(booking_info)
                FROM (
                  SELECT 
                    b.*,
                    p.first_name,
                    p.last_name,
                    p.email
                  FROM bookings b
                  INNER JOIN people p ON b.person_id = p.person_id
                  WHERE b.room_type_id = rt.room_type_id
                  AND b.event_id = $1
                  ORDER BY b.check_in_date
                ) booking_info
              ) as bookings
            FROM room_types rt
            WHERE rt.hotel_id = h.hotel_id
          ) room_type_info
        ) as room_types
      FROM event_hotels h
      ORDER BY h.category DESC, h.stars DESC, h.name;
    `;

    const { rows } = await pool.query(query, [eventId]);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error getting event hotels bookings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 