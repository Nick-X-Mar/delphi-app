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
            first_name = $1,
            last_name = $2,
            email = $3,
            mobile_phone = $4,
            company = $5,
            companion_full_name = $6,
            companion_email = $7,
            updated_at = CURRENT_TIMESTAMP
          WHERE person_id = $8
          RETURNING *
        `;

        const values = [
          person.first_name,
          person.last_name,
          person.email,
          person.mobile_phone,
          person.company,
          person.companion_full_name,
          person.companion_email,
          person.person_id
        ];

        console.log(`[Sync] Update values for person_id ${person.person_id}:`, values);
        
        const updateResult = await individualClient.query(updateQuery, values);

        if (updateResult.rows.length === 0) {
          console.log(`[Sync] No existing record found for person_id: ${person.person_id}, attempting insert`);
          // If update didn't find the record, insert it
          const insertQuery = `
            INSERT INTO people (
              first_name,
              last_name,
              email,
              mobile_phone,
              company,
              companion_full_name,
              companion_email
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
          `;

          const insertValues = [
            person.first_name,
            person.last_name,
            person.email,
            person.mobile_phone,
            person.company,
            person.companion_full_name,
            person.companion_email
          ];

          console.log(`[Sync] Insert values for person_id ${person.person_id}:`, insertValues);
          
          const insertResult = await individualClient.query(insertQuery, insertValues);
          console.log(`[Sync] Successfully inserted person_id: ${person.person_id}`);
          
          // Assign newly created person to event 1
          const assignToEventQuery = `
            INSERT INTO event_people (event_id, person_id)
            VALUES (1, $1)
          `;
          await individualClient.query(assignToEventQuery, [person.person_id]);
          console.log(`[Sync] Successfully assigned person_id: ${person.person_id} to event 1`);

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