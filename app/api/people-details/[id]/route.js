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
  const client = await pool.connect();
  
  try {
    const personId = await params.id;
    const data = await request.json();
    
    await client.query('BEGIN');

    // Update people_details
    const updateQuery = `
      INSERT INTO people_details (
        person_id, company, job_title, room_size, 
        group_id, notes, will_not_attend, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (person_id) 
      DO UPDATE SET 
        company = EXCLUDED.company,
        job_title = EXCLUDED.job_title,
        room_size = EXCLUDED.room_size,
        group_id = EXCLUDED.group_id,
        notes = EXCLUDED.notes,
        will_not_attend = EXCLUDED.will_not_attend,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      personId,
      data.company,
      data.job_title,
      data.room_size,
      data.group_id,
      data.notes,
      data.will_not_attend
    ];

    const { rows } = await client.query(updateQuery, values);

    // If will_not_attend is true, cancel all active bookings
    if (data.will_not_attend) {
      const updateBookingsQuery = `
        UPDATE bookings
        SET 
          status = 'cancelled',
          modification_type = 'cancelled',
          modification_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE person_id = $1
        AND status NOT IN ('cancelled', 'invalidated')
      `;

      await client.query(updateBookingsQuery, [personId]);
    }

    await client.query('COMMIT');
    return NextResponse.json(rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating person details:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
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