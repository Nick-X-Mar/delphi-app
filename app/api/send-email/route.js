import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { 
      to, 
      firstName, 
      salutation,
      hotel_name,
      hotel_address,
      contact_information,
      hotel_website,
      checkin_date,
      checkout_date
    } = await request.json();

    // Check if API key exists
    if (!process.env.HUBSPOT_API_KEY) {
      console.error('HUBSPOT_API_KEY is not defined in environment variables');
      return NextResponse.json(
        { error: 'Missing HubSpot API key. Email sending is disabled.' },
        { status: 500 }
      );
    }

    // Call HubSpot's transactional email API
    const response = await fetch('https://api.hubapi.com/marketing/v3/transactional/single-email/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailId: process.env.HUBSPOT_EMAIL_TEMPLATE_ID,
        message: {
          // from: process.env.EMAIL_FROM_ADDRESS,
          to: to
        },
        customProperties: {
          salutation: salutation || '',
          first_name: firstName || '',
          hotel_name: hotel_name || '',
          hotel_address: hotel_address || '',
          contact_information: contact_information || '',
          hotel_website: hotel_website || '',
          checkin_date: checkin_date || '',
          checkout_date: checkout_date || ''
          // Add any other custom properties needed for your email template
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to send email: ${JSON.stringify(errorData)}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
} 