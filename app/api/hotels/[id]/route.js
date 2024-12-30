import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET single hotel with room types
export async function GET(request, { params }) {
  const id = await params.id;
  
  try {
    // Get hotel
    const hotelQuery = `
      SELECT h.*
      FROM hotels h
      WHERE h.hotel_id = $1
    `;
    
    const { rows: hotelRows } = await pool.query(hotelQuery, [id]);
    
    if (hotelRows.length === 0) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    // Get room types with latest availability
    const roomTypesQuery = `
      SELECT 
        rt.*,
        (
          SELECT json_agg(ra.*)
          FROM (
            SELECT *
            FROM room_availability ra
            WHERE ra.room_type_id = rt.room_type_id
            AND ra.date >= CURRENT_DATE
            ORDER BY ra.date
            LIMIT 10
          ) ra
        ) as availability
      FROM room_types rt
      WHERE rt.hotel_id = $1
      ORDER BY rt.created_at DESC
    `;

    const { rows: roomTypeRows } = await pool.query(roomTypesQuery, [id]);

    // Combine hotel and room types data
    const hotel = {
      ...hotelRows[0],
      room_types: roomTypeRows
    };
    
    return NextResponse.json(hotel);
  } catch (error) {
    console.error('Error getting hotel:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update hotel
export async function PUT(request, { params }) {
  const id = await params.id;
  
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

    // Update hotel
    const updateQuery = `
      UPDATE hotels 
      SET 
        name = $1,
        area = $2,
        stars = $3,
        address = $4,
        phone_number = $5,
        email = $6,
        website_link = $7,
        map_link = $8,
        category = $9,
        contact_name = $10,
        contact_phone = $11,
        contact_mobile = $12,
        contact_email = $13,
        updated_at = CURRENT_TIMESTAMP
      WHERE hotel_id = $14
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
      contact_email,
      id
    ];

    const { rows: hotelRows } = await pool.query(updateQuery, values);

    if (hotelRows.length === 0) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    // Get room types with latest availability
    const roomTypesQuery = `
      SELECT 
        rt.*,
        (
          SELECT json_agg(ra.*)
          FROM (
            SELECT *
            FROM room_availability ra
            WHERE ra.room_type_id = rt.room_type_id
            AND ra.date >= CURRENT_DATE
            ORDER BY ra.date
            LIMIT 10
          ) ra
        ) as availability
      FROM room_types rt
      WHERE rt.hotel_id = $1
      ORDER BY rt.created_at DESC
    `;

    const { rows: roomTypeRows } = await pool.query(roomTypesQuery, [id]);

    // Combine hotel and room types data
    const hotel = {
      ...hotelRows[0],
      room_types: roomTypeRows
    };

    return NextResponse.json(hotel);
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE hotel
export async function DELETE(request, { params }) {
  const id = await params.id;
  
  try {
    // First delete all room types and their availability (cascade)
    await pool.query('DELETE FROM room_types WHERE hotel_id = $1', [id]);
    
    // Then delete the hotel
    const { rows } = await pool.query(
      'DELETE FROM hotels WHERE hotel_id = $1 RETURNING *',
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Hotel deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 