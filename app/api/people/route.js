import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET all people with filtering and pagination
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) 
      FROM people p
      WHERE LOWER(first_name) LIKE $1 
      OR LOWER(last_name) LIKE $1 
      OR LOWER(email) LIKE $1 
      OR CAST(p.person_id AS TEXT) LIKE $1
    `;

    const countResult = await pool.query(countQuery, [`%${search}%`]);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get paginated results with joined details
    const query = `
      SELECT 
        p.person_id,
        p.first_name,
        p.last_name,
        p.email,
        pd.department,
        pd.position,
        pd.start_date,
        pd.notes,
        pd.updated_at
      FROM people p
      LEFT JOIN people_details pd ON p.person_id = pd.person_id
      WHERE LOWER(first_name) LIKE $1 
      OR LOWER(last_name) LIKE $1 
      OR LOWER(email) LIKE $1 
      OR CAST(p.person_id AS TEXT) LIKE $1
      ORDER BY pd.updated_at DESC NULLS LAST, p.person_id DESC
      LIMIT $2 OFFSET $3
    `;

    const { rows } = await pool.query(query, [`%${search}%`, limit, offset]);

    return NextResponse.json({
      data: rows,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create new person
export async function POST(request) {
  try {
    const { first_name, last_name, email } = await request.json();
    
    // Validate required fields
    if (!first_name || !last_name || !email) {
      return NextResponse.json({ 
        error: 'First name, last name, and email are required' 
      }, { status: 400 });
    }

    const query = `
      INSERT INTO people (first_name, last_name, email) 
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const { rows } = await pool.query(query, [first_name, last_name, email]);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 