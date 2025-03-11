import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const eventId = params.id;
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    if (!company) {
      return NextResponse.json({ error: 'Company parameter is required' }, { status: 400 });
    }

    const query = `
      SELECT b.* 
      FROM bookings b
      INNER JOIN people p ON b.person_id = p.person_id
      WHERE b.event_id = $1 
      AND p.company = $2
      AND b.status NOT IN ('cancelled', 'invalidated')
    `;

    const { rows } = await pool.query(query, [eventId, company]);

    return NextResponse.json({ bookings: rows });
  } catch (error) {
    console.error('Error fetching company bookings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 