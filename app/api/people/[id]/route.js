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

// DELETE person
export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    // First delete from people_details if exists (due to foreign key)
    await pool.query('DELETE FROM people_details WHERE person_id = $1', [id]);
    
    // Then delete from people
    const { rows } = await pool.query('DELETE FROM people WHERE person_id = $1 RETURNING *', [id]);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Person deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 