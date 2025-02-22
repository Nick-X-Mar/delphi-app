'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight, Pencil, Trash2, X, Minimize2, Maximize2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import AccommodationHotelList from './AccommodationHotelList';
import Pagination from './Pagination';
import { formatDate } from '@/utils/dateFormatters';

const AccommodationTable = React.forwardRef(({ eventId, filters }, ref) => {
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
      setIsLoading(true);
      const response = await fetch(`/api/events/${eventId}/hotels/bookings`);
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
  }, [eventId, pagination.currentPage]);

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

      // Calculate total cost based on selected dates and room price
      const totalCost = selection.roomType.price_per_night * 
        Math.ceil((selection.checkOut - selection.checkIn) / (1000 * 60 * 60 * 24));

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
        const date = new Date(booking.modification_date);
        text += ` on ${date.toLocaleDateString()}`;
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
                <TableCell>{hotel.total_bookings || 0} bookings</TableCell>
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
                        {roomType.name} - {roomType.active_bookings_count || 0} bookings
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
                                {booking.status !== 'cancelled' && (
                                  <>
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
      />
    </div>
  );
});

export default AccommodationTable; 