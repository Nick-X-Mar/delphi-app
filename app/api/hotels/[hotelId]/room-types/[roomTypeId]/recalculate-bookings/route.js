import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request, { params }) {
  const client = await pool.connect();
  
  try {
    const { hotelId, roomTypeId } = await params;
    
    await client.query('BEGIN');

    // Get all active bookings for this room type, joined with people_details for room_size
    const getBookingsQuery = `
      SELECT 
        b.booking_id,
        b.check_in_date,
        b.check_out_date,
        b.person_id,
        pd.room_size,
        p.room_type as person_room_type
      FROM bookings b
      LEFT JOIN people_details pd ON b.person_id = pd.person_id
      LEFT JOIN people p ON b.person_id = p.person_id
      WHERE b.room_type_id = $1
      AND b.status NOT IN ('cancelled', 'invalidated')
    `;

    const { rows: bookings } = await client.query(getBookingsQuery, [roomTypeId]);

    // Get room type availability (for daily prices including single prices)
    const getAvailabilityQuery = `
      SELECT 
        date,
        price_per_night,
        single_price_per_night,
        available_rooms
      FROM room_availability
      WHERE room_type_id = $1
    `;

    const { rows: availability } = await client.query(getAvailabilityQuery, [roomTypeId]);

    // Get room type base price and single price
    const getRoomTypeQuery = `
      SELECT base_price_per_night, single_price_per_night
      FROM room_types
      WHERE room_type_id = $1
    `;

    const { rows: roomTypeData } = await client.query(getRoomTypeQuery, [roomTypeId]);
    const basePrice = parseFloat(roomTypeData[0].base_price_per_night);
    const baseSinglePrice = roomTypeData[0].single_price_per_night != null
      ? parseFloat(roomTypeData[0].single_price_per_night)
      : null;

    const { rows: hotelData } = await client.query(
      'SELECT overnight_stay_tax FROM hotels WHERE hotel_id = $1',
      [hotelId]
    );
    const overnightStayTax = parseFloat(hotelData[0]?.overnight_stay_tax) || 0;

    // Create maps for quick lookup
    const priceMap = new Map();
    const singlePriceMap = new Map();
    availability.forEach(a => {
      const dateStr = a.date.toISOString().split('T')[0];
      priceMap.set(dateStr, parseFloat(a.price_per_night));
      if (a.single_price_per_night != null) {
        singlePriceMap.set(dateStr, parseFloat(a.single_price_per_night));
      }
    });

    // Update each booking with new total cost
    for (const booking of bookings) {
      const roomSize = booking.room_size != null
        ? booking.room_size
        : (booking.person_room_type === 'single' ? 1 : booking.person_room_type === 'double' ? 2 : null);
      const isSinglePax = roomSize === 1;

      let totalCost = 0;
      let currentDate = new Date(booking.check_in_date);
      const checkOutDate = new Date(booking.check_out_date);

      while (currentDate < checkOutDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        let dailyPrice;

        if (isSinglePax) {
          // Cascade: daily single -> base single -> daily normal -> base normal
          const dailySingle = singlePriceMap.get(dateStr);
          if (dailySingle != null) {
            dailyPrice = dailySingle;
          } else if (baseSinglePrice != null) {
            dailyPrice = baseSinglePrice;
          } else {
            dailyPrice = priceMap.get(dateStr) || basePrice;
          }
        } else {
          dailyPrice = priceMap.get(dateStr) || basePrice;
        }

        totalCost += dailyPrice + overnightStayTax;
        currentDate.setDate(currentDate.getDate() + 1);
      }

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