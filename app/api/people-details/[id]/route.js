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
    const { company, job_title, room_size, checkin_date, checkout_date, notes, group_id } = await request.json();

    // Validate room_size if provided
    if (room_size !== undefined && room_size !== '' && isNaN(parseInt(room_size))) {
      return NextResponse.json({ 
        error: 'Room size must be a valid number',
        field: 'room_size'
      }, { status: 400 });
    }

    const query = `
      UPDATE people_details 
      SET 
        company = $1,
        job_title = $2,
        room_size = $3,
        checkin_date = $4,
        checkout_date = $5,
        notes = $6,
        group_id = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE person_id = $8
      RETURNING *
    `;

    const values = [
      company,
      job_title,
      room_size === '' ? null : room_size, // Convert empty string to null
      checkin_date || null,
      checkout_date || null,
      notes,
      group_id,
      id
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
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