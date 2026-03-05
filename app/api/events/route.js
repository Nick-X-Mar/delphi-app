import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

// GET all events
export async function GET() {
  try {
    const query = `
      SELECT *
      FROM events
      ORDER BY created_at DESC
    `;

    const { rows } = await pool.query(query);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create new event
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Only admin users can create events' }, { status: 401 });
    }

    const { name, start_date, end_date, tag, preparation_start_date, preparation_end_date } = await request.json();
    
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
      INSERT INTO events (
        name,
        start_date,
        end_date,
        tag,
        preparation_start_date,
        preparation_end_date
      ) 
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const { rows } = await pool.query(query, [
      name,
      startDate.toISOString(),
      endDate.toISOString(),
      tag || null,
      prepStartDate ? prepStartDate.toISOString() : null,
      prepEndDate ? prepEndDate.toISOString() : null
    ]);

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 