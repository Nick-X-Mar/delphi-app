import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const query = `
      SELECT 
        p.person_id,
        p.first_name,
        p.last_name,
        p.email,
        p.checkin_date,
        p.checkout_date,
        p.synced_at,
        p.company,
        p.job_title,
        pd.room_size,
        pd.group_id,
        pd.notes,
        pd.updated_at,
        b.booking_id,
        b.check_in_date as booking_check_in,
        b.check_out_date as booking_check_out,
        b.status as booking_status,
        h.name as hotel_name,
        rt.name as room_type_name
      FROM people p
      LEFT JOIN people_details pd ON p.person_id = pd.person_id
      LEFT JOIN bookings b ON p.person_id = b.person_id
      LEFT JOIN room_types rt ON b.room_type_id = rt.room_type_id
      LEFT JOIN hotels h ON rt.hotel_id = h.hotel_id
      ORDER BY p.synced_at DESC NULLS LAST, p.last_name, p.first_name
    `;

    const { rows } = await pool.query(query);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error getting people for accommodation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 