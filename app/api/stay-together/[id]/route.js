import { NextResponse } from 'next/server';
import pool from '@/lib/db';

// GET members of a stay-together group
export async function GET(request, { params }) {
  const { id } = params;
  try {
    const query = `
      SELECT 
        p.person_id,
        p.first_name,
        p.last_name,
        p.email
      FROM people p
      JOIN people_details pd ON p.person_id = pd.person_id
      WHERE pd.group_id = $1
      ORDER BY p.last_name, p.first_name
    `;

    const { rows } = await pool.query(query, [id]);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching group members:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update group members
export async function PUT(request, { params }) {
  const { id } = params;
  try {
    const { personIds } = await request.json();

    if (!Array.isArray(personIds)) {
      return NextResponse.json({ error: 'personIds must be an array' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create a new group if id is 'new'
      let groupId = id;
      if (id === 'new') {
        const { rows } = await client.query(
          'INSERT INTO stay_together DEFAULT VALUES RETURNING group_id'
        );
        groupId = rows[0].group_id;
      }

      // Update all people_details records
      await client.query(
        `UPDATE people_details 
         SET group_id = $1 
         WHERE person_id = ANY($2::int[])`,
        [groupId, personIds]
      );

      await client.query('COMMIT');

      // Return the updated group members
      const { rows } = await client.query(`
        SELECT 
          p.person_id,
          p.first_name,
          p.last_name,
          p.email
        FROM people p
        JOIN people_details pd ON p.person_id = pd.person_id
        WHERE pd.group_id = $1
        ORDER BY p.last_name, p.first_name
      `, [groupId]);

      return NextResponse.json({
        group_id: groupId,
        members: rows
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating group members:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE remove members from group
export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    const { personIds } = await request.json();

    if (!Array.isArray(personIds)) {
      return NextResponse.json({ error: 'personIds must be an array' }, { status: 400 });
    }

    await pool.query(
      `UPDATE people_details 
       SET group_id = NULL 
       WHERE person_id = ANY($1::int[])`,
      [personIds]
    );

    return NextResponse.json({ message: 'Members removed from group successfully' });
  } catch (error) {
    console.error('Error removing group members:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 