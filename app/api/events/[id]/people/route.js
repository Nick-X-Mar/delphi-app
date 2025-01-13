import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET people associated with an event
export async function GET(request, { params }) {
  try {
    const eventId = await params.id;
    const query = `
      SELECT 
        p.*,
        pd.department,
        pd.position
      FROM people p
      LEFT JOIN people_details pd ON p.person_id = pd.person_id
      INNER JOIN event_people ep ON p.person_id = ep.person_id
      WHERE ep.event_id = $1
      ORDER BY p.last_name, p.first_name
    `;
    
    const { rows } = await pool.query(query, [eventId]);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error getting event people:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST associate people with an event
export async function POST(request, { params }) {
  try {
    const eventId = await params.id;
    const { personIds, action } = await request.json();

    if (!Array.isArray(personIds)) {
      return NextResponse.json({ error: 'personIds must be an array' }, { status: 400 });
    }

    if (!['add', 'remove'].includes(action)) {
      return NextResponse.json({ error: 'action must be either "add" or "remove"' }, { status: 400 });
    }

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (action === 'add') {
        // Insert new associations
        if (personIds.length > 0) {
          const values = personIds.map((personId) => `(${eventId}, ${personId})`).join(',');
          await client.query(`
            INSERT INTO event_people (event_id, person_id)
            VALUES ${values}
            ON CONFLICT (event_id, person_id) DO NOTHING
          `);
        }
      } else {
        // Remove associations
        if (personIds.length > 0) {
          await client.query(`
            DELETE FROM event_people 
            WHERE event_id = $1 AND person_id = ANY($2::int[])
          `, [eventId, personIds]);
        }
      }

      await client.query('COMMIT');
      return NextResponse.json({ 
        message: action === 'add' ? 'People added to event successfully' : 'People removed from event successfully' 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error managing event people:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 