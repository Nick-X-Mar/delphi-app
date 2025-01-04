import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET all people with filtering and pagination
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // Base query
    let query = `
      SELECT 
        p.person_id,
        p.first_name,
        p.last_name,
        p.email,
        pd.department,
        pd.position,
        pd.checkin_date,
        pd.checkout_date,
        pd.notes
      FROM people p
      LEFT JOIN people_details pd ON p.person_id = pd.person_id
    `;

    // Add search condition if search term exists
    const searchConditions = [];
    const queryParams = [];
    if (search) {
      searchConditions.push(`
        (p.first_name ILIKE $1 
        OR p.last_name ILIKE $1 
        OR p.email ILIKE $1 
        OR CAST(p.person_id AS TEXT) = $2)
      `);
      queryParams.push(`%${search}%`, search);
    }

    // Add WHERE clause if we have search conditions
    if (searchConditions.length > 0) {
      query += ` WHERE ${searchConditions.join(' AND ')}`;
    }

    // Add pagination
    query += ` ORDER BY p.last_name, p.first_name
               LIMIT $${queryParams.length + 1} 
               OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*)
      FROM people p
      ${searchConditions.length > 0 ? `WHERE ${searchConditions.join(' AND ')}` : ''}
    `;

    const [{ rows }, { rows: countRows }] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, searchConditions.length > 0 ? [queryParams[0], queryParams[1]] : [])
    ]);

    return NextResponse.json({
      data: rows,
      pagination: {
        total: parseInt(countRows[0].count),
        page,
        limit
      }
    });
  } catch (error) {
    console.error('Error fetching people:', error);
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