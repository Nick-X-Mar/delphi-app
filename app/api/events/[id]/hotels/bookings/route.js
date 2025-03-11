import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const eventId = await params.id;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    
    let query = `
      WITH event_hotels AS (
        SELECT h.*,
          (
            SELECT COUNT(*)
            FROM bookings b
            WHERE b.event_id = $1
            AND b.status NOT IN ('cancelled', 'invalidated')
            AND b.room_type_id IN (
              SELECT rt.room_type_id
              FROM room_types rt
              WHERE rt.hotel_id = h.hotel_id
            )
          ) as total_bookings
        FROM hotels h
        INNER JOIN event_hotels eh ON h.hotel_id = eh.hotel_id
        WHERE eh.event_id = $1
        ${search ? `
          AND (
            LOWER(h.name) LIKE LOWER($2) OR
            LOWER(h.area) LIKE LOWER($2) OR
            LOWER(h.address) LIKE LOWER($2)
          )
        ` : ''}
      )
      SELECT 
        h.*,
        (
          SELECT json_agg(room_type_info)
          FROM (
            SELECT 
              rt.*,
              (
                SELECT COUNT(*)
                FROM bookings b
                WHERE b.room_type_id = rt.room_type_id
                AND b.event_id = $1
                AND b.status NOT IN ('cancelled', 'invalidated')
              ) as active_bookings_count,
              (
                SELECT json_agg(booking_info)
                FROM (
                  SELECT 
                    b.*,
                    p.first_name,
                    p.last_name,
                    p.email,
                    p.guest_type,
                    pd.company
                  FROM bookings b
                  INNER JOIN people p ON b.person_id = p.person_id
                  LEFT JOIN people_details pd ON p.person_id = pd.person_id
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

    const queryParams = search 
      ? [eventId, `%${search}%`] 
      : [eventId];
      
    const { rows } = await pool.query(query, queryParams);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error getting event hotels bookings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 