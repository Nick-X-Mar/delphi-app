import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT DISTINCT group_id FROM people_details WHERE group_id IS NOT NULL ORDER BY group_id'
    );
    
    return NextResponse.json(result.rows.map(row => row.group_id));
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 