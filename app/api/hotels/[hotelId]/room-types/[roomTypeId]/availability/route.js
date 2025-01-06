import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET availability for a room type
export async function GET(request, { params }) {
  try {
    const { hotelId, roomTypeId } = await params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    const query = `
      SELECT *
      FROM room_availability
      WHERE room_type_id = $1
      AND date >= $2
      AND date <= $3
      ORDER BY date
    `;

    const { rows } = await pool.query(query, [roomTypeId, startDate, endDate]);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error getting availability:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update availability for a specific date
export async function PUT(request, { params: { id, roomId } }) {
  try {
    const { date, available_rooms, price_per_night } = await request.json();

    // Validate required fields
    if (!date || available_rooms === undefined || !price_per_night) {
      return NextResponse.json({
        error: 'Date, available rooms, and price are required'
      }, { status: 400 });
    }

    // Validate room type exists and belongs to hotel
    const roomTypeQuery = `
      SELECT total_rooms
      FROM room_types
      WHERE hotel_id = $1 AND room_type_id = $2
    `;

    const { rows: roomTypes } = await pool.query(roomTypeQuery, [id, roomId]);

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

    // Update or insert availability
    const query = `
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
        price_per_night = $4
      RETURNING *
    `;

    const { rows } = await pool.query(query, [
      roomId,
      date,
      available_rooms,
      price_per_night
    ]);

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 