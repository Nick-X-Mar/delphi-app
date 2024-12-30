import { NextResponse } from 'next/server';
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
    const { name, start_date, end_date } = await request.json();
    
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
      INSERT INTO events (
        name,
        start_date,
        end_date
      ) 
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const { rows } = await pool.query(query, [
      name,
      start_date,
      end_date
    ]);

    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error('Create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 