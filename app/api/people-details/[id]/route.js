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
    // First check if the person exists in the people table
    const personExists = await pool.query(
      'SELECT person_id FROM people WHERE person_id = $1',
      [id]
    );

    if (personExists.rows.length === 0) {
      console.error('Person does not exist in people table:', id);
      return NextResponse.json({ 
        error: 'Person does not exist',
        field: 'person_id'
      }, { status: 404 });
    }

    const { company, job_title, room_size, notes, group_id } = await request.json();
    console.log('Received data:', { company, job_title, room_size, notes, group_id });

    // Validate room_size if provided
    if (room_size !== undefined && room_size !== '' && isNaN(parseInt(room_size))) {
      return NextResponse.json({ 
        error: 'Room size must be a valid number',
        field: 'room_size'
      }, { status: 400 });
    }

    // Check if the person has details
    const checkQuery = 'SELECT person_id FROM people_details WHERE person_id = $1';
    const checkResult = await pool.query(checkQuery, [id]);
    console.log('Check result:', checkResult.rows);
    
    let result;
    try {
      if (checkResult.rows.length === 0) {
        // Record doesn't exist, create new one
        console.log('Creating new record for person:', id);
        const insertQuery = `
          INSERT INTO people_details (
            person_id,
            company,
            job_title,
            room_size,
            notes,
            group_id,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
          RETURNING *
        `;

        result = await pool.query(insertQuery, [
          id,
          company || null,
          job_title || null,
          room_size === '' ? null : room_size,
          notes || null,
          group_id || null
        ]);
        console.log('Insert result:', result.rows[0]);
      } else {
        // Record exists, update it
        console.log('Updating existing record for person:', id);
        const updateQuery = `
          UPDATE people_details 
          SET 
            company = $1,
            job_title = $2,
            room_size = $3,
            notes = $4,
            group_id = $5,
            updated_at = CURRENT_TIMESTAMP
          WHERE person_id = $6
          RETURNING *
        `;

        result = await pool.query(updateQuery, [
          company || null,
          job_title || null,
          room_size === '' ? null : room_size,
          notes || null,
          group_id || null,
          id
        ]);
        console.log('Update result:', result.rows[0]);
      }

      return NextResponse.json(result.rows[0]);
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error updating person details:', error);
    return NextResponse.json({ 
      error: error.message,
      field: error.column || null,
      detail: error.detail || null
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