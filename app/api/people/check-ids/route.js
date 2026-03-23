import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request) {
  try {
    const { personIds } = await request.json();

    if (!Array.isArray(personIds) || personIds.length === 0) {
      return NextResponse.json({ existing: [], new: [] });
    }

    const stringIds = personIds.map(id => String(id).trim());

    const { rows } = await pool.query(
      'SELECT person_id FROM people WHERE person_id = ANY($1::text[])',
      [stringIds]
    );

    const existingSet = new Set(rows.map(r => r.person_id));
    const existing = stringIds.filter(id => existingSet.has(id));
    const newIds = stringIds.filter(id => !existingSet.has(id));

    return NextResponse.json({ existing, new: newIds });
  } catch (error) {
    console.error('Error checking person IDs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
