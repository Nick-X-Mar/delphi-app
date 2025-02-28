import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const notificationType = searchParams.get('notificationType');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build the query with filters
    let query = `
      SELECT en.*, p.first_name, p.last_name, p.email, e.name as event_name
      FROM email_notifications en
      LEFT JOIN people p ON en.guest_id = p.person_id
      LEFT JOIN events e ON en.event_id = e.event_id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramIndex = 1;

    if (eventId) {
      query += ` AND en.event_id = $${paramIndex}`;
      queryParams.push(eventId);
      paramIndex++;
    }

    if (notificationType) {
      query += ` AND en.notification_type = $${paramIndex}`;
      queryParams.push(notificationType);
      paramIndex++;
    }

    if (status) {
      query += ` AND en.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND en.sent_at >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      // Add one day to include the end date fully
      const endDateObj = new Date(endDate);
      endDateObj.setDate(endDateObj.getDate() + 1);
      const adjustedEndDate = endDateObj.toISOString().split('T')[0];
      
      query += ` AND en.sent_at < $${paramIndex}`;
      queryParams.push(adjustedEndDate);
      paramIndex++;
    }

    // Add order by and pagination
    query += ` ORDER BY en.sent_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    // Count total records for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM email_notifications en
      WHERE 1=1
    `;
    
    const countParams = [];
    let countParamIndex = 1;

    if (eventId) {
      countQuery += ` AND en.event_id = $${countParamIndex}`;
      countParams.push(eventId);
      countParamIndex++;
    }

    if (notificationType) {
      countQuery += ` AND en.notification_type = $${countParamIndex}`;
      countParams.push(notificationType);
      countParamIndex++;
    }

    if (status) {
      countQuery += ` AND en.status = $${countParamIndex}`;
      countParams.push(status);
      countParamIndex++;
    }

    if (startDate) {
      countQuery += ` AND en.sent_at >= $${countParamIndex}`;
      countParams.push(startDate);
      countParamIndex++;
    }

    if (endDate) {
      // Add one day to include the end date fully
      const endDateObj = new Date(endDate);
      endDateObj.setDate(endDateObj.getDate() + 1);
      const adjustedEndDate = endDateObj.toISOString().split('T')[0];
      
      countQuery += ` AND en.sent_at < $${countParamIndex}`;
      countParams.push(adjustedEndDate);
      countParamIndex++;
    }

    // Execute the queries
    const result = await pool.query(query, queryParams);
    const countResult = await pool.query(countQuery, countParams);
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      notifications: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching email notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email notifications' },
      { status: 500 }
    );
  }
} 