// Email service for handling all email-related functionality
export async function sendEmail({ to, subject, body, eventId, guestId, bookingId, notificationType, firstName, lastName, ticketId }) {
  try {
    console.log('Sending email to:', to);
    
    // Call our server-side API route instead of HubSpot directly
    try {
      const response = await fetch('/api/hubspot/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject,
          firstName,
          lastName,
          ticketId: ticketId || bookingId || ''
        }),
      });

      console.log('Server API response status:', response.status);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('Server API error response:', JSON.stringify(errorData));
        } catch (parseError) {
          const textResponse = await response.text();
          console.error('Failed to parse error response. Raw response:', textResponse);
          errorData = { message: 'Failed to parse error response', rawResponse: textResponse };
        }
        
        const errorMessage = `Failed to send email: ${JSON.stringify(errorData)}`;
        
        // Record the failed email notification
        await recordEmailNotification({
          guestId,
          eventId,
          bookingId,
          notificationType,
          to,
          subject,
          status: 'failed',
          errorMessage
        });
        
        // Return an error object instead of throwing
        return { 
          success: false, 
          error: errorMessage 
        };
      }

      // Get the response data which includes the status ID
      const responseData = await response.json();
      console.log('Server API success response:', JSON.stringify(responseData));
      
      const statusId = responseData.statusId || null;

      // Record the successful email notification
      const notificationResult = await recordEmailNotification({
        guestId,
        eventId,
        bookingId,
        notificationType,
        to,
        subject,
        status: 'sent',
        statusId
      });

      return { 
        success: true, 
        statusId,
        notificationId: notificationResult.id
      };
    } catch (fetchError) {
      console.error('Network error when calling server API:', fetchError);
      
      // Record the failed email notification
      await recordEmailNotification({
        guestId,
        eventId,
        bookingId,
        notificationType,
        to,
        subject,
        status: 'failed',
        errorMessage: `Network error: ${fetchError.message}`
      });
      
      return { 
        success: false, 
        error: `Network error: ${fetchError.message}` 
      };
    }
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Try to record the error
    try {
      await recordEmailNotification({
        guestId,
        eventId,
        bookingId,
        notificationType,
        to,
        subject,
        status: 'failed',
        errorMessage: error.message
      });
    } catch (recordError) {
      console.error('Failed to record email error:', recordError);
    }
    
    // Return an error object instead of throwing
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// Export the recordEmailNotification function
export async function recordEmailNotification({ guestId, eventId, bookingId, notificationType, to, subject, status = 'sent', statusId = null, errorMessage = null }) {
  try {
    console.log('Recording email notification:', { guestId, eventId, notificationType, status });
    
    const payload = {
      guestId,
      eventId,
      bookingId,
      notificationType,
      to,
      subject,
      status,
      statusId,
      errorMessage,
      sentAt: new Date().toISOString()
    };
    
    console.log('Email notification payload:', JSON.stringify(payload));
    
    const response = await fetch('/api/email-notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('Email notification API response status:', response.status);
    
    // We still want to log the notification even if it failed
    // So we don't throw an error here, just return the result
    if (response.ok) {
      const data = await response.json();
      console.log('Email notification recorded successfully:', data);
      return data;
    } else {
      let errorData;
      try {
        errorData = await response.json();
        console.error('Email notification API error response:', JSON.stringify(errorData));
      } catch (parseError) {
        const textResponse = await response.text();
        console.error('Failed to parse error response. Raw response:', textResponse);
        errorData = { message: 'Failed to parse error response', rawResponse: textResponse };
      }
      
      return { error: `API error: ${response.status}`, details: errorData };
    }
  } catch (error) {
    console.error('Error recording email notification:', error);
    // Don't throw the error, just log it
    return { error: error.message };
  }
}

export async function getLastEmailNotification(guestId, eventId) {
  try {
    if (!eventId) {
      console.error('getLastEmailNotification: eventId is required');
      return null;
    }
    
    const response = await fetch(`/api/email-notifications/last?guestId=${guestId === null ? 'null' : guestId}&eventId=${eventId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to fetch last email notification:', errorData);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching last email notification:', error);
    return null; // Return null instead of throwing to prevent app crashes
  }
}

export async function getGuestsWithChanges(eventId, lastEmailTime) {
  try {
    const response = await fetch(`/api/events/${eventId}/guests-with-changes?since=${lastEmailTime}`);
    if (!response.ok) throw new Error('Failed to fetch guests with changes');
    return await response.json();
  } catch (error) {
    console.error('Error fetching guests with changes:', error);
    throw error;
  }
} 