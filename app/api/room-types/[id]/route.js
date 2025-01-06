import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET single room type with availability
export async function GET(request, { params }) {
  const { id } = await params;
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
      WHERE rt.room_type_id = $1
    `;

    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Room type not found' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error getting room type:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update room type and availability
export async function PUT(request, { params }) {
  const { id } = await params;
  try {
    const { name, description, total_rooms, availability } = await request.json();

    // Validate required fields
    if (!name || !total_rooms || !availability || !Array.isArray(availability)) {
      return NextResponse.json({
        error: 'Name, total rooms, and availability array are required'
      }, { status: 400 });
    }

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update room type
      const roomTypeQuery = `
        UPDATE room_types 
        SET 
          name = $1,
          description = $2,
          total_rooms = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE room_type_id = $4
        RETURNING *
      `;

      const { rows: [roomType] } = await client.query(roomTypeQuery, [
        name,
        description,
        total_rooms,
        id
      ]);

      if (!roomType) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Room type not found' }, { status: 404 });
      }

      // Update or insert availability records
      const upsertAvailabilityQuery = `
        INSERT INTO room_availability (
          room_type_id,
          date,
          available_rooms,
          price_per_night
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (room_type_id, date) 
        DO UPDATE SET
          available_rooms = $3,
          price_per_night = $4,
          updated_at = CURRENT_TIMESTAMP
      `;

      for (const avail of availability) {
        await client.query(upsertAvailabilityQuery, [
          id,
          avail.date,
          Math.min(avail.available_rooms || total_rooms, total_rooms),
          avail.price_per_night
        ]);
      }

      await client.query('COMMIT');

      // Get the updated room type with availability
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

      const { rows: [result] } = await pool.query(getQuery, [id]);
      return NextResponse.json(result);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE room type
export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    // Room availability will be deleted automatically due to CASCADE
    const { rows } = await pool.query(
      'DELETE FROM room_types WHERE room_type_id = $1 RETURNING *',
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Room type not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Room type deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 