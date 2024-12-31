import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET active event
export async function GET() {
  try {
    const query = `
      SELECT *
      FROM events
      WHERE is_active = true
      AND end_date >= CURRENT_DATE
      ORDER BY start_date ASC
      LIMIT 1
    `;

    const { rows } = await pool.query(query);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No active event found' }, { status: 404 });
    }
    
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error getting active event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 