import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guestId');
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing eventId parameter' },
        { status: 400 }
      );
    }

    // Build the query based on whether guestId is null or not
    let query;
    let queryParams;

    if (guestId === 'null' || guestId === null) {
      // For bulk emails (no specific guest)
      query = `
        SELECT * FROM email_notifications
        WHERE event_id = $1
        AND (guest_id IS NULL OR notification_type = 'BULK')
        ORDER BY sent_at DESC
        LIMIT 1
      `;
      queryParams = [eventId];
    } else {
      // For individual guest emails
      query = `
        SELECT * FROM email_notifications
        WHERE guest_id = $1
        AND event_id = $2
        ORDER BY sent_at DESC
        LIMIT 1
      `;
      queryParams = [guestId, eventId];
    }

    const result = await pool.query(query, queryParams);

    // If no record found and this is a bulk email request, create a mock record
    if (result.rows.length === 0 && (guestId === 'null' || guestId === null)) {
      // Get the event start date to use as a fallback
      const eventResult = await pool.query(
        `SELECT start_date FROM events WHERE event_id = $1`,
        [eventId]
      );
      
      if (eventResult.rows.length > 0) {
        const eventStartDate = eventResult.rows[0].start_date;
        
        // Return a mock record with the event start date
        return NextResponse.json({
          id: -1, // Not a real record
          guest_id: null,
          event_id: eventId,
          sent_at: eventStartDate,
          notification_type: 'MOCK',
          status: 'sent',
          message: 'No previous bulk email found. Using event start date as reference.'
        });
      }
    }

    return NextResponse.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error fetching email notification:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email notification' },
      { status: 500 }
    );
  }
} 