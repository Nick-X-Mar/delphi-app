import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// POST endpoint to sync people from external system
export async function POST(request) {
  const client = await pool.connect();
  try {
    const people = await request.json();
    console.log(`[Sync] Starting sync process for ${people.length} people`);

    if (!Array.isArray(people)) {
      console.error('[Sync] Error: Request body is not an array');
      return NextResponse.json({ 
        error: 'Request body must be an array of people' 
      }, { status: 400 });
    }

    const results = {
      updated: 0,
      inserted: 0,
      errors: []
    };

    for (const person of people) {
      const individualClient = await pool.connect();
      console.log(`[Sync] Processing person_id: ${person.person_id}`);
      
      try {
        await individualClient.query('BEGIN');
        
        // Validate required fields
        if (!person.person_id || !person.first_name || !person.last_name || !person.email) {
          const error = 'Missing required fields (person_id, first_name, last_name, email)';
          console.error(`[Sync] Validation error for person_id ${person.person_id}: ${error}`);
          results.errors.push({
            person_id: person.person_id,
            error: error
          });
          continue;
        }

        console.log(`[Sync] Attempting to update person_id: ${person.person_id}`);
        // Try to update first
        const updateQuery = `
          UPDATE people 
          SET 
            salutation = $1,
            first_name = $2,
            last_name = $3,
            nationality = $4,
            mobile_phone = $5,
            email = $6,
            room_type = $7,
            full_name = $8,
            companion_email = $9,
            checkin_date = $10,
            checkout_date = $11,
            comments = $12,
            app_synced = $13,
            app_synced_date = $14,
            guest_type = $15,
            synced_at = CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
          WHERE person_id = $16
          RETURNING *
        `;

        const updateValues = [
          person.salutation,
          person.first_name,
          person.last_name,
          person.nationality,
          person.mobile_phone,
          person.email,
          person.room_type,
          person.full_name,
          person.companion_email,
          person.checkin_date,
          person.checkout_date,
          person.comments,
          person.app_synced,
          person.app_synced_date,
          person.guest_type,
          person.person_id
        ];

        console.log(`[Sync] Update values for person_id ${person.person_id}:`, updateValues);
        
        const updateResult = await individualClient.query(updateQuery, updateValues);

        if (updateResult.rows.length === 0) {
          console.log(`[Sync] No existing record found for person_id: ${person.person_id}, attempting insert`);
          // If update didn't find the record, insert it
          const insertQuery = `
            INSERT INTO people (
              person_id,
              salutation,
              first_name,
              last_name,
              nationality,
              mobile_phone,
              email,
              room_type,
              full_name,
              companion_email,
              checkin_date,
              checkout_date,
              comments,
              app_synced,
              app_synced_date,
              guest_type,
              synced_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
            RETURNING *
          `;

          const insertValues = [
            person.person_id,
            person.salutation,
            person.first_name,
            person.last_name,
            person.nationality,
            person.mobile_phone,
            person.email,
            person.room_type,
            person.full_name,
            person.companion_email,
            person.checkin_date,
            person.checkout_date,
            person.comments,
            person.app_synced,
            person.app_synced_date,
            person.guest_type
          ];

          console.log(`[Sync] Insert values for person_id ${person.person_id}:`, insertValues);
          
          const insertResult = await individualClient.query(insertQuery, insertValues);
          console.log(`[Sync] Successfully inserted person_id: ${person.person_id}`);
          results.inserted++;
        } else {
          console.log(`[Sync] Successfully updated person_id: ${person.person_id}`);
          results.updated++;
        }
        
        await individualClient.query('COMMIT');
        console.log(`[Sync] Transaction committed for person_id: ${person.person_id}`);
        
      } catch (error) {
        await individualClient.query('ROLLBACK');
        console.error(`[Sync] Error processing person_id ${person.person_id}:`, error);
        results.errors.push({
          person_id: person.person_id,
          error: error.message,
          details: error.detail || 'No additional details available'
        });
      } finally {
        individualClient.release();
      }
    }

    console.log('[Sync] Final results:', results);

    return NextResponse.json({
      message: 'Sync completed',
      results
    });

  } catch (error) {
    console.error('[Sync] Critical error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 