import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// POST migrate hotels from source event to target event
export async function POST(request, { params }) {
  const client = await pool.connect();
  
  try {
    const { id: targetEventId } = await params;
    const { sourceEventId } = await request.json();

    if (!sourceEventId) {
      return NextResponse.json({
        error: 'sourceEventId is required'
      }, { status: 400 });
    }

    // Verify target event exists
    const targetEventCheck = await client.query(
      'SELECT event_id FROM events WHERE event_id = $1',
      [targetEventId]
    );

    if (targetEventCheck.rows.length === 0) {
      return NextResponse.json({
        error: 'Target event not found'
      }, { status: 404 });
    }

    // Verify source event exists
    const sourceEventCheck = await client.query(
      'SELECT event_id FROM events WHERE event_id = $1',
      [sourceEventId]
    );

    if (sourceEventCheck.rows.length === 0) {
      return NextResponse.json({
        error: 'Source event not found'
      }, { status: 404 });
    }

    await client.query('BEGIN');

    // Step 1: Get all hotel IDs from event_hotels for the source event
    const hotelIdsResult = await client.query(
      'SELECT hotel_id FROM event_hotels WHERE event_id = $1',
      [sourceEventId]
    );

    const sourceHotelIds = hotelIdsResult.rows.map(row => row.hotel_id);

    if (sourceHotelIds.length === 0) {
      await client.query('COMMIT');
      return NextResponse.json({
        message: 'No hotels found in source event',
        hotelsMigrated: 0
      });
    }

    // Step 2: For each hotel, get full data and duplicate it
    const newHotelIds = [];
    
    for (const hotelId of sourceHotelIds) {
      // Get full hotel record
      const hotelResult = await client.query(
        `SELECT name, area, stars, address, phone_number, email, website_link, 
                map_link, category, contact_name, contact_phone, contact_mobile, 
                contact_email, agreement_file_link
         FROM hotels WHERE hotel_id = $1`,
        [hotelId]
      );

      if (hotelResult.rows.length === 0) {
        continue; // Skip if hotel doesn't exist
      }

      const hotel = hotelResult.rows[0];

      // Insert new hotel with same data (new ID will be auto-generated)
      const insertResult = await client.query(
        `INSERT INTO hotels (
          name, area, stars, address, phone_number, email, website_link,
          map_link, category, contact_name, contact_phone, contact_mobile,
          contact_email, agreement_file_link
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING hotel_id`,
        [
          hotel.name,
          hotel.area,
          hotel.stars,
          hotel.address,
          hotel.phone_number,
          hotel.email,
          hotel.website_link,
          hotel.map_link,
          hotel.category,
          hotel.contact_name,
          hotel.contact_phone,
          hotel.contact_mobile,
          hotel.contact_email,
          hotel.agreement_file_link
        ]
      );

      const newHotelId = insertResult.rows[0].hotel_id;
      newHotelIds.push(newHotelId);
    }

    // Step 3: Create event_hotels associations for new hotels with target event
    if (newHotelIds.length > 0) {
      // Build parameterized query for multiple inserts
      const placeholders = newHotelIds.map((_, index) => {
        const baseIndex = index * 2;
        return `($${baseIndex + 1}, $${baseIndex + 2})`;
      }).join(', ');
      
      const values = newHotelIds.flatMap(hotelId => [targetEventId, hotelId]);
      
      await client.query(
        `INSERT INTO event_hotels (event_id, hotel_id)
         VALUES ${placeholders}
         ON CONFLICT (event_id, hotel_id) DO NOTHING`,
        values
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Hotels migrated successfully',
      hotelsMigrated: newHotelIds.length
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error migrating hotels:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

