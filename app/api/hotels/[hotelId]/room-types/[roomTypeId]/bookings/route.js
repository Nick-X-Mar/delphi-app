import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { roomTypeId } = await params;

    const query = `
      SELECT 
        b.*,
        p.first_name,
        p.last_name,
        p.email
      FROM bookings b
      INNER JOIN people p ON b.person_id = p.person_id
      WHERE b.room_type_id = $1
      AND b.status NOT IN ('cancelled', 'invalidated')
    `;

    const { rows } = await pool.query(query, [roomTypeId]);

    return NextResponse.json({ bookings: rows });
  } catch (error) {
    console.error('Error fetching room type bookings:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 