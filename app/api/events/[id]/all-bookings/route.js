import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const eventId = params.id;
    
    const query = `
      SELECT 
        b.booking_id,
        b.person_id, 
        b.room_type_id,
        b.check_in_date,
        b.check_out_date,
        b.status,
        p.first_name,
        p.last_name,
        p.email,
        p.guest_type,
        p.company,
        p.salutation,
        h.hotel_id,
        h.name AS hotel_name,
        h.address AS hotel_address,
        h.phone_number AS contact_information,
        h.website_link AS hotel_website,
        rt.name AS room_type_name
      FROM 
        bookings b
      JOIN 
        people p ON b.person_id = p.person_id
      JOIN 
        room_types rt ON b.room_type_id = rt.room_type_id
      JOIN 
        hotels h ON rt.hotel_id = h.hotel_id
      WHERE 
        b.event_id = $1
      AND 
        b.status NOT IN ('cancelled', 'invalidated')
      ORDER BY 
        b.check_in_date
    `;

    const { rows } = await pool.query(query, [eventId]);
    
    return NextResponse.json({ bookings: rows });
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 