import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET all hotels with filtering and pagination
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const minStars = parseFloat(searchParams.get('minStars') || '0');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) 
      FROM hotels h
      WHERE (LOWER(name) LIKE $1 
      OR LOWER(area) LIKE $1 
      OR CAST(h.hotel_id AS TEXT) LIKE $1)
      AND CAST(stars AS DECIMAL) >= CAST($2 AS DECIMAL)
    `;

    const countResult = await pool.query(countQuery, [`%${search}%`, minStars.toString()]);
    const totalCount = parseInt(countResult.rows[0].count);

    // Get paginated results
    const query = `
      SELECT 
        h.*
      FROM hotels h
      WHERE (LOWER(h.name) LIKE $1 
      OR LOWER(h.area) LIKE $1 
      OR CAST(h.hotel_id AS TEXT) LIKE $1)
      AND CAST(stars AS DECIMAL) >= CAST($2 AS DECIMAL)
      ORDER BY h.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const { rows } = await pool.query(query, [`%${search}%`, minStars.toString(), limit, offset]);

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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
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
    ];

    const { rows } = await pool.query(query, values);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 