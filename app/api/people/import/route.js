import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { validatePerson } from '@/lib/peopleValidation';

export async function POST(request) {
  const client = await pool.connect();
  try {
    const { eventId, people } = await request.json();

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }
    if (!Array.isArray(people) || people.length === 0) {
      return NextResponse.json({ error: 'people array is required' }, { status: 400 });
    }

    // Get event accommodation dates for validation
    const eventResult = await client.query(
      'SELECT accommodation_start_date, accommodation_end_date FROM events WHERE event_id = $1',
      [eventId]
    );
    if (eventResult.rows.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    const { accommodation_start_date, accommodation_end_date } = eventResult.rows[0];

    const timestamp = await client.query("SELECT CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AS current_time");
    const currentTimestamp = timestamp.rows[0].current_time;

    await client.query('BEGIN');

    let inserted = 0;
    let updated = 0;
    const errors = [];

    for (const person of people) {
      const personId = String(person.person_id).trim();

      // Server-side validation
      const validation = validatePerson(person, {
        accommodationStartDate: accommodation_start_date,
        accommodationEndDate: accommodation_end_date,
      });
      if (!validation.valid) {
        errors.push({ person_id: personId, errors: validation.errors });
        continue;
      }

      // Check if person exists
      const existsResult = await client.query(
        'SELECT person_id FROM people WHERE person_id = $1',
        [personId]
      );
      const isUpdate = existsResult.rows.length > 0;

      // Determine room_size
      let roomSize = person.room_size || null;
      const roomType = person.room_type ? String(person.room_type).toLowerCase() : null;
      if (!roomSize && roomType) {
        roomSize = roomType === 'single' ? 1 : roomType === 'double' ? 2 : null;
      }

      // UPSERT into people table
      await client.query(`
        INSERT INTO people (
          person_id, salutation, first_name, last_name, email,
          mobile_phone, nationality, company, job_title, guest_type,
          room_type, companion_full_name, companion_email,
          checkin_date, checkout_date, comments, app_synced, synced_at, source,
          accommodation_funding_type
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'App',$19)
        ON CONFLICT (person_id) DO UPDATE SET
          salutation = EXCLUDED.salutation,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          email = EXCLUDED.email,
          mobile_phone = EXCLUDED.mobile_phone,
          nationality = EXCLUDED.nationality,
          company = EXCLUDED.company,
          job_title = EXCLUDED.job_title,
          guest_type = EXCLUDED.guest_type,
          room_type = EXCLUDED.room_type,
          companion_full_name = EXCLUDED.companion_full_name,
          companion_email = EXCLUDED.companion_email,
          checkin_date = EXCLUDED.checkin_date,
          checkout_date = EXCLUDED.checkout_date,
          comments = EXCLUDED.comments,
          synced_at = EXCLUDED.synced_at,
          accommodation_funding_type = EXCLUDED.accommodation_funding_type
      `, [
        personId,
        person.salutation || null,
        person.first_name,
        person.last_name,
        person.email,
        person.mobile_phone || null,
        person.nationality || null,
        person.company || null,
        person.job_title || null,
        person.guest_type || null,
        roomType,
        person.companion_full_name || null,
        person.companion_email || null,
        person.checkin_date || null,
        person.checkout_date || null,
        person.comments || null,
        false,
        currentTimestamp,
        person.accommodation_funding_type || null,
      ]);

      // UPSERT into people_details
      await client.query(`
        INSERT INTO people_details (person_id, room_size, notes, group_id, updated_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (person_id) DO UPDATE SET
          room_size = EXCLUDED.room_size,
          notes = EXCLUDED.notes,
          group_id = EXCLUDED.group_id,
          updated_at = EXCLUDED.updated_at
      `, [
        personId,
        roomSize,
        person.notes || null,
        person.group_id || null,
        currentTimestamp,
      ]);

      // Assign to event
      await client.query(`
        INSERT INTO event_people (event_id, person_id)
        VALUES ($1, $2)
        ON CONFLICT (event_id, person_id) DO NOTHING
      `, [eventId, personId]);

      if (isUpdate) {
        updated++;
      } else {
        inserted++;
      }
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      inserted,
      updated,
      errors,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk import error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
