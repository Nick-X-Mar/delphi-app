import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET single person's details
export async function GET(request, { params }) {
  const { id } = params;
  try {
    const { rows } = await pool.query(`
      SELECT 
        pd.*,
        p.first_name,
        p.last_name,
        p.email
      FROM people_details pd
      LEFT JOIN people p ON p.person_id = pd.person_id
      WHERE pd.person_id = $1
    `, [id]);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Details not found' }, { status: 404 });
    }
    
    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT/Update details
export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const { department, position, start_date, notes } = await request.json();
    
    const query = `
      INSERT INTO people_details (
        person_id,
        department,
        position,
        start_date,
        notes
      ) 
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (person_id) 
      DO UPDATE SET 
        department = $2,
        position = $3,
        start_date = $4,
        notes = $5,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const { rows } = await pool.query(query, [
      id,
      department,
      position,
      start_date,
      notes
    ]);
    
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE details
export async function DELETE(request, { params }) {
  const { id } = params;
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