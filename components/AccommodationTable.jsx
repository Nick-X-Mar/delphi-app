'use client';
import React from 'react';
import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import AccommodationHotelList from './AccommodationHotelList';

export default function AccommodationTable({ eventId }) {
  const [expandedHotels, setExpandedHotels] = useState(new Set());
  const [expandedRoomTypes, setExpandedRoomTypes] = useState(new Set());
  const [hotels, setHotels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBooking, setEditingBooking] = useState(null);

  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    return new Date(date.getTime() + date.getTimezoneOffset() * 60000)
      .toLocaleDateString();
  };

  // Fetch hotels data with room types and bookings
  const fetchData = async () => {
    if (!eventId) {
      setHotels([]);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/events/${eventId}/hotels/bookings`);
      if (!response.ok) throw new Error('Failed to fetch hotels');
      const data = await response.json();
      setHotels(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching hotels:', error);
      toast.error('Failed to load hotels');
      setHotels([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchData();
  }, [eventId]);

  const handleEditBooking = (booking) => {
    setEditingBooking(booking);
  };

  const handleDeleteBooking = async (booking, hotelName, roomTypeName) => {
    const confirmMessage = `Are you sure you want to delete the booking for:\n\n` +
      `Guest: ${booking.first_name} ${booking.last_name}\n` +
      `Hotel: ${hotelName}\n` +
      `Room: ${roomTypeName}\n` +
      `Period: ${formatDisplayDate(booking.check_in_date)} - ${formatDisplayDate(booking.check_out_date)}`;

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
      fetchData(); // Refresh the data
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

      const response = await fetch(`/api/bookings/${editingBooking.booking_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomTypeId: selection.roomType.room_type_id,
          checkInDate: formatDate(selection.checkIn),
          checkOutDate: formatDate(selection.checkOut),
          totalCost: selection.roomType.price_per_night * 
            Math.ceil((selection.checkOut - selection.checkIn) / (1000 * 60 * 60 * 24))
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]"></TableHead>
          <TableHead>Guest</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Cost</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {hotels.map((hotel) => (
          <React.Fragment key={hotel.hotel_id}>
            <TableRow className="hover:bg-gray-100">
              <TableCell>
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
              <TableCell>{hotel.total_bookings || 0} bookings</TableCell>
              <TableCell className="text-right">-</TableCell>
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
                      {roomType.name} - {roomType.bookings?.length || 0} bookings
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
                            {booking.first_name} {booking.last_name}
                            <div className="text-sm text-gray-500">
                              {booking.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              Check-in: {formatDisplayDate(booking.check_in_date)}
                            </div>
                            <div className="text-sm">
                              Check-out: {formatDisplayDate(booking.check_out_date)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              €{booking.total_cost}
                            </div>
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
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
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteBooking(booking, hotel.name, roomType.name)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
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
  );
} 