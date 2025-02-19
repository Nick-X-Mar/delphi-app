import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET all people with filtering and pagination
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const firstName = searchParams.get('firstName') || '';
    const lastName = searchParams.get('lastName') || '';
    const email = searchParams.get('email') || '';
    const eventId = searchParams.get('eventId') || '';
    const guestType = searchParams.get('guestType') || '';
    const company = searchParams.get('company') || '';
    const offset = (page - 1) * limit;

    // Base query
    let query = `
      SELECT DISTINCT
        p.person_id,
        p.salutation,
        p.first_name,
        p.last_name,
        p.nationality,
        p.mobile_phone,
        p.email,
        p.room_type,
        p.full_name,
        p.companion_email,
        p.checkin_date,
        p.checkout_date,
        p.comments,
        p.app_synced,
        p.app_synced_date,
        p.guest_type,
        p.synced_at,
        pd.company,
        pd.job_title,
        pd.room_size,
        pd.group_id,
        pd.notes,
        pd.will_not_attend,
        pd.updated_at,
        CASE 
          WHEN ep.event_id IS NOT NULL THEN true
          ELSE false
        END as is_in_event
      FROM people p
      LEFT JOIN people_details pd ON p.person_id = pd.person_id
      LEFT JOIN event_people ep ON p.person_id = ep.person_id 
        AND ep.event_id = CASE 
          WHEN $1 = '' OR $1 = 'all' THEN NULL 
          ELSE CAST($1 AS INTEGER) 
        END
    `;

    // Build WHERE clause
    const conditions = [];
    const queryParams = [eventId]; // Start with eventId as first parameter
    let paramCount = 2; // Start from 2 since eventId is $1

    if (firstName) {
      conditions.push(`p.first_name ILIKE $${paramCount}`);
      queryParams.push(`%${firstName}%`);
      paramCount++;
    }

    if (lastName) {
      conditions.push(`p.last_name ILIKE $${paramCount}`);
      queryParams.push(`%${lastName}%`);
      paramCount++;
    }

    if (email) {
      conditions.push(`p.email ILIKE $${paramCount}`);
      queryParams.push(`%${email}%`);
      paramCount++;
    }

    if (guestType && guestType !== 'all') {
      conditions.push(`p.guest_type = $${paramCount}`);
      queryParams.push(guestType);
      paramCount++;
    }

    if (company && company !== 'all') {
      conditions.push(`pd.company = $${paramCount}`);
      queryParams.push(company);
      paramCount++;
    }

    if (eventId && eventId !== 'all') {
      conditions.push(`ep.event_id = CAST($1 AS INTEGER)`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add ORDER BY and pagination
    query += ` ORDER BY pd.updated_at DESC NULLS LAST, p.synced_at DESC NULLS LAST, p.last_name, p.first_name
               LIMIT $${paramCount} 
               OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT p.person_id)
      FROM people p
      LEFT JOIN people_details pd ON p.person_id = pd.person_id
      LEFT JOIN event_people ep ON p.person_id = ep.person_id 
        AND ep.event_id = CASE 
          WHEN $1 = '' OR $1 = 'all' THEN NULL 
          ELSE CAST($1 AS INTEGER) 
        END
    `;

    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    const [{ rows }, { rows: countRows }] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, conditions.length > 0 ? queryParams.slice(0, -2) : [eventId])
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