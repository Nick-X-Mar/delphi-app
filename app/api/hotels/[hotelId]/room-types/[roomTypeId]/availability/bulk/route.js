import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// PUT bulk update availability
export async function PUT(request, { params }) {
  const hotelId = await params.id;
  const roomId = await params.roomId;
  
  try {
    const {
      start_date,
      end_date,
      available_rooms,
      price_per_night
    } = await request.json();

    // Validate required fields
    if (!start_date || !end_date || available_rooms === undefined || !price_per_night) {
      return NextResponse.json({
        error: 'Start date, end date, available rooms, and price are required'
      }, { status: 400 });
    }

    // Validate room type exists and belongs to hotel
    const roomTypeQuery = `
      SELECT total_rooms
      FROM room_types
      WHERE hotel_id = $1 AND room_type_id = $2
    `;

    const { rows: roomTypes } = await pool.query(roomTypeQuery, [hotelId, roomId]);

    if (roomTypes.length === 0) {
      return NextResponse.json({ error: 'Room type not found' }, { status: 404 });
    }

    const totalRooms = roomTypes[0].total_rooms;

    // Validate available rooms
    if (available_rooms < 0 || available_rooms > totalRooms) {
      return NextResponse.json({
        error: `Available rooms must be between 0 and ${totalRooms}`
      }, { status: 400 });
    }

    // Validate price
    if (price_per_night < 0) {
      return NextResponse.json({
        error: 'Price must be greater than or equal to 0'
      }, { status: 400 });
    }

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update or insert availability for date range
      const query = `
        INSERT INTO room_availability (
          room_type_id,
          date,
          available_rooms,
          price_per_night
        )
        SELECT
          $1 as room_type_id,
          d::date as date,
          $4 as available_rooms,
          $5 as price_per_night
        FROM generate_series($2::date, $3::date, '1 day'::interval) d
        ON CONFLICT (room_type_id, date)
        DO UPDATE SET
          available_rooms = $4,
          price_per_night = $5
        RETURNING *
      `;

      const { rows } = await client.query(query, [
        roomId,
        start_date,
        end_date,
        available_rooms,
        price_per_night
      ]);

      await client.query('COMMIT');
      return NextResponse.json({
        message: 'Bulk update completed successfully',
        updated_records: rows.length
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Bulk update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 