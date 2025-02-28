import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request) {
  try {
    const { guestId, eventId, bookingId, notificationType, sentAt, to, subject, status, statusId, errorMessage } = await request.json();

    const result = await pool.query(
      `INSERT INTO email_notifications (
        guest_id, 
        event_id, 
        booking_id, 
        notification_type, 
        sent_at, 
        recipient_email, 
        subject, 
        status, 
        status_id,
        error_message
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [guestId, eventId, bookingId, notificationType, sentAt, to, subject, status || 'sent', statusId, errorMessage]
    );

    // Return appropriate status code based on the email status
    const statusCode = status === 'failed' ? 500 : 200;
    
    return NextResponse.json(
      { id: result.rows[0].id },
      { status: statusCode }
    );
  } catch (error) {
    console.error('Error recording email notification:', error);
    return NextResponse.json(
      { error: 'Failed to record email notification' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guestId');
    const eventId = searchParams.get('eventId');

    const result = await pool.query(
      `SELECT * FROM email_notifications
      WHERE guest_id = $1
      AND event_id = $2
      ORDER BY sent_at DESC
      LIMIT 1`,
      [guestId, eventId]
    );

    return NextResponse.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error fetching email notification:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email notification' },
      { status: 500 }
    );
  }
} 