import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const personId = params.id;

    const query = `
      SELECT COUNT(*) as active_bookings
      FROM bookings
      WHERE person_id = $1
      AND status NOT IN ('cancelled', 'invalidated')
    `;

    const { rows } = await pool.query(query, [personId]);
    
    return NextResponse.json({ 
      activeBookings: parseInt(rows[0].active_bookings)
    });
  } catch (error) {
    console.error('Error checking active bookings:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 