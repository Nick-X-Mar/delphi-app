import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Only admin users can update events' }, { status: 401 });
    }

    const { name, start_date, end_date, is_active, tag, preparation_start_date, preparation_end_date } = await request.json();
    
    // Validate required fields
    if (!name || !start_date || !end_date) {
      return NextResponse.json({
        error: 'Name, start date, and end date are required'
      }, { status: 400 });
    }

    // Parse dates and set to noon UTC
    const startDate = new Date(start_date);
    startDate.setUTCHours(12, 0, 0, 0);
    const endDate = new Date(end_date);
    endDate.setUTCHours(12, 0, 0, 0);

    if (endDate < startDate) {
      return NextResponse.json({
        error: 'End date must be after start date'
      }, { status: 400 });
    }

    let prepStartDate = null;
    let prepEndDate = null;
    if (preparation_start_date) {
      prepStartDate = new Date(preparation_start_date);
      prepStartDate.setUTCHours(12, 0, 0, 0);
    }
    if (preparation_end_date) {
      prepEndDate = new Date(preparation_end_date);
      prepEndDate.setUTCHours(12, 0, 0, 0);
    }

    const query = `
      UPDATE events 
      SET 
        name = $1,
        start_date = $2,
        end_date = $3,
        is_active = $4,
        tag = $5,
        preparation_start_date = $6,
        preparation_end_date = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE event_id = $8 
      RETURNING *
    `;
    
    const { rows } = await pool.query(query, [
      name,
      startDate.toISOString(),
      endDate.toISOString(),
      is_active !== undefined ? is_active : true,
      tag !== undefined ? tag : null,
      prepStartDate ? prepStartDate.toISOString() : null,
      prepEndDate ? prepEndDate.toISOString() : null,
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
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Only admin users can delete events' }, { status: 401 });
    }

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