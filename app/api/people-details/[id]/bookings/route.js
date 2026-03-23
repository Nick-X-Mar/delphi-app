import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const personId = params.id;
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    const countQuery = `
      SELECT COUNT(*) as active_bookings
      FROM bookings
      WHERE person_id = $1
      AND status NOT IN ('cancelled', 'invalidated')
    `;

    const { rows } = await pool.query(countQuery, [personId]);
    const activeBookings = parseInt(rows[0].active_bookings);

    if (detailed && activeBookings > 0) {
      const detailQuery = `
        SELECT b.booking_id, b.check_in_date, b.check_out_date, b.status,
               h.name as hotel_name, rt.name as room_type_name
        FROM bookings b
        JOIN room_types rt ON b.room_type_id = rt.room_type_id
        JOIN hotels h ON rt.hotel_id = h.hotel_id
        WHERE b.person_id = $1
        AND b.status NOT IN ('cancelled', 'invalidated')
        ORDER BY b.check_in_date
      `;
      const details = await pool.query(detailQuery, [personId]);
      return NextResponse.json({ activeBookings, bookings: details.rows });
    }

    return NextResponse.json({ activeBookings });
  } catch (error) {
    console.error('Error checking active bookings:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 