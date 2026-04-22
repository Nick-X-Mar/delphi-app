'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight, Pencil, Trash2, X, Minimize2, Maximize2, FileText, Mail, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import AccommodationHotelList from './AccommodationHotelList';
import Pagination from '@/components/Pagination';
import { formatDate, formatDateTime } from '@/utils/dateFormatters';
import { sendEmail, getGuestsWithChanges, getLastEmailNotification, recordEmailNotification } from '@/lib/emailService';
import { emailQueue } from '@/lib/emailQueue';

const formatGuestAmount = (guestCost) => {
  const cost = parseFloat(guestCost);
  if (!cost || cost === 0) return 'COMPLIMENTARY';
  return `€${cost.toFixed(2)}`;
};

const AccommodationTable = React.forwardRef(({ eventId, filters, isViewOnly = false }, ref) => {
  const [expandedHotels, setExpandedHotels] = useState(new Set());
  const [expandedRoomTypes, setExpandedRoomTypes] = useState(new Set());
  const [hotels, setHotels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBooking, setEditingBooking] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
    totalPages: 0
  });
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [lastBulkEmailTime, setLastBulkEmailTime] = useState(null);

  const formatDisplayDate = (dateString) => {
    return formatDate(dateString);
  };

  // Fetch hotels data with room types and bookings
  const fetchData = async () => {
    if (!eventId) {
      setHotels([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      // Add hotel filters
      if (filters?.hotelSearch) {
        queryParams.append('search', filters.hotelSearch);
      }
      
      // Add people filters
      if (filters?.firstName) {
        queryParams.append('firstName', filters.firstName);
      }
      if (filters?.lastName) {
        queryParams.append('lastName', filters.lastName);
      }
      if (filters?.email) {
        queryParams.append('email', filters.email);
      }
      if (filters?.guestType && filters.guestType !== 'all') {
        queryParams.append('guestType', filters.guestType);
      }
      if (filters?.company && filters.company !== 'all') {
        queryParams.append('company', filters.company);
      }
      
      // Build URL with query parameters
      const url = `/api/events/${eventId}/hotels/bookings${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch hotels');
      const data = await response.json();
      const allHotels = Array.isArray(data) ? data : [];
      
      // Update total items count
      setPagination(prev => ({
        ...prev,
        totalItems: allHotels.length,
        totalPages: Math.ceil(allHotels.length / prev.itemsPerPage)
      }));

      // Apply pagination to hotels
      const start = (pagination.currentPage - 1) * pagination.itemsPerPage;
      const end = start + pagination.itemsPerPage;
      setHotels(allHotels.slice(start, end));
    } catch (error) {
      console.error('Error fetching hotels:', error);
      toast.error('Failed to load hotels');
      setHotels([]);
      setPagination(prev => ({
        ...prev,
        totalItems: 0,
        totalPages: 0
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Expose fetchData method through ref
  React.useImperativeHandle(ref, () => ({
    fetchData
  }));

  useEffect(() => {
    setIsLoading(true);
    fetchData();
  }, [eventId, pagination.currentPage, pagination.itemsPerPage, filters]);

  useEffect(() => {
    const fetchLastBulkEmailTime = async () => {
      if (!eventId) return;
      try {
        const lastNotification = await getLastEmailNotification(null, eventId);
        if (lastNotification) {
          setLastBulkEmailTime(lastNotification.sent_at);
        } else {
          console.log('No previous bulk email found for this event');
          setLastBulkEmailTime(null);
        }
      } catch (error) {
        console.error('Error fetching last bulk email time:', error);
        setLastBulkEmailTime(null);
      }
    };

    fetchLastBulkEmailTime();
  }, [eventId]);

  // Warn the user before unload/refresh/in-app navigation while a bulk email
  // send is in progress. Email sending currently runs client-side; leaving the
  // page kills the loop and remaining emails never go out.
  useEffect(() => {
    if (!isSendingEmail) return;

    const warningMessage = 'Emails are still being sent. If you leave this page, the remaining emails will NOT be sent.';

    // Covers refresh, tab close, external navigation
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = warningMessage;
      return e.returnValue;
    };

    // Covers in-app navigation (Next.js <Link> renders as <a> + client-side routing)
    const handleLinkClick = (e) => {
      const link = e.target.closest('a');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href) return;
      if (link.target === '_blank') return;
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (!window.confirm(`${warningMessage}\n\nAre you sure you want to leave this page?`)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Covers browser back/forward buttons
    const handlePopState = (e) => {
      if (!window.confirm(`${warningMessage}\n\nAre you sure you want to leave this page?`)) {
        window.history.pushState(null, '', window.location.href);
      }
    };
    // Push a history entry so popstate fires on back
    window.history.pushState(null, '', window.location.href);

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleLinkClick, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleLinkClick, true);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isSendingEmail]);

  // Filter hotels based on search and category
  const filteredHotels = useMemo(() => {
    return hotels.filter(hotel => {
      // Apply hotel search filter
      const searchMatch = !filters?.hotelSearch || 
        hotel.name.toLowerCase().includes(filters.hotelSearch.toLowerCase()) ||
        hotel.area.toLowerCase().includes(filters.hotelSearch.toLowerCase());

      // Apply hotel category filter
      const categoryMatch = !filters?.hotelCategory || 
        filters.hotelCategory === 'all' || 
        hotel.category === filters.hotelCategory;

      return searchMatch && categoryMatch;
    }).map(hotel => ({
      ...hotel,
      room_types: hotel.room_types?.map(roomType => ({
        ...roomType,
        bookings: roomType.bookings?.filter(booking => {
          // Apply people filters
          const firstNameMatch = !filters?.firstName || 
            booking.first_name.toLowerCase().includes(filters.firstName.toLowerCase());
          
          const lastNameMatch = !filters?.lastName || 
            booking.last_name.toLowerCase().includes(filters.lastName.toLowerCase());
          
          const emailMatch = !filters?.email || 
            booking.email.toLowerCase().includes(filters.email.toLowerCase());
          
          const guestTypeMatch = !filters?.guestType || 
            filters.guestType === 'all' ||
            booking.guest_type === filters.guestType;

          const companyMatch = !filters?.company || 
            filters.company === 'all' ||
            (booking.company && booking.company === filters.company);

          return firstNameMatch && lastNameMatch && emailMatch && guestTypeMatch && companyMatch;
        })
      }))
    }));
  }, [hotels, filters]);

  const handleEditBooking = (booking) => {
    setEditingBooking(booking);
  };

  const handleDeleteBooking = async (booking, hotelName, roomTypeName) => {
    const confirmMessage = `Are you sure you want to cancel the booking for:\n\n` +
      `Guest: ${booking.first_name} ${booking.last_name}\n` +
      `Hotel: ${hotelName}\n` +
      `Room: ${roomTypeName}\n` +
      `Period: ${formatDisplayDate(booking.check_in_date)} - ${formatDisplayDate(booking.check_out_date)}`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/bookings/${booking.booking_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'cancelled'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }

      toast.success('Booking cancelled successfully');
      fetchData(); // Refresh the data
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    }
  };

  const handlePermanentDelete = async (booking, hotelName, roomTypeName) => {
    const confirmMessage = `Are you sure you want to permanently delete this cancelled booking?\n\n` +
      `Guest: ${booking.first_name} ${booking.last_name}\n` +
      `Hotel: ${hotelName}\n` +
      `Room: ${roomTypeName}\n\n` +
      `This action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/bookings/${booking.booking_id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete booking');
      }

      toast.success('Booking deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error('Failed to delete booking');
    }
  };

  const handleRoomSelection = async (selection) => {
    if (!editingBooking) return;

    try {
      // Format dates to YYYY-MM-DD in local timezone
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Use pre-calculated total when available (sum of each night's price); otherwise nights × single rate
      const nights = Math.ceil((selection.checkOut - selection.checkIn) / (1000 * 60 * 60 * 24));
      const totalCost = selection.totalCost != null
        ? selection.totalCost
        : selection.roomType.price_per_night * nights;

      // Format original booking dates
      const originalCheckInDate = formatDate(new Date(editingBooking.check_in_date));
      const originalCheckOutDate = formatDate(new Date(editingBooking.check_out_date));

      const response = await fetch(`/api/bookings/${editingBooking.booking_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomTypeId: selection.roomType.room_type_id,
          checkInDate: formatDate(selection.checkIn),
          checkOutDate: formatDate(selection.checkOut),
          totalCost: totalCost,
          originalBooking: {
            roomTypeId: editingBooking.room_type_id,
            checkInDate: originalCheckInDate,
            checkOutDate: originalCheckOutDate
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update booking');
      }

      toast.success('Booking updated successfully');
      setEditingBooking(null);
      fetchData(); // Refresh the data
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error('Failed to update booking');
    }
  };

  const toggleHotel = (hotelId) => {
    setExpandedHotels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(hotelId)) {
        newSet.delete(hotelId);
      } else {
        newSet.add(hotelId);
      }
      return newSet;
    });
  };

  const toggleRoomType = (roomTypeId) => {
    setExpandedRoomTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roomTypeId)) {
        newSet.delete(roomTypeId);
      } else {
        newSet.add(roomTypeId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status, modificationType) => {
    // First check modification type
    if (modificationType === 'date_change') return 'text-blue-600';
    if (modificationType === 'room_change') return 'text-purple-600';
    
    // Then check main status
    switch (status) {
      case 'confirmed':
        return 'text-green-600';
      case 'cancelled':
        return 'text-red-600';
      case 'pending':
        return 'text-yellow-600';
      case 'invalidated':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = (booking) => {
    let text = booking.status.charAt(0).toUpperCase() + booking.status.slice(1);
    
    if (booking.modification_type) {
      const modificationTypes = {
        'date_change': 'Date Changed',
        'room_change': 'Room Changed',
        'cancelled': 'Cancelled'
      };
      
      const modText = modificationTypes[booking.modification_type];
      text = `${text} (${modText}`;
      
      if (booking.modification_date) {
        text += ` on ${formatDate(booking.modification_date)}`;
      }
      
      text += ')';
    }
    
    return text;
  };

  // Add function to check if any hotel is expanded
  const hasExpandedItems = () => {
    return expandedHotels.size > 0;
  };

  // Add function to toggle all expansions
  const toggleAllExpansions = () => {
    if (hasExpandedItems()) {
      // If any hotel is expanded, collapse everything
      setExpandedHotels(new Set());
      setExpandedRoomTypes(new Set());
    } else {
      // If all hotels are collapsed, expand everything
      const allHotelIds = new Set(hotels.map(h => h.hotel_id));
      const allRoomTypeIds = new Set(
        hotels.flatMap(h => h.room_types?.map(rt => rt.room_type_id) || [])
      );
      setExpandedHotels(allHotelIds);
      setExpandedRoomTypes(allRoomTypeIds);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      currentPage: newPage
    }));
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setPagination(prev => ({
      ...prev,
      itemsPerPage: newItemsPerPage,
      currentPage: 1 // Reset to first page when page size changes
    }));
  };

  const handleSendEmail = async (booking, hotelName, roomTypeName, hotel) => {
    try {
      if (!booking.email) {
        toast.warning(`Cannot send email: ${booking.first_name} ${booking.last_name} has no email address`);
        return;
      }

      // Add confirmation dialog
      const confirmMessage = `Are you sure you want to send a booking confirmation email to ${booking.first_name} ${booking.last_name} (${booking.email})?\n\n` +
        `Hotel: ${hotelName}\n` +
        `Room Type: ${roomTypeName}`;

      if (!confirm(confirmMessage)) return;
      
      setIsSendingEmail(true);
      
      // Format dates for email
      const formattedCheckinDate = booking.check_in_date ? formatDate(booking.check_in_date) : '';
      const formattedCheckoutDate = booking.check_out_date ? formatDate(booking.check_out_date) : '';
      
      console.log('Hotel data:', hotel);
      console.log('Booking data:', booking);
      
      const result = await sendEmail({
        to: booking.email,
        subject: 'Your Hotel Booking Confirmation',
        eventId,
        guestId: booking.person_id,
        bookingId: booking.booking_id,
        notificationType: 'INDIVIDUAL',
        lastName: booking.last_name,
        salutation: booking.salutation || '',
        hotel_name: hotelName,
        hotel_address: hotel?.address || '',
        contact_information: hotel?.phone_number || hotel?.phone || '',
        hotel_website: hotel?.website_link || hotel?.website || '',
        checkin_date: formattedCheckinDate,
        checkout_date: formattedCheckoutDate,
        company: booking.company || '',
        guest_amount: formatGuestAmount(booking.guest_cost),
        room_type: booking.room_type || '',
        companion_full_name: booking.room_type === 'single' ? 'None' : (booking.companion_full_name || '')
      });

      if (result.success) {
        toast.success('Email sent successfully');
      } else {
        console.error('Error sending email:', result.error);
        toast.error(`Failed to send email: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendBulkEmails = async () => {
    try {
      setIsSendingEmail(true);

      // Fetch ALL bookings for this event, not just the ones on the current page
      const response = await fetch(`/api/events/${eventId}/all-bookings`);
      if (!response.ok) throw new Error('Failed to fetch all bookings');
      const { bookings } = await response.json();
      
      if (!bookings || bookings.length === 0) {
        toast.info('No active bookings found');
        setIsSendingEmail(false);
        return;
      }
      
      // Count emails to send and prepare booking data
      let emailsToSend = [];
      let pendingBookings = [];

      // Process all bookings
      for (const booking of bookings) {
        // Include both confirmed and pending bookings
        if (booking.status === 'confirmed' || booking.status === 'pending') {
          // Format dates for email
          const formattedCheckinDate = booking.check_in_date ? formatDate(booking.check_in_date) : '';
          const formattedCheckoutDate = booking.check_out_date ? formatDate(booking.check_out_date) : '';
          
          emailsToSend.push({
            to: booking.email,
            subject: 'Your Hotel Booking Confirmation',
            eventId,
            guestId: booking.person_id,
            bookingId: booking.booking_id,
            notificationType: 'BULK',
            lastName: booking.last_name,
            salutation: booking.salutation || '',
            hotel_name: booking.hotel_name,
            hotel_address: booking.hotel_address || '',
            contact_information: booking.contact_information || '',
            hotel_website: booking.hotel_website || '',
            checkin_date: formattedCheckinDate,
            checkout_date: formattedCheckoutDate,
            company: booking.company || '',
            guest_amount: formatGuestAmount(booking.guest_cost),
            room_type: booking.room_type || '',
            companion_full_name: booking.room_type === 'single' ? 'None' : (booking.companion_full_name || '')
          });

          // Track pending bookings to update later
          if (booking.status === 'pending') {
            pendingBookings.push(booking);
          }
        }
      }

      // Filter out guests without email (they cannot receive emails or be confirmed)
      const noEmailCount = emailsToSend.filter(e => !e.to).length;
      const noEmailBookingIds = new Set(emailsToSend.filter(e => !e.to).map(e => e.bookingId));
      emailsToSend = emailsToSend.filter(e => e.to);
      pendingBookings = pendingBookings.filter(b => !noEmailBookingIds.has(b.booking_id));

      if (emailsToSend.length === 0) {
        toast.warning('No guests have email addresses. Cannot send any emails.');
        setIsSendingEmail(false);
        return;
      }

      // Add confirmation dialog
      const noEmailWarning = noEmailCount > 0 ? `\n\n⚠️ ${noEmailCount} guest(s) will be skipped (no email address).` : '';
      const confirmMessage = `Are you sure you want to send booking confirmation emails to ALL guests?\n\n` +
        `This will send ${emailsToSend.length} email(s).\n` +
        `${pendingBookings.length} pending booking(s) will be updated to confirmed status.${noEmailWarning}`;

      if (!confirm(confirmMessage)) {
        setIsSendingEmail(false);
        return;
      }

      // Set up progress tracking
      const progressToast = toast.loading(`Sending 0/${emailsToSend.length} emails...`);
      
      // Add to queue and process
      emailQueue
        .clear()
        .addBulkToQueue(emailsToSend)
        .onProgress(progress => {
          toast.loading(
            `Sending emails: ${progress.sent}/${progress.total} (${progress.percentComplete}%)`, 
            { id: progressToast }
          );
        })
        .onComplete(async result => {
          toast.dismiss(progressToast);
          
          // Update pending bookings to confirmed status
          for (const booking of pendingBookings) {
            try {
              await fetch(`/api/bookings/${booking.booking_id}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  status: 'confirmed'
                }),
              });
            } catch (updateError) {
              console.error('Error updating booking status:', updateError);
            }
          }
          
          // Record a new bulk email notification to update the reference point
          if (result.sent > 0) {
            try {
              await recordEmailNotification({
                guestId: null, // null for bulk emails
                eventId,
                bookingId: null,
                notificationType: 'BULK',
                to: 'multiple-recipients',
                subject: 'Bulk Confirmation Email',
                status: 'sent',
                statusId: null,
                errorMessage: null
              });
              
              // Refresh the last bulk email time
              const lastNotification = await getLastEmailNotification(null, eventId);
              if (lastNotification) {
                setLastBulkEmailTime(lastNotification.sent_at);
              }
            } catch (recordError) {
              console.error('Error recording bulk email notification:', recordError);
            }
          }
          
          if (result.failed > 0) {
            toast.warning(`Sent ${result.sent} emails, ${result.failed} failed`);
          } else {
            toast.success(`Successfully sent ${result.sent} emails`);
          }
          setIsSendingEmail(false);
        })
        .process();
      
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      toast.error('Failed to send bulk emails');
      setIsSendingEmail(false);
    }
  };

  const handleSendEmailsForChanges = async () => {
    if (!lastBulkEmailTime) {
      toast.error('No previous bulk email found to compare changes against');
      return;
    }

    try {
      setIsSendingEmail(true);
      
      // Fetch ALL guests with changes directly from the API
      const { guests } = await getGuestsWithChanges(eventId, lastBulkEmailTime);
      
      if (!guests || guests.length === 0) {
        toast.info('No booking changes found since last bulk email');
        setIsSendingEmail(false);
        return;
      }

      // Check for guests without email
      const guestsWithEmail = guests.filter(g => g.email);
      const noEmailCount = guests.length - guestsWithEmail.length;

      if (guestsWithEmail.length === 0) {
        toast.warning('No guests with changes have email addresses. Cannot send any emails.');
        setIsSendingEmail(false);
        return;
      }

      // Add confirmation dialog
      const noEmailWarning = noEmailCount > 0 ? `\n\n⚠️ ${noEmailCount} guest(s) will be skipped (no email address).` : '';
      const confirmMessage = `Are you sure you want to send booking update emails to guests with changes?\n\n` +
        `This will send ${guestsWithEmail.length} email(s) for bookings that have changed since the last bulk email.\n` +
        `Pending bookings will be updated to confirmed status.${noEmailWarning}`;

      if (!confirm(confirmMessage)) {
        setIsSendingEmail(false);
        return;
      }

      // Fetch hotel details for all hotels in this event to ensure we have complete information
      const hotelsResponse = await fetch(`/api/events/${eventId}/hotels`);
      if (!hotelsResponse.ok) throw new Error('Failed to fetch hotels');
      const allHotels = await hotelsResponse.json();
      
      // Create a map for quick hotel lookup
      const hotelMap = new Map();
      allHotels.forEach(hotel => {
        hotelMap.set(hotel.hotel_id, hotel);
      });

      // Prepare all emails (only for guests with email)
      const emailsToSend = [];
      for (const guest of guestsWithEmail) {
        // Find hotel details using the hotel_id from the guest data
        const hotel = hotelMap.get(guest.hotel_id) || {};
        
        // Format dates for email
        const formattedCheckinDate = guest.check_in_date ? formatDate(guest.check_in_date) : '';
        const formattedCheckoutDate = guest.check_out_date ? formatDate(guest.check_out_date) : '';
        
        emailsToSend.push({
          to: guest.email,
          subject: 'Your Hotel Booking Update',
          eventId,
          guestId: guest.person_id,
          bookingId: guest.booking_id,
          notificationType: 'CHANGES',
          lastName: guest.last_name,
          salutation: guest.salutation || '',
          hotel_name: hotel.name || guest.hotel_name || '',
          hotel_address: hotel.address || '',
          contact_information: hotel.phone_number || hotel.phone || '',
          hotel_website: hotel.website_link || hotel.website || '',
          checkin_date: formattedCheckinDate,
          checkout_date: formattedCheckoutDate,
          company: guest.company || '',
          guest_amount: formatGuestAmount(guest.guest_cost),
          room_type: guest.room_type || '',
          companion_full_name: guest.room_type === 'single' ? 'None' : (guest.companion_full_name || '')
        });
      }

      // Set up progress tracking
      const progressToast = toast.loading(`Sending 0/${emailsToSend.length} update emails...`);
      
      // Add to queue and process
      emailQueue
        .clear()
        .addBulkToQueue(emailsToSend)
        .onProgress(progress => {
          toast.loading(
            `Sending updates: ${progress.sent}/${progress.total} (${progress.percentComplete}%)`, 
            { id: progressToast }
          );
        })
        .onComplete(async result => {
          toast.dismiss(progressToast);
          
          // Update any pending bookings to confirmed (only those who received email)
          for (const guest of guestsWithEmail) {
            if (guest.status === 'pending') {
              try {
                await fetch(`/api/bookings/${guest.booking_id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    status: 'confirmed'
                  }),
                });
              } catch (updateError) {
                console.error('Error updating booking status:', updateError);
              }
            }
          }
          
          // Record a new bulk email notification to update the reference point
          if (result.sent > 0) {
            try {
              await recordEmailNotification({
                guestId: null, // null for bulk emails
                eventId,
                bookingId: null,
                notificationType: 'BULK',
                to: 'multiple-recipients',
                subject: 'Bulk Update Email',
                status: 'sent',
                statusId: null,
                errorMessage: null
              });
              
              // Refresh the last bulk email time
              const lastNotification = await getLastEmailNotification(null, eventId);
              if (lastNotification) {
                setLastBulkEmailTime(lastNotification.sent_at);
              }
            } catch (recordError) {
              console.error('Error recording bulk email notification:', recordError);
            }
          }
          
          if (result.failed > 0) {
            toast.warning(`Sent ${result.sent} updates, ${result.failed} failed`);
          } else {
            toast.success(`Successfully sent ${result.sent} update emails`);
          }
          setIsSendingEmail(false);
        })
        .process();
      
    } catch (error) {
      console.error('Error sending update emails:', error);
      toast.error('Failed to send update emails');
      setIsSendingEmail(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  if (!eventId) {
    return (
      <div className="text-center py-4 text-gray-500">
        Please select an event to view accommodations.
      </div>
    );
  }

  if (hotels.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No accommodations found for this event.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-4 mb-4">
        <Button
          onClick={handleSendEmailsForChanges}
          disabled={isSendingEmail || !hotels.length || !lastBulkEmailTime || isViewOnly}
          className="flex items-center gap-2"
        >
          <Mail className="h-4 w-4" />
          {isSendingEmail ? 'Sending Updates...' : 'Send Updates Since Last Bulk Email'}
        </Button>
        <Button
          onClick={handleSendBulkEmails}
          disabled={isSendingEmail || !hotels.length || isViewOnly}
          className="flex items-center gap-2"
        >
          <Mail className="h-4 w-4" />
          {isSendingEmail ? 'Sending Emails...' : 'Send Emails to All Guests'}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8 p-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAllExpansions}
                className="h-8 w-8 p-0"
              >
                {hasExpandedItems() ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </TableHead>
            <TableHead>Hotel</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Bookings</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredHotels.map((hotel) => (
            <React.Fragment key={hotel.hotel_id}>
              <TableRow className="hover:bg-gray-100">
                <TableCell className="p-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleHotel(hotel.hotel_id)}
                  >
                    {expandedHotels.has(hotel.hotel_id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="font-medium">{hotel.name}</TableCell>
                <TableCell>{hotel.category}</TableCell>
                <TableCell>{hotel.area}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {hotel.total_bookings || 0} bookings
                    {(() => {
                      const noEmailCount = hotel.room_types?.reduce((count, rt) =>
                        count + (rt.bookings?.filter(b => !b.email && b.status !== 'cancelled').length || 0), 0) || 0;
                      return noEmailCount > 0 ? (
                        <span title={`${noEmailCount} guest${noEmailCount > 1 ? 's' : ''} without email`}>
                          <AlertTriangle className="h-4 w-4 text-amber-500 inline" />
                          <span className="text-xs text-amber-600 ml-0.5">{noEmailCount}</span>
                        </span>
                      ) : null;
                    })()}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`/accommodation/${hotel.hotel_id}/room-list`, '_blank')}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
              {expandedHotels.has(hotel.hotel_id) &&
                hotel.room_types?.map((roomType) => (
                  <React.Fragment key={roomType.room_type_id}>
                    <TableRow className="bg-gray-50 hover:bg-gray-100">
                      <TableCell className="pl-8">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRoomType(roomType.room_type_id)}
                        >
                          {expandedRoomTypes.has(roomType.room_type_id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium" colSpan={4}>
                        <div className="flex items-center gap-2">
                          {roomType.name} - {roomType.active_bookings_count || 0} bookings
                          {(() => {
                            const noEmailCount = roomType.bookings?.filter(b => !b.email && b.status !== 'cancelled').length || 0;
                            return noEmailCount > 0 ? (
                              <span title={`${noEmailCount} guest${noEmailCount > 1 ? 's' : ''} without email`}>
                                <AlertTriangle className="h-4 w-4 text-amber-500 inline" />
                                <span className="text-xs text-amber-600 ml-0.5">{noEmailCount}</span>
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        €{roomType.base_price_per_night}/night
                      </TableCell>
                    </TableRow>
                    {expandedRoomTypes.has(roomType.room_type_id) &&
                      roomType.bookings?.map((booking) => (
                        <React.Fragment key={booking.booking_id}>
                          <TableRow className="bg-gray-100 hover:bg-gray-200">
                            <TableCell className="pl-12"></TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-1">
                                {booking.first_name} {booking.last_name}
                                {!booking.email && (
                                  <span title="No email address">
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {booking.email || <span className="text-amber-500 italic">No email</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                Check-in: {formatDate(booking.check_in_date)}
                              </div>
                              <div className="text-sm">
                                Check-out: {formatDate(booking.check_out_date)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                €{booking.total_cost}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`text-sm ${getStatusColor(booking.status, booking.modification_type)}`}>
                                {getStatusText(booking)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {booking.status === 'cancelled' ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePermanentDelete(booking, hotel.name, roomType.name)}
                                    disabled={isViewOnly}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleSendEmail(booking, hotel.name, roomType.name, hotel)}
                                      disabled={isSendingEmail || isViewOnly || !booking.email}
                                      title={!booking.email ? 'No email address' : 'Send email'}
                                    >
                                      <Mail className={`h-4 w-4 ${!booking.email ? 'text-gray-300' : ''}`} />
                                    </Button>
                                    {editingBooking?.booking_id === booking.booking_id ? (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingBooking(null)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditBooking(booking)}
                                        disabled={isViewOnly}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteBooking(booking, hotel.name, roomType.name)}
                                      disabled={isViewOnly}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {editingBooking?.booking_id === booking.booking_id && (
                            <TableRow>
                              <TableCell colSpan={6} className="p-0">
                                <div className="border-t border-b border-gray-200 bg-gray-50 p-4">
                                  <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-medium">Edit Booking</h3>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditingBooking(null)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <AccommodationHotelList
                                    eventId={eventId}
                                    personId={editingBooking.person_id}
                                    onRoomSelection={handleRoomSelection}
                                  />
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                  </React.Fragment>
                ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>

      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={handlePageChange}
        totalItems={pagination.totalItems}
        itemsPerPage={pagination.itemsPerPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
});

export default AccommodationTable; 