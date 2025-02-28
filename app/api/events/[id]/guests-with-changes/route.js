import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');
    const eventId = params.id;

    if (!since) {
      return NextResponse.json(
        { error: 'Missing since parameter' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT DISTINCT b.*, p.first_name, p.last_name, p.email, h.name as hotel_name, rt.name as room_type_name
      FROM bookings b
      JOIN people p ON b.person_id = p.person_id
      JOIN room_types rt ON b.room_type_id = rt.room_type_id
      JOIN hotels h ON rt.hotel_id = h.hotel_id
      WHERE b.event_id = $1
      AND (
        b.updated_at > $2
        OR b.created_at > $2
        OR b.modification_date > $2
      )
      AND b.status IN ('confirmed', 'pending')
      ORDER BY b.updated_at DESC`,
      [eventId, since]
    );

    return NextResponse.json({ guests: result.rows });
  } catch (error) {
    console.error('Error fetching guests with changes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guests with changes' },
      { status: 500 }
    );
  }
} 