import pool from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const query = `
      SELECT DISTINCT company as value, company as label
      FROM people_details
      WHERE company IS NOT NULL AND company != ''
      ORDER BY company
    `;
    
    const { rows } = await pool.query(query);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
} 