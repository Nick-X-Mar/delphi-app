import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET single person
export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const { rows } = await pool.query('SELECT * FROM people WHERE person_id = $1', [id]);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }
    
    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update person
export async function PUT(request, { params }) {
  const { id } = await params;
  try {
    const { first_name, last_name, email } = await request.json();
    
    // Validate required fields
    if (!first_name || !last_name || !email) {
      return NextResponse.json({ 
        error: 'First name, last name, and email are required' 
      }, { status: 400 });
    }

    const query = `
      UPDATE people 
      SET first_name = $1, last_name = $2, email = $3 
      WHERE person_id = $4 
      RETURNING *
    `;
    
    const { rows } = await pool.query(query, [first_name, last_name, email, id]);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }
    
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE person (only App-sourced people)
export async function DELETE(request, { params }) {
  const { id } = await params;
  const client = await pool.connect();
  try {
    // Verify the person exists and is App-sourced
    const personResult = await client.query(
      'SELECT person_id, source FROM people WHERE person_id = $1',
      [id]
    );

    if (personResult.rows.length === 0) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    if (personResult.rows[0].source !== 'App') {
      return NextResponse.json(
        { error: 'Only App-created people can be deleted' },
        { status: 403 }
      );
    }

    await client.query('BEGIN');

    // Delete email notifications referencing this person
    await client.query('DELETE FROM email_notifications WHERE guest_id = $1', [id]);

    // Delete bookings (this automatically frees room availability since
    // availability is calculated dynamically by subtracting active bookings)
    await client.query('DELETE FROM bookings WHERE person_id = $1', [id]);

    // Delete from people_details and event_people before people
    await client.query('DELETE FROM people_details WHERE person_id = $1', [id]);
    await client.query('DELETE FROM event_people WHERE person_id = $1', [id]);

    await client.query('DELETE FROM people WHERE person_id = $1', [id]);

    await client.query('COMMIT');

    return NextResponse.json({ message: 'Person and associated bookings deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
} 