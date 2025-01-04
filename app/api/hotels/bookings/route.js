import pool from '@/lib/db';

export async function GET() {
  try {
    const query = `
      SELECT 
        h.*,
        (
          SELECT COUNT(b.booking_id)
          FROM room_types rt
          LEFT JOIN bookings b ON b.room_type_id = rt.room_type_id
          WHERE rt.hotel_id = h.hotel_id
        ) as total_bookings,
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
                  JOIN people p ON p.person_id = b.person_id
                  WHERE b.room_type_id = rt.room_type_id
                  ORDER BY b.check_in_date
                ) booking_info
              ) as bookings
            FROM room_types rt
            WHERE rt.hotel_id = h.hotel_id
          ) room_type_info
        ) as room_types
      FROM hotels h
      ORDER BY h.category DESC, h.stars DESC, h.name
    `;

    const { rows } = await pool.query(query);
    return Response.json(rows);
  } catch (error) {
    console.error('Error getting hotels bookings:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
} 