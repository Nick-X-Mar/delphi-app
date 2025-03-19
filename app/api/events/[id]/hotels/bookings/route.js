import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const eventId = await params.id;
    const { searchParams } = new URL(request.url);
    
    // Hotel filters
    const search = searchParams.get('search') || '';
    
    // People filters
    const firstName = searchParams.get('firstName') || '';
    const lastName = searchParams.get('lastName') || '';
    const email = searchParams.get('email') || '';
    const guestType = searchParams.get('guestType') || '';
    const company = searchParams.get('company') || '';
    
    // Check if any people filters are applied
    const hasPeopleFilters = firstName || lastName || email || (guestType && guestType !== 'all') || (company && company !== 'all');
    
    // Build array of filter conditions for people
    const peopleFilterConditions = [];
    if (firstName) peopleFilterConditions.push(`LOWER(p.first_name) LIKE LOWER('%${firstName}%')`);
    if (lastName) peopleFilterConditions.push(`LOWER(p.last_name) LIKE LOWER('%${lastName}%')`);
    if (email) peopleFilterConditions.push(`LOWER(p.email) LIKE LOWER('%${email}%')`);
    if (guestType && guestType !== 'all') peopleFilterConditions.push(`p.guest_type = '${guestType}'`);
    if (company && company !== 'all') peopleFilterConditions.push(`p.company = '${company}'`);
    
    const peopleFilterClause = peopleFilterConditions.length > 0 
      ? `AND (${peopleFilterConditions.join(' AND ')})`
      : '';
    
    // Create two separate booking selection queries
    const filteredBookingsQuery = `
      SELECT json_agg(booking_info)
      FROM (
        SELECT 
          b.*,
          p.first_name,
          p.last_name,
          p.email,
          p.guest_type,
          p.company,
          p.salutation
        FROM bookings b
        INNER JOIN people p ON b.person_id = p.person_id
        LEFT JOIN people_details pd ON p.person_id = pd.person_id
        WHERE b.room_type_id = rt.room_type_id
        AND b.event_id = $1
        AND b.status NOT IN ('cancelled', 'invalidated')
        ${peopleFilterClause}
        ORDER BY b.check_in_date
      ) booking_info
    `;
    
    const allBookingsQuery = `
      SELECT json_agg(booking_info)
      FROM (
        SELECT 
          b.*,
          p.first_name,
          p.last_name,
          p.email,
          p.guest_type,
          p.company,
          p.salutation
        FROM bookings b
        INNER JOIN people p ON b.person_id = p.person_id
        LEFT JOIN people_details pd ON p.person_id = pd.person_id
        WHERE b.room_type_id = rt.room_type_id
        AND b.event_id = $1
        AND b.status NOT IN ('cancelled', 'invalidated')
        ORDER BY b.check_in_date
      ) booking_info
    `;
    
    let query = `
      WITH filtered_bookings AS (
        SELECT 
          b.*,
          rt.hotel_id
        FROM bookings b
        INNER JOIN people p ON b.person_id = p.person_id
        INNER JOIN room_types rt ON b.room_type_id = rt.room_type_id
        WHERE b.event_id = $1
        AND b.status NOT IN ('cancelled', 'invalidated')
        ${peopleFilterClause}
      ),
      hotels_with_matches AS (
        SELECT DISTINCT h.hotel_id
        FROM hotels h
        INNER JOIN filtered_bookings fb ON h.hotel_id = fb.hotel_id
      ),
      event_hotels AS (
        SELECT h.*,
          (
            SELECT COUNT(*)
            FROM filtered_bookings fb
            WHERE fb.hotel_id = h.hotel_id
          ) as total_bookings
        FROM hotels h
        INNER JOIN event_hotels eh ON h.hotel_id = eh.hotel_id
        ${hasPeopleFilters ? 'INNER JOIN hotels_with_matches hwm ON h.hotel_id = hwm.hotel_id' : ''}
        WHERE eh.event_id = $1
        ${search ? `
          AND (
            LOWER(h.name) LIKE LOWER($2) OR
            LOWER(h.area) LIKE LOWER($2) OR
            LOWER(h.address) LIKE LOWER($2)
          )
        ` : ''}
      )
      SELECT 
        h.hotel_id,
        h.name,
        h.area,
        h.address,
        h.category,
        h.stars,
        h.phone_number,
        h.website_link,
        h.total_bookings,
        (
          SELECT json_agg(room_type_info)
          FROM (
            SELECT 
              rt.*,
              (
                SELECT COUNT(*)
                FROM filtered_bookings fb
                WHERE fb.room_type_id = rt.room_type_id
              ) as active_bookings_count,
              (
                ${hasPeopleFilters ? filteredBookingsQuery : allBookingsQuery}
              ) as bookings
            FROM room_types rt
            WHERE rt.hotel_id = h.hotel_id
          ) room_type_info
        ) as room_types
      FROM event_hotels h
      ORDER BY 
        h.total_bookings > 0 DESC, -- Hotels with bookings first
        h.category DESC, 
        h.stars DESC, 
        h.name;
    `;

    const queryParams = search 
      ? [eventId, `%${search}%`] 
      : [eventId];
      
    const { rows } = await pool.query(query, queryParams);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error getting event hotels bookings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 