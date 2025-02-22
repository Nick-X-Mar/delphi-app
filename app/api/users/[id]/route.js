import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';

// DELETE /api/users/[id] - Delete a user
export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'level-1'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check if user exists and get their email
    const { rows } = await pool.query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userToDelete = rows[0];

    // Don't allow deleting the main admin user
    if (userToDelete.email === 'admin@example.com') {
      return NextResponse.json(
        { error: 'Cannot delete the main admin user' },
        { status: 400 }
      );
    }

    // If level-1 user, don't allow deleting admin users
    if (session.user.role === 'level-1' && userToDelete.role === 'admin') {
      return NextResponse.json(
        { error: 'Level-1 users cannot delete admin users' },
        { status: 403 }
      );
    }

    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
} 