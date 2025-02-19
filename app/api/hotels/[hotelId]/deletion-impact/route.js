import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { hotelId } = await params;

    const query = `
      SELECT 
        (
          SELECT COUNT(*)
          FROM room_types
          WHERE hotel_id = $1
        ) as room_types_count,
        (
          SELECT COUNT(*)
          FROM bookings b
          INNER JOIN room_types rt ON b.room_type_id = rt.room_type_id
          WHERE rt.hotel_id = $1
        ) as bookings_count
    `;

    const { rows } = await pool.query(query, [hotelId]);
    
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error getting deletion impact:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 