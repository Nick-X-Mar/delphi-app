import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  try {
    // First get hotel details and event name
    const hotelQuery = `
      SELECT 
        h.hotel_id,
        h.name,
        h.area,
        h.category,
        h.stars,
        e.name as event_name,
        COUNT(DISTINCT CASE 
          WHEN b.status NOT IN ('cancelled', 'invalidated') 
          THEN b.booking_id 
        END) as total_bookings
      FROM hotels h
      LEFT JOIN event_hotels eh ON h.hotel_id = eh.hotel_id
      LEFT JOIN events e ON eh.event_id = e.event_id
      LEFT JOIN room_types rt ON h.hotel_id = rt.hotel_id
      LEFT JOIN bookings b ON rt.room_type_id = b.room_type_id
      WHERE h.hotel_id = $1
      GROUP BY h.hotel_id, h.name, h.area, h.category, h.stars, e.name
    `;

    const { rows: [hotel] } = await pool.query(hotelQuery, [params.hotelId]);

    if (!hotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    // Get room types with their bookings
    const roomTypesQuery = `
      SELECT 
        rt.room_type_id,
        rt.name,
        rt.base_price_per_night,
        b.booking_id,
        b.check_in_date,
        b.check_out_date,
        b.total_cost,
        b.status,
        b.modification_type,
        b.modification_date,
        p.companion_email,
        p.companion_full_name,
        pd.notes,
        p.first_name,
        p.last_name,
        p.email,
        p.mobile_phone
      FROM room_types rt
      LEFT JOIN bookings b ON rt.room_type_id = b.room_type_id
      LEFT JOIN people p ON b.person_id = p.person_id
      LEFT JOIN people_details pd ON p.person_id = pd.person_id
      WHERE rt.hotel_id = $1
      ORDER BY rt.name, b.check_in_date
    `;

    const { rows: bookings } = await pool.query(roomTypesQuery, [params.hotelId]);

    // Group bookings by room type
    const roomTypes = bookings.reduce((acc, row) => {
      if (!acc[row.room_type_id]) {
        acc[row.room_type_id] = {
          room_type_id: row.room_type_id,
          name: row.name,
          base_price_per_night: row.base_price_per_night,
          bookings: []
        };
      }

      if (row.booking_id) {
        acc[row.room_type_id].bookings.push({
          booking_id: row.booking_id,
          check_in_date: row.check_in_date,
          check_out_date: row.check_out_date,
          total_cost: row.total_cost,
          status: row.status,
          modification_type: row.modification_type,
          modification_date: row.modification_date,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          phone: row.mobile_phone,
          companion_full_name: row.companion_full_name,
          companion_email: row.companion_email,
          notes: row.notes
        });
      }

      return acc;
    }, {});

    return NextResponse.json({
      ...hotel,
      room_types: Object.values(roomTypes)
    });
  } catch (error) {
    console.error('Error fetching hotel PDF data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 