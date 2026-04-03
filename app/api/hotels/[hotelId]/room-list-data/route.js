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
        END) as total_bookings,
        COALESCE(SUM(CASE 
          WHEN b.status NOT IN ('cancelled', 'invalidated') 
          THEN b.def_cost ELSE 0 
        END), 0)::numeric as def_amount,
        COALESCE(SUM(CASE 
          WHEN b.status NOT IN ('cancelled', 'invalidated') 
          THEN b.guest_cost ELSE 0 
        END), 0)::numeric as guest_amount
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
        b.days_paid_by_guest,
        b.guest_cost,
        b.def_cost,
        b.status,
        b.modification_type,
        b.modification_date,
        p.companion_email,
        p.companion_full_name,
        p.room_type as person_room_type,
        pd.notes,
        pd.room_size,
        p.first_name,
        p.last_name,
        p.email,
        p.mobile_phone,
        p.company,
        p.job_title,
        p.salutation
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
        const numPax = row.room_size != null
          ? row.room_size
          : (row.person_room_type === 'double' ? 2 : row.person_room_type === 'single' ? 1 : null);
        acc[row.room_type_id].bookings.push({
          booking_id: row.booking_id,
          check_in_date: row.check_in_date,
          check_out_date: row.check_out_date,
          total_cost: row.total_cost,
          days_paid_by_guest: row.days_paid_by_guest,
          guest_cost: row.guest_cost,
          def_cost: row.def_cost,
          room_type_name: row.name,
          num_pax: numPax,
          status: row.status,
          modification_type: row.modification_type,
          modification_date: row.modification_date,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          phone: row.mobile_phone,
          companion_full_name: row.companion_full_name,
          companion_email: row.companion_email,
          notes: row.notes,
          company: row.company,
          job_title: row.job_title,
          salutation: row.salutation
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