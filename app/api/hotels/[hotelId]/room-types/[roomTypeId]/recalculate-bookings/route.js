import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request, { params }) {
  const client = await pool.connect();
  
  try {
    const { hotelId, roomTypeId } = await params;
    
    await client.query('BEGIN');

    // First, get all active bookings for this room type
    const getBookingsQuery = `
      SELECT 
        b.booking_id,
        b.check_in_date,
        b.check_out_date
      FROM bookings b
      WHERE b.room_type_id = $1
      AND b.status NOT IN ('cancelled', 'invalidated')
    `;

    const { rows: bookings } = await client.query(getBookingsQuery, [roomTypeId]);

    // Get room type availability (for daily prices)
    const getAvailabilityQuery = `
      SELECT 
        date,
        price_per_night,
        available_rooms
      FROM room_availability
      WHERE room_type_id = $1
    `;

    const { rows: availability } = await client.query(getAvailabilityQuery, [roomTypeId]);

    // Get room type base price
    const getRoomTypeQuery = `
      SELECT base_price_per_night
      FROM room_types
      WHERE room_type_id = $1
    `;

    const { rows: roomTypeData } = await client.query(getRoomTypeQuery, [roomTypeId]);
    const basePrice = parseFloat(roomTypeData[0].base_price_per_night);

    // Create a map of date to price for quick lookup
    const priceMap = new Map();
    availability.forEach(a => {
      priceMap.set(a.date.toISOString().split('T')[0], parseFloat(a.price_per_night));
    });

    // Update each booking with new total cost
    for (const booking of bookings) {
      let totalCost = 0;
      let currentDate = new Date(booking.check_in_date);
      const checkOutDate = new Date(booking.check_out_date);

      while (currentDate < checkOutDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        // Use daily price if available, otherwise use base price
        const dailyPrice = priceMap.get(dateStr) || basePrice;
        totalCost += dailyPrice;
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Update booking with new total cost
      const updateBookingQuery = `
        UPDATE bookings
        SET 
          total_cost = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE booking_id = $2
      `;

      await client.query(updateBookingQuery, [totalCost.toFixed(2), booking.booking_id]);
    }

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Successfully recalculated costs for all bookings',
      updatedBookings: bookings.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recalculating booking costs:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 