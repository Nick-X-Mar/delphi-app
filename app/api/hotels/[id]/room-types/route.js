import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET room types for a hotel
export async function GET(request, { params }) {
  const id = await params.id;
  
  try {
    const query = `
      SELECT 
        rt.*,
        (
          SELECT json_agg(ra.*)
          FROM (
            SELECT *
            FROM room_availability ra
            WHERE ra.room_type_id = rt.room_type_id
            AND ra.date >= CURRENT_DATE
            ORDER BY ra.date
            LIMIT 10
          ) ra
        ) as availability
      FROM room_types rt
      WHERE rt.hotel_id = $1
      ORDER BY rt.created_at DESC
    `;

    const { rows } = await pool.query(query, [id]);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error getting room types:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create new room type
export async function POST(request, { params }) {
  const id = await params.id;
  
  try {
    const {
      name,
      description,
      total_rooms,
      base_price_per_night
    } = await request.json();

    // Validate required fields
    if (!name || !total_rooms || !base_price_per_night) {
      return NextResponse.json({
        error: 'Name, total rooms, and base price are required'
      }, { status: 400 });
    }

    // Validate numeric fields
    if (parseInt(total_rooms) <= 0) {
      return NextResponse.json({
        error: 'Total rooms must be greater than 0'
      }, { status: 400 });
    }

    if (parseFloat(base_price_per_night) <= 0) {
      return NextResponse.json({
        error: 'Base price per night must be greater than 0'
      }, { status: 400 });
    }

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create room type
      const roomTypeQuery = `
        INSERT INTO room_types (
          hotel_id,
          name,
          description,
          total_rooms,
          base_price_per_night
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const { rows: [roomType] } = await client.query(roomTypeQuery, [
        id,
        name,
        description,
        total_rooms,
        base_price_per_night
      ]);

      // Initialize availability for the next 365 days
      const availabilityQuery = `
        INSERT INTO room_availability (
          room_type_id,
          date,
          available_rooms,
          price_per_night
        )
        SELECT
          $1 as room_type_id,
          generate_series(
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '365 days',
            INTERVAL '1 day'
          )::date as date,
          $2 as available_rooms,
          $3 as price_per_night
      `;

      await client.query(availabilityQuery, [
        roomType.room_type_id,
        total_rooms,
        base_price_per_night
      ]);

      await client.query('COMMIT');

      // Get the created room type with availability
      const getQuery = `
        SELECT 
          rt.*,
          (
            SELECT json_agg(ra.*)
            FROM (
              SELECT *
              FROM room_availability ra
              WHERE ra.room_type_id = rt.room_type_id
              AND ra.date >= CURRENT_DATE
              ORDER BY ra.date
              LIMIT 10
            ) ra
          ) as availability
        FROM room_types rt
        WHERE rt.room_type_id = $1
      `;

      const { rows: [result] } = await pool.query(getQuery, [roomType.room_type_id]);
      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 