import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request, { params }) {
  const client = await pool.connect();
  
  try {
    const eventId = params.id;
    const { company } = await request.json();

    if (!company) {
      return NextResponse.json({ error: 'Company is required' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Update all active bookings for the company to cancelled
    const query = `
      UPDATE bookings b
      SET 
        status = 'cancelled',
        modification_type = 'cancelled',
        modification_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      FROM people p
      WHERE b.person_id = p.person_id
      AND b.event_id = $1
      AND p.company = $2
      AND b.status NOT IN ('cancelled', 'invalidated')
      RETURNING b.*
    `;

    const { rows } = await client.query(query, [eventId, company]);
    await client.query('COMMIT');

    return NextResponse.json({ 
      message: 'Bookings cancelled successfully',
      cancelledCount: rows.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error cancelling company bookings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
} 