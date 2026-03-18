import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { checkEventViewOnly } from '@/lib/apiViewOnlyCheck';

// GET single person's details
export async function GET(request, { params }) {
  const { id } = await params;
  try {
    const result = await pool.query(
      'SELECT * FROM people_details WHERE person_id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Person not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching person details:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT/Update details
export async function PUT(request, { params }) {
  const client = await pool.connect();
  
  try {
    const personId = await params.id;
    const data = await request.json();
    
    // Get event ID from person's event associations
    const eventResult = await client.query(
      'SELECT event_id FROM event_people WHERE person_id = $1 ORDER BY created_at DESC LIMIT 1',
      [personId]
    );
    
    if (eventResult.rows.length > 0) {
      const eventId = eventResult.rows[0].event_id;
      // Check if event has passed (view-only mode)
      const { isViewOnly } = await checkEventViewOnly(eventId);
      if (isViewOnly) {
        return NextResponse.json({
          error: 'Event has passed. Modifications are not allowed.'
        }, { status: 403 });
      }
    }
    
    await client.query('BEGIN');

    // If source is 'App', also update the people table (source information fields)
    if (data.source_fields) {
      // Validate email format
      if (data.source_fields.email && !data.source_fields.email.includes('@')) {
        client.release();
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
      // Validate mobile phone
      if (data.source_fields.mobile_phone && !/^[\d\s+\-()]+$/.test(data.source_fields.mobile_phone)) {
        client.release();
        return NextResponse.json({ error: 'Mobile phone must contain only digits, spaces, +, -, or parentheses' }, { status: 400 });
      }

      const updatePeopleQuery = `
        UPDATE people SET
          salutation = $2,
          first_name = $3,
          last_name = $4,
          email = $5,
          mobile_phone = $6,
          company = $7,
          job_title = $8,
          room_type = $9,
          guest_type = $10,
          nationality = $11,
          companion_full_name = $12,
          companion_email = $13,
          checkin_date = $14,
          checkout_date = $15,
          comments = $16
        WHERE person_id = $1 AND source = 'App'
      `;
      await client.query(updatePeopleQuery, [
        personId,
        data.source_fields.salutation || null,
        data.source_fields.first_name,
        data.source_fields.last_name,
        data.source_fields.email,
        data.source_fields.mobile_phone || null,
        data.source_fields.company || null,
        data.source_fields.job_title || null,
        data.source_fields.room_type || null,
        data.source_fields.guest_type || null,
        data.source_fields.nationality || null,
        data.source_fields.companion_full_name || null,
        data.source_fields.companion_email || null,
        data.source_fields.checkin_date || null,
        data.source_fields.checkout_date || null,
        data.source_fields.comments || null,
      ]);
    }

    // Update people_details
    const updateQuery = `
      INSERT INTO people_details (
        person_id, room_size,
        group_id, notes, will_not_attend, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (person_id)
      DO UPDATE SET
        room_size = EXCLUDED.room_size,
        group_id = EXCLUDED.group_id,
        notes = EXCLUDED.notes,
        will_not_attend = EXCLUDED.will_not_attend,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const values = [
      personId,
      data.room_size,
      data.group_id,
      data.notes,
      data.will_not_attend
    ];

    const { rows } = await client.query(updateQuery, values);

    // If will_not_attend is true, cancel all active bookings
    if (data.will_not_attend) {
      const updateBookingsQuery = `
        UPDATE bookings
        SET 
          status = 'cancelled',
          modification_type = 'cancelled',
          modification_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE person_id = $1
        AND status NOT IN ('cancelled', 'invalidated')
      `;

      await client.query(updateBookingsQuery, [personId]);
    }

    await client.query('COMMIT');
    return NextResponse.json(rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating person details:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// DELETE details
export async function DELETE(request, { params }) {
  const { id } = await params;
  try {
    const { rows } = await pool.query('DELETE FROM people_details WHERE person_id = $1 RETURNING *', [id]);
    
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Details not found' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Details deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 