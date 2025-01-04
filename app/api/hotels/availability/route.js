import pool from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return Response.json({ 
        error: 'Start date and end date are required' 
      }, { status: 400 });
    }

    const query = `
      WITH date_range AS (
        SELECT generate_series(
          $1::date,
          $2::date,
          '1 day'::interval
        )::date AS date
      )
      SELECT 
        h.*,
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
                    COALESCE(ra.available_rooms, rt.total_rooms) as available_rooms,
                    COALESCE(ra.price_per_night, rt.base_price_per_night) as price_per_night
                  FROM date_range dr
                  LEFT JOIN room_availability ra ON ra.room_type_id = rt.room_type_id 
                    AND ra.date = dr.date
                  ORDER BY dr.date
                ) availability_info
              ) as availability
            FROM room_types rt
            WHERE rt.hotel_id = h.hotel_id
          ) room_type_info
        ) as room_types
      FROM hotels h
      ORDER BY h.category DESC, h.stars DESC, h.name
    `;

    const { rows } = await pool.query(query, [startDate, endDate]);
    return Response.json(rows);
  } catch (error) {
    console.error('Error getting hotels availability:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
} 