import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET single person's details
export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const result = await pool.query(
      'SELECT * FROM people_details WHERE person_id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching person details:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT/Update details
export async function PUT(request, { params }) {
  const { id } = await params;
  try {
    const { company, job_title, room_size, notes, group_id, category } = await request.json();

    // Validate room_size if provided
    if (room_size !== undefined && room_size !== '' && isNaN(parseInt(room_size))) {
      return NextResponse.json({ 
        error: 'Room size must be a valid number',
        field: 'room_size'
      }, { status: 400 });
    }

    // Validate category if provided
    const validCategories = ['VVIP', 'VIP', 'Regular', 'Other'];
    if (category && !validCategories.includes(category)) {
      return NextResponse.json({ 
        error: 'Invalid category. Must be one of: VVIP, VIP, Regular, Other',
        field: 'category'
      }, { status: 400 });
    }

    // First try to update
    const updateQuery = `
      UPDATE people_details 
      SET 
        company = $1,
        job_title = $2,
        room_size = $3,
        notes = $4,
        group_id = $5,
        category = COALESCE($6, 'Regular'),
        updated_at = CURRENT_TIMESTAMP
      WHERE person_id = $7
      RETURNING *
    `;

    const values = [
      company,
      job_title,
      room_size === '' ? null : room_size,
      notes,
      group_id,
      category || 'Regular',
      id
    ];

    let result = await pool.query(updateQuery, values);

    // If no row was updated, try to insert
    if (result.rows.length === 0) {
      const insertQuery = `
        INSERT INTO people_details (
          person_id,
          company,
          job_title,
          room_size,
          notes,
          group_id,
          category,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      result = await pool.query(insertQuery, [
        id,
        company,
        job_title,
        room_size === '' ? null : room_size,
        notes,
        group_id,
        category || 'Regular'
      ]);
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating person details:', error);
    return NextResponse.json({ 
      error: error.message,
      field: error.column || null
    }, { status: 500 });
  }
}

// DELETE details
export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const { rows } = await pool.query('DELETE FROM people_details WHERE person_id = $1 RETURNING *', [id]);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Details not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Details deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 