import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// PUT update booking
export async function PUT(request, { params }) {
  try {
    const bookingId = await params.id;
    const { roomTypeId, checkInDate, checkOutDate, totalCost } = await request.json();

    // Validate required fields
    if (!roomTypeId || !checkInDate || !checkOutDate || !totalCost) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update the booking
    const query = `
      UPDATE bookings
      SET 
        room_type_id = $1,
        check_in_date = $2,
        check_out_date = $3,
        total_cost = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE booking_id = $5
      RETURNING *
    `;

    const { rows } = await pool.query(query, [
      roomTypeId,
      checkInDate,
      checkOutDate,
      totalCost,
      bookingId
    ]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE booking
export async function DELETE(request, { params }) {
  try {
    const bookingId = await params.id;
    
    const query = `
      DELETE FROM bookings
      WHERE booking_id = $1
      RETURNING *
    `;

    const { rows } = await pool.query(query, [bookingId]);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 