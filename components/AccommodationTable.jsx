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

  // Fetch hotels data with room types and bookings
  const fetchData = async () => {
    try {
      const response = await fetch('/api/hotels/bookings');
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
    fetchData();
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]"></TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Area</TableHead>
          <TableHead>Total Bookings</TableHead>
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
                      <TableRow
                        key={booking.booking_id}
                        className="bg-gray-100 hover:bg-gray-200"
                      >
                        <TableCell className="pl-12"></TableCell>
                        <TableCell className="font-medium" colSpan={4}>
                          {booking.first_name} {booking.last_name}
                          <div className="text-sm text-gray-500">
                            {booking.email}
                            <br />
                            Check-in: {new Date(booking.check_in_date).toLocaleDateString()}
                            <br />
                            Check-out: {new Date(booking.check_out_date).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          €{booking.total_cost}
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