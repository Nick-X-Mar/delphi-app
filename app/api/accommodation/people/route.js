import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const query = `
      SELECT 
        p.*,
        pd.department,
        pd.position,
        pd.start_date,
        pd.end_date,
        pd.notes
      FROM people p
      LEFT JOIN people_details pd ON p.person_id = pd.person_id
      WHERE (pd.end_date IS NULL OR pd.end_date >= CURRENT_DATE)
      ORDER BY p.last_name, p.first_name
    `;

    const { rows } = await pool.query(query);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error getting people for accommodation:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 