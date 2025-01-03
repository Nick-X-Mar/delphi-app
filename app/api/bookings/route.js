import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request) {
  try {
    const { eventId, personId, roomTypeId, checkInDate, checkOutDate, pricePerNight, totalCost, payable } = await request.json();

    // Validate required fields
    if (!eventId || !personId || !roomTypeId || !checkInDate || !checkOutDate || !totalCost) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create the booking
    const result = await pool.query(
      `INSERT INTO bookings (
        event_id,
        person_id,
        room_type_id,
        check_in_date,
        check_out_date,
        total_cost,
        payable
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING 
        booking_id,
        status,
        total_cost,
        payable,
        (
          SELECT h.name 
          FROM hotels h 
          JOIN room_types rt ON rt.hotel_id = h.hotel_id 
          WHERE rt.room_type_id = $3
        ) as hotel_name,
        (
          SELECT rt.name
          FROM room_types rt
          WHERE rt.room_type_id = $3
        ) as room_type_name`,
      [eventId, personId, roomTypeId, checkInDate, checkOutDate, totalCost, payable ?? true]
    );

    // Return the created booking with additional info
    return NextResponse.json({
      success: true,
      booking: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating booking:', error);
    
    // Handle specific database errors
    if (error.message?.includes('validate_booking_dates')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
} 