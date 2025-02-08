import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Query to get distinct guest types
    const query = `
      SELECT DISTINCT guest_type 
      FROM people 
      WHERE guest_type IS NOT NULL 
      ORDER BY guest_type
    `;

    const { rows } = await pool.query(query);
    
    // Transform the result to a simple array of guest types
    const categories = rows.map(row => row.guest_type);

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching guest types:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 