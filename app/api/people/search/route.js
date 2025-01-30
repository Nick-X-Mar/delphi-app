import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('q') || '';

    if (searchTerm.length < 2) {
      return NextResponse.json([]);
    }

    const query = `
      SELECT 
        p.person_id,
        p.first_name,
        p.last_name,
        p.email,
        pd.group_id
      FROM people p
      LEFT JOIN people_details pd ON p.person_id = pd.person_id
      WHERE 
        p.first_name ILIKE $1 
        OR p.last_name ILIKE $1 
        OR p.email ILIKE $1
      ORDER BY p.last_name, p.first_name
      LIMIT 10
    `;

    const { rows } = await pool.query(query, [`%${searchTerm}%`]);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error searching people:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 