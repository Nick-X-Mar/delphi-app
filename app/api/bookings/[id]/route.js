import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// PUT update booking
export async function PUT(request, { params }) {
  try {
    const bookingId = await params.id;
    const body = await request.json();

    // If only status is being updated (e.g., cancellation)
    if (Object.keys(body).length === 1 && body.status !== undefined) {
      const query = `
        UPDATE bookings
        SET 
          status = $1,
          modification_type = CASE 
            WHEN $1 = 'cancelled' THEN 'cancelled'::varchar
            ELSE NULL
          END,
          modification_date = CASE 
            WHEN $1 = 'cancelled' THEN CURRENT_TIMESTAMP
            ELSE NULL
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = $2
        RETURNING *
      `;

      const { rows } = await pool.query(query, [
        body.status,
        bookingId
      ]);

      if (rows.length === 0) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(rows[0]);
    }

    // For full booking updates
    const { roomTypeId, checkInDate, checkOutDate, totalCost, originalBooking } = body;

    // Validate required fields for full update
    if (!roomTypeId || !checkInDate || !checkOutDate || !totalCost || !originalBooking) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if hotel has changed by comparing room types
      const hotelCheckQuery = `
        SELECT hotel_id FROM room_types WHERE room_type_id = $1
      `;
      const originalHotelResult = await client.query(hotelCheckQuery, [originalBooking.roomTypeId]);
      const newHotelResult = await client.query(hotelCheckQuery, [roomTypeId]);

      const hotelChanged = originalHotelResult.rows[0].hotel_id !== newHotelResult.rows[0].hotel_id;

      if (hotelChanged) {
        // Cancel the original booking
        await client.query(`
          UPDATE bookings
          SET 
            status = 'cancelled',
            modification_type = 'cancelled',
            modification_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE booking_id = $1
        `, [bookingId]);

        // Create a new booking with the original status
        const newBookingQuery = `
          INSERT INTO bookings (
            room_type_id, check_in_date, check_out_date, 
            total_cost, status, person_id, event_id
          )
          SELECT 
            $1, $2, $3, $4, 'pending'::varchar,
            person_id, event_id
          FROM bookings
          WHERE booking_id = $5
          RETURNING *
        `;

        const { rows: newBookingRows } = await client.query(newBookingQuery, [
          roomTypeId,
          checkInDate,
          checkOutDate,
          totalCost,
          bookingId
        ]);

        await client.query('COMMIT');
        return NextResponse.json({ 
          message: 'Hotel changed - Original booking cancelled and new booking created',
          newBooking: newBookingRows[0]
        });
      }

      // Determine what has changed
      const datesChanged = 
        originalBooking.checkInDate !== checkInDate || 
        originalBooking.checkOutDate !== checkOutDate;
      
      const roomChanged = originalBooking.roomTypeId !== roomTypeId;

      // Set appropriate modification type
      let modificationType = null;
      if (datesChanged) modificationType = 'date_change';
      if (roomChanged) modificationType = 'room_change';

      // Update the booking
      const updateQuery = `
        UPDATE bookings
        SET 
          room_type_id = $1,
          check_in_date = $2,
          check_out_date = $3,
          total_cost = $4,
          modification_type = $5::varchar,
          modification_date = CASE 
            WHEN $5 IS NOT NULL THEN CURRENT_TIMESTAMP
            ELSE NULL
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = $6
        RETURNING *
      `;

      const { rows } = await client.query(updateQuery, [
        roomTypeId,
        checkInDate,
        checkOutDate,
        totalCost,
        modificationType,
        bookingId
      ]);

      await client.query('COMMIT');

      if (rows.length === 0) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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