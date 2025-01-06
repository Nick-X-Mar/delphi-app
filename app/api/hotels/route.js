import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET all hotels with filtering and pagination
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const eventId = searchParams.get('eventId');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 6;
    const offset = (page - 1) * limit;
    const minStars = parseFloat(searchParams.get('minStars')) || 0;
    const category = searchParams.get('category') || '';

    // Debug: Check if event exists and has any hotels
    if (eventId) {
      const checkQuery = `
        SELECT COUNT(*) as count 
        FROM event_hotels 
        WHERE event_id = $1
      `;
      const checkResult = await pool.query(checkQuery, [eventId]);
      console.log('Debug - Event hotels count:', checkResult.rows[0].count);

      // If no associations exist, let's create them for testing
      if (checkResult.rows[0].count === 0) {
        console.log('Debug - No hotels associated with event, creating associations...');
        
        // First verify the event exists
        const eventExists = await pool.query('SELECT event_id FROM events WHERE event_id = $1', [eventId]);
        if (eventExists.rows.length === 0) {
          return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        // Get all hotels and create associations
        const allHotelsQuery = 'SELECT hotel_id FROM hotels';
        const { rows: hotelRows } = await pool.query(allHotelsQuery);
        console.log('Debug - Found hotels:', hotelRows);
        
        if (hotelRows.length > 0) {
          // Use parameterized query for safety
          const insertQuery = `
            INSERT INTO event_hotels (event_id, hotel_id)
            SELECT $1, h.hotel_id
            FROM unnest($2::int[]) AS h(hotel_id)
            ON CONFLICT DO NOTHING
          `;
          const hotelIds = hotelRows.map(h => h.hotel_id);
          await pool.query(insertQuery, [eventId, hotelIds]);
          console.log('Debug - Created associations for hotels:', hotelIds);
        }
      }
    }

    // First, get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM hotels h
    `;

    const params = [];
    let paramIndex = 1;

    if (eventId) {
      countQuery = `
        SELECT COUNT(*) as total
        FROM hotels h
        INNER JOIN event_hotels eh ON h.hotel_id = eh.hotel_id
        WHERE eh.event_id = $${paramIndex++}
        AND h.stars >= $${paramIndex++}
      `;
      params.push(eventId, minStars);

      if (category) {
        countQuery += ` AND h.category = $${paramIndex++}`;
        params.push(category);
      }

      if (search) {
        countQuery += `
          AND (
            LOWER(h.name) LIKE LOWER($${paramIndex++}) OR
            LOWER(h.area) LIKE LOWER($${paramIndex++}) OR
            LOWER(h.address) LIKE LOWER($${paramIndex++})
          )
        `;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }
    } else {
      countQuery += ` WHERE h.stars >= $${paramIndex++}`;
      params.push(minStars);

      if (category) {
        countQuery += ` AND h.category = $${paramIndex++}`;
        params.push(category);
      }

      if (search) {
        countQuery += `
          AND (
            LOWER(h.name) LIKE LOWER($${paramIndex++}) OR
            LOWER(h.area) LIKE LOWER($${paramIndex++}) OR
            LOWER(h.address) LIKE LOWER($${paramIndex++})
          )
        `;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }
    }

    const countResult = await pool.query(countQuery, params);
    const totalItems = parseInt(countResult.rows[0].total);

    // Then, get paginated results
    let query = `
      SELECT h.*
      FROM hotels h
    `;

    paramIndex = 1;
    params.length = 0;

    if (eventId) {
      query = `
        SELECT h.*
        FROM hotels h
        INNER JOIN event_hotels eh ON h.hotel_id = eh.hotel_id
        WHERE eh.event_id = $${paramIndex++}
        AND h.stars >= $${paramIndex++}
      `;
      params.push(eventId, minStars);

      if (category) {
        query += ` AND h.category = $${paramIndex++}`;
        params.push(category);
      }

      if (search) {
        query += `
          AND (
            LOWER(h.name) LIKE LOWER($${paramIndex++}) OR
            LOWER(h.area) LIKE LOWER($${paramIndex++}) OR
            LOWER(h.address) LIKE LOWER($${paramIndex++})
          )
        `;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }
    } else {
      query += ` WHERE h.stars >= $${paramIndex++}`;
      params.push(minStars);

      if (category) {
        query += ` AND h.category = $${paramIndex++}`;
        params.push(category);
      }

      if (search) {
        query += `
          AND (
            LOWER(h.name) LIKE LOWER($${paramIndex++}) OR
            LOWER(h.area) LIKE LOWER($${paramIndex++}) OR
            LOWER(h.address) LIKE LOWER($${paramIndex++})
          )
        `;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }
    }

    query += ` ORDER BY h.category DESC, h.stars DESC, h.name
               LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    console.log('Debug - Final query:', query);
    console.log('Debug - Query params:', params);

    const { rows } = await pool.query(query, params);
    console.log('Debug - Query returned', rows.length, 'hotels');
    
    return NextResponse.json({
      items: rows,
      total: totalItems,
      page,
      limit
    });
  } catch (error) {
    console.error('Error getting hotels:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create new hotel
export async function POST(request) {
  try {
    const {
      name,
      area,
      stars,
      address,
      phone_number,
      email,
      website_link,
      map_link,
      category,
      contact_name,
      contact_phone,
      contact_mobile,
      contact_email
    } = await request.json();

    // Validate required fields
    if (!name || !area || !stars || !category) {
      return NextResponse.json({
        error: 'Name, area, stars, and category are required'
      }, { status: 400 });
    }

    // Convert stars to numeric and validate range
    const starsNumeric = Number(stars);
    if (isNaN(starsNumeric) || starsNumeric < 0.5 || starsNumeric > 5.0) {
      return NextResponse.json({
        error: 'Stars must be between 0.5 and 5.0'
      }, { status: 400 });
    }

    // Validate category
    if (!['VIP', 'Very Good', 'Good'].includes(category)) {
      return NextResponse.json({
        error: 'Category must be one of: VIP, Very Good, Good'
      }, { status: 400 });
    }

    const query = `
      INSERT INTO hotels (
        name,
        area,
        stars,
        address,
        phone_number,
        email,
        website_link,
        map_link,
        category,
        contact_name,
        contact_phone,
        contact_mobile,
        contact_email
      ) 
      VALUES ($1, $2, $3::numeric(2,1), $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      name,
      area,
      stars.toString(),
      address,
      phone_number,
      email,
      website_link,
      map_link,
      category,
      contact_name,
      contact_phone,
      contact_mobile,
      contact_email
    ];

    const { rows } = await pool.query(query, values);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 