import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkEventViewOnly } from '@/lib/apiViewOnlyCheck';

export async function POST(request) {
  try {
    const { eventId, personId, roomTypeId, checkInDate, checkOutDate, totalCost, daysPaidByGuest, guestCost, defCost } = await request.json();

    // Validate required fields
    if (!eventId || !personId || !roomTypeId || !checkInDate || !checkOutDate || totalCost === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if event has passed (view-only mode)
    const { isViewOnly } = await checkEventViewOnly(eventId);
    if (isViewOnly) {
      return NextResponse.json({
        error: 'Event has passed. Modifications are not allowed.'
      }, { status: 403 });
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
        days_paid_by_guest,
        guest_cost,
        def_cost
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING 
        booking_id,
        status,
        total_cost,
        days_paid_by_guest,
        guest_cost,
        def_cost,
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
      [eventId, personId, roomTypeId, checkInDate, checkOutDate, totalCost, daysPaidByGuest ?? 0, guestCost ?? 0, defCost ?? totalCost]
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