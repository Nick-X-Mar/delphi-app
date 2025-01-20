import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { hotelId, roomTypeId } = params;

    // Query to get event dates through event_room_types
    const result = await pool.query(
      `SELECT DISTINCT e.accommodation_start_date, e.accommodation_end_date
       FROM events e
       JOIN event_room_types ert ON e.event_id = ert.event_id
       WHERE ert.hotel_id = $1
       AND ert.room_type_id = $2
       ORDER BY e.accommodation_start_date DESC
       LIMIT 1`,
      [hotelId, roomTypeId]
    );

    if (result.rows.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'No event found for this room type' }),
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching event dates:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch event dates' }),
      { status: 500 }
    );
  }
} 