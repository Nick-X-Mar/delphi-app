'use client';
import React from 'react';
import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function AccommodationTable() {
  const [expandedHotels, setExpandedHotels] = useState(new Set());
  const [expandedRoomTypes, setExpandedRoomTypes] = useState(new Set());
  const [hotels, setHotels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeEvent, setActiveEvent] = useState(null);

  // Fetch active event first
  const fetchActiveEvent = async () => {
    try {
      const response = await fetch('/api/events/active');
      if (!response.ok) throw new Error('Failed to fetch active event');
      const data = await response.json();
      setActiveEvent(data);
      return data;
    } catch (error) {
      console.error('Error fetching active event:', error);
      toast.error('Failed to load active event');
      return null;
    }
  };

  // Fetch hotels data with room types and bookings
  const fetchData = async (event) => {
    if (!event) return;
    
    try {
      const response = await fetch(
        `/api/hotels/availability?startDate=${event.accommodation_start_date}&endDate=${event.accommodation_end_date}`
      );
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
    const init = async () => {
      const event = await fetchActiveEvent();
      if (event) {
        await fetchData(event);
      } else {
        setIsLoading(false);
      }
    };
    init();
  }, []);

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

  const getAvailabilityForDate = (roomType, date) => {
    const dateStr = date.toISOString().split('T')[0];
    return roomType.availability?.find(a => a.date === dateStr) || {
      available_rooms: roomType.total_rooms,
      price_per_night: roomType.base_price_per_night
    };
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]"></TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead className="text-right">Price</TableHead>
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
              <TableCell>Hotel</TableCell>
              <TableCell>{hotel.category}</TableCell>
              <TableCell>-</TableCell>
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
                    <TableCell className="font-medium">{roomType.name}</TableCell>
                    <TableCell>Room Type</TableCell>
                    <TableCell>{roomType.availability_count} available</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="text-right">
                      ${roomType.price_per_night}/night
                    </TableCell>
                  </TableRow>
                  {expandedRoomTypes.has(roomType.room_type_id) &&
                    roomType.bookings?.map((booking) => (
                      <TableRow
                        key={booking.booking_id}
                        className="bg-gray-100 hover:bg-gray-200"
                      >
                        <TableCell className="pl-12"></TableCell>
                        <TableCell className="font-medium">
                          {booking.person.first_name} {booking.person.last_name}
                          <div className="text-sm text-gray-500">
                            Check-in: {new Date(booking.check_in_date).toLocaleDateString()}
                            <br />
                            Check-out: {new Date(booking.check_out_date).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>Booking</TableCell>
                        <TableCell>{booking.status}</TableCell>
                        <TableCell>
                          {new Date(booking.check_in_date).toLocaleDateString()} -{' '}
                          {new Date(booking.check_out_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ${booking.total_cost}
                        </TableCell>
                      </TableRow>
                    ))}
                </React.Fragment>
              ))}
          </React.Fragment>
        ))}
      </TableBody>
    </Table>
  );
} 