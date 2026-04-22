import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  try {
    // First get hotel details and event name
    const hotelQuery = `
      WITH event_info AS (
        SELECT e.event_id, e.accommodation_start_date, e.accommodation_end_date
        FROM events e
        JOIN event_hotels eh ON e.event_id = eh.event_id
        WHERE eh.hotel_id = $1
        LIMIT 1
      ),
      date_range AS (
        SELECT generate_series(
          (SELECT accommodation_start_date FROM event_info),
          (SELECT accommodation_end_date FROM event_info),
          '1 day'::interval
        )::date AS date
      ),
      booked_rooms_per_date AS (
        SELECT
          b.room_type_id,
          d.date,
          COUNT(*) AS booked_rooms
        FROM date_range d
        INNER JOIN bookings b
          ON d.date >= b.check_in_date::date
         AND d.date < b.check_out_date::date
         AND b.event_id = (SELECT event_id FROM event_info)
         AND b.status NOT IN ('cancelled', 'invalidated')
        GROUP BY b.room_type_id, d.date
      ),
      no_booking AS (
        SELECT
          rt.hotel_id,
          COALESCE(SUM(
            GREATEST(
              COALESCE(ra.available_rooms, rt.total_rooms) - COALESCE(bpd.booked_rooms, 0),
              0
            )
            * COALESCE(
                NULLIF(ra.single_price_per_night, 0),
                NULLIF(rt.single_price_per_night, 0),
                NULLIF(ra.price_per_night, 0),
                NULLIF(rt.base_price_per_night, 0),
                0
              )
          ), 0)::numeric AS def_no_booking_amount
        FROM room_types rt
        CROSS JOIN date_range dr
        LEFT JOIN room_availability ra
          ON ra.room_type_id = rt.room_type_id AND ra.date = dr.date
        LEFT JOIN booked_rooms_per_date bpd
          ON bpd.room_type_id = rt.room_type_id AND bpd.date = dr.date
        WHERE rt.hotel_id = $1
        GROUP BY rt.hotel_id
      )
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
        END), 0)::numeric as guest_amount,
        COALESCE(nb.def_no_booking_amount, 0)::numeric as def_no_booking_amount
      FROM hotels h
      LEFT JOIN event_hotels eh ON h.hotel_id = eh.hotel_id
      LEFT JOIN events e ON eh.event_id = e.event_id
      LEFT JOIN room_types rt ON h.hotel_id = rt.hotel_id
      LEFT JOIN bookings b ON rt.room_type_id = b.room_type_id
      LEFT JOIN no_booking nb ON nb.hotel_id = h.hotel_id
      WHERE h.hotel_id = $1
      GROUP BY h.hotel_id, h.name, h.area, h.category, h.stars, e.name, nb.def_no_booking_amount
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