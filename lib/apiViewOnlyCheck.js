import pool from './db';

/**
 * Check if an event has passed its end date
 * @param {string|number} eventId - The event ID to check
 * @returns {Promise<{isViewOnly: boolean, event: object|null}>}
 */
export async function checkEventViewOnly(eventId) {
  try {
    if (!eventId) {
      return { isViewOnly: false, event: null };
    }

    const { rows } = await pool.query(
      'SELECT * FROM events WHERE event_id = $1',
      [eventId]
    );

    if (rows.length === 0) {
      return { isViewOnly: false, event: null };
    }

    const event = rows[0];
    
    // Compare end_date with current date (date only, ignore time)
    const endDate = new Date(event.end_date);
    endDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isViewOnly = endDate < today;

    return { isViewOnly, event };
  } catch (error) {
    console.error('Error checking event view-only status:', error);
    // Default to not view-only on error to avoid blocking legitimate requests
    return { isViewOnly: false, event: null };
  }
}

/**
 * Get working event ID from request (query param, body, or header)
 * @param {Request} request - The request object
 * @returns {Promise<string|number|null>}
 */
export async function getWorkingEventIdFromRequest(request) {
  try {
    // Try to get from query params
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId') || url.searchParams.get('event_id');
    if (eventId) return eventId;

    // Try to get from body (for POST/PUT requests)
    try {
      const body = await request.json();
      if (body.eventId) return body.eventId;
      if (body.event_id) return body.event_id;
      
      // For bookings, check personId to get event
      if (body.personId) {
        const { rows } = await pool.query(
          `SELECT DISTINCT event_id FROM event_people WHERE person_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [body.personId]
        );
        if (rows.length > 0) return rows[0].event_id;
      }
    } catch (e) {
      // Body might not be JSON or might be empty
    }

    // Try to get from headers
    const eventIdHeader = request.headers.get('x-working-event-id');
    if (eventIdHeader) return eventIdHeader;

    return null;
  } catch (error) {
    console.error('Error getting working event ID from request:', error);
    return null;
  }
}

