import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { hotelId } = params;

    const query = `
      SELECT e.*
      FROM events e
      INNER JOIN event_hotels eh ON e.event_id = eh.event_id
      WHERE eh.hotel_id = $1
      ORDER BY e.start_date DESC
      LIMIT 1
    `;

    const { rows } = await pool.query(query, [hotelId]);

    if (rows.length === 0) {
      return NextResponse.json({ message: 'No event found for this hotel' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error getting hotel event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 