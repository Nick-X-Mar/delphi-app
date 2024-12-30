import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET active event
export async function GET() {
  try {
    const query = `
      SELECT *
      FROM events
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const { rows } = await pool.query(query);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'No active event found' }, { status: 404 });
    }
    
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 