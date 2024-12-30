import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET single room type
export async function GET(request, { params }) {
  const hotelId = await params.id;
  const roomId = await params.roomId;
  
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
      WHERE rt.hotel_id = $1 AND rt.room_type_id = $2
    `;

    const { rows } = await pool.query(query, [hotelId, roomId]);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Room type not found' }, { status: 404 });
    }
    
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error getting room type:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update room type
export async function PUT(request, { params }) {
  const hotelId = await params.id;
  const roomId = await params.roomId;
  
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

      // Update room type
      const roomTypeQuery = `
        UPDATE room_types
        SET 
          name = $1,
          description = $2,
          total_rooms = $3,
          base_price_per_night = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE hotel_id = $5 AND room_type_id = $6
        RETURNING *
      `;

      const { rows: [roomType] } = await client.query(roomTypeQuery, [
        name,
        description,
        total_rooms,
        base_price_per_night,
        hotelId,
        roomId
      ]);

      if (!roomType) {
        throw new Error('Room type not found');
      }

      // Update availability records if total_rooms changed
      const availabilityQuery = `
        UPDATE room_availability
        SET available_rooms = LEAST(available_rooms, $1)
        WHERE room_type_id = $2
        AND date >= CURRENT_DATE
      `;

      await client.query(availabilityQuery, [total_rooms, roomId]);

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

      const { rows: [result] } = await pool.query(getQuery, [roomId]);
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
  const hotelId = await params.id;
  const roomId = await params.roomId;
  
  try {
    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete availability records first
      await client.query(
        'DELETE FROM room_availability WHERE room_type_id = $1',
        [roomId]
      );

      // Then delete the room type
      const { rows } = await client.query(
        'DELETE FROM room_types WHERE hotel_id = $1 AND room_type_id = $2 RETURNING *',
        [hotelId, roomId]
      );

      if (rows.length === 0) {
        throw new Error('Room type not found');
      }

      await client.query('COMMIT');
      return NextResponse.json({ message: 'Room type deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 