import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Get the request body
    const { to, subject, firstName, lastName, ticketId } = await request.json();
    
    // Check if HubSpot API key exists
    const hubspotApiKey = process.env.HUBSPOT_API_KEY;
    if (!hubspotApiKey) {
      console.error('HUBSPOT_API_KEY is not defined in environment variables');
      return NextResponse.json(
        { error: 'Missing HubSpot API key. Email sending is disabled.' },
        { status: 500 }
      );
    }

    // Prepare the request payload
    const payload = {
      emailId: process.env.HUBSPOT_EMAIL_TEMPLATE_ID || '182444167092',
      message: {
        // from: process.env.EMAIL_FROM_ADDRESS || 'nmarianos93@gmail.com',
        // to: to,
        // cc: ['nmarianos93@gmail.com']
        to: 'nmarianos93@gmail.com'
      },
      customProperties: {
        first_name: firstName || '',
        last_name: lastName || '',
        ticket_id: ticketId || ''
      }
    };

    console.log('Sending email with payload:', JSON.stringify(payload));

    // Call HubSpot's transactional email API from the server
    const response = await fetch('https://api.hubapi.com/marketing/v3/transactional/single-email/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hubspotApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('HubSpot API response status:', response.status);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('HubSpot API error response:', JSON.stringify(errorData));
      } catch (parseError) {
        const textResponse = await response.text();
        console.error('Failed to parse error response. Raw response:', textResponse);
        errorData = { message: 'Failed to parse error response', rawResponse: textResponse };
      }
      
      return NextResponse.json(
        { error: `Failed to send email: ${JSON.stringify(errorData)}` },
        { status: response.status }
      );
    }

    // Get the response data which includes the status ID
    const responseData = await response.json();
    console.log('HubSpot API success response:', JSON.stringify(responseData));
    
    return NextResponse.json({
      success: true,
      statusId: responseData.requestId || responseData.id || null,
      response: responseData
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 