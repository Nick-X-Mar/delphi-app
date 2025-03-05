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
        p.companion_full_name,
        p.companion_email,
        p.checkin_date,
        p.checkout_date,
        p.comments,
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
    const person = await request.json();
    console.log(`[Create] Processing new person with data:`, person);

    // Validate required fields
    if (!person.person_id || !person.first_name || !person.last_name || !person.email) {
      console.error('[Create] Validation error: Missing required fields');
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields (person_id, first_name, last_name, email)' 
      }, { status: 400 });
    }

    // Insert into people table
    const insertQuery = `
      INSERT INTO people (
        person_id,
        salutation,
        first_name,
        last_name,
        nationality,
        mobile_phone,
        email,
        room_type,
        companion_full_name,
        companion_email,
        checkin_date,
        checkout_date,
        comments,
        guest_type,
        app_synced
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING person_id
    `;

    const values = [
      person.person_id,
      person.salutation,
      person.first_name,
      person.last_name,
      person.nationality,
      person.mobile_phone,
      person.email,
      person.room_type,
      person.full_name, // This seems to be used for companion_full_name
      person.companion_email,
      person.checkin_date,
      person.checkout_date,
      person.comments,
      person.guest_type,
      person.app_synced || false
    ];

    const { rows } = await pool.query(insertQuery, values);
    
    // Assign to event 1 by default
    const assignToEventQuery = `
      INSERT INTO event_people (event_id, person_id)
      VALUES (1, $1)
    `;
    await pool.query(assignToEventQuery, [rows[0].person_id]);

    return NextResponse.json({ 
      success: true, 
      error: null 
    }, { status: 201 });

  } catch (error) {
    console.error('[Create] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
} 