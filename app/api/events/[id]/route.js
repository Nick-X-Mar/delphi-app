import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET single event
export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const { rows } = await pool.query('SELECT * FROM events WHERE event_id = $1', [id]);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update event
export async function PUT(request, { params }) {
  const { id } = await params;
  try {
    const { name, start_date, end_date, is_active } = await request.json();
    
    // Validate required fields
    if (!name || !start_date || !end_date) {
      return NextResponse.json({
        error: 'Name, start date, and end date are required'
      }, { status: 400 });
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (endDate < startDate) {
      return NextResponse.json({
        error: 'End date must be after start date'
      }, { status: 400 });
    }

    const query = `
      UPDATE events 
      SET 
        name = $1,
        start_date = $2,
        end_date = $3,
        is_active = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE event_id = $5 
      RETURNING *
    `;
    
    const { rows } = await pool.query(query, [
      name,
      start_date,
      end_date,
      is_active !== undefined ? is_active : true,
      id
    ]);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE event
export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const { rows } = await pool.query(
      'DELETE FROM events WHERE event_id = $1 RETURNING *',
      [id]
    );
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 