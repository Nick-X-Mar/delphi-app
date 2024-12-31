'use client';

import * as React from "react";
import { useState, useEffect } from 'react';
import { 
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from '@/components/ui/table';
import { StarIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function AccommodationHotelList({ personId, onRoomSelection }) {
  const [hotels, setHotels] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dates, setDates] = useState([]);
  const [selection, setSelection] = useState({
    roomTypeId: null,
    dates: []
  });

  useEffect(() => {
    fetchActiveEvent();
  }, []);

  useEffect(() => {
    if (activeEvent) {
      fetchHotelsWithAvailability();
      generateDateRange();
    }
  }, [activeEvent]);

  // When we have two dates selected, validate and notify
  useEffect(() => {
    if (selection.dates.length === 2) {
      validateAndNotifySelection();
    }
  }, [selection.dates]);

  const generateDateRange = () => {
    const start = new Date(activeEvent.accommodation_start_date);
    const end = new Date(activeEvent.accommodation_end_date);
    const dateArray = [];
    let currentDate = start;

    while (currentDate <= end) {
      dateArray.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setDates(dateArray);
  };

  const handleCellClick = (roomType, date) => {
    // If clicking a different room type, reset selection
    if (selection.roomTypeId && selection.roomTypeId !== roomType.room_type_id) {
      setSelection({
        roomTypeId: roomType.room_type_id,
        dates: [date]
      });
      return;
    }

    // If this is the first selection for this room type
    if (!selection.roomTypeId) {
      setSelection({
        roomTypeId: roomType.room_type_id,
        dates: [date]
      });
      return;
    }

    // If this is the second selection
    if (selection.dates.length === 1) {
      setSelection(prev => ({
        ...prev,
        dates: [...prev.dates, date].sort((a, b) => a - b)
      }));
      return;
    }

    // If we already have two dates, start fresh
    setSelection({
      roomTypeId: roomType.room_type_id,
      dates: [date]
    });
  };

  const validateAndNotifySelection = () => {
    const [checkIn, checkOut] = selection.dates;
    const selectedHotel = hotels.find(h => 
      h.room_types.some(rt => rt.room_type_id === selection.roomTypeId)
    );
    const roomType = selectedHotel.room_types.find(rt => rt.room_type_id === selection.roomTypeId);

    if (!roomType) return;

    // Get all dates between check-in and check-out
    const dates = [];
    let currentDate = new Date(checkIn);
    while (currentDate <= checkOut) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Check availability for all dates
    const unavailableDates = dates.filter(date => {
      const availability = getAvailabilityForDate(roomType, date);
      return availability.available_rooms < 1;
    });

    if (unavailableDates.length > 0) {
      toast.error('Some dates in your selection are not available. Please select different dates.');
      setSelection({
        roomTypeId: null,
        dates: []
      });
      return;
    }

    // If all dates are available, notify success
    toast.success('Room is available for selected dates!');
    if (onRoomSelection) {
      onRoomSelection({
        roomTypeId: selection.roomTypeId,
        checkIn,
        checkOut,
        roomType: {
          ...roomType,
          hotel: {
            name: selectedHotel.name,
            stars: selectedHotel.stars,
            area: selectedHotel.area,
            category: selectedHotel.category
          }
        }
      });
    }
  };

  const isDateSelected = (roomTypeId, date) => {
    if (roomTypeId !== selection.roomTypeId) return false;
    return selection.dates.some(d => d.getTime() === date.getTime());
  };

  const isDateInRange = (roomTypeId, date) => {
    if (roomTypeId !== selection.roomTypeId || selection.dates.length !== 2) return false;
    const [start, end] = selection.dates;
    return date >= start && date <= end;
  };

  const fetchActiveEvent = async () => {
    try {
      const res = await fetch('/api/events/active');
      if (!res.ok) throw new Error('Failed to fetch active event');
      const data = await res.json();
      setActiveEvent(data);
    } catch (error) {
      console.error('Error fetching active event:', error);
      toast.error('Failed to load active event');
    }
  };

  const fetchHotelsWithAvailability = async () => {
    try {
      const res = await fetch(`/api/hotels/availability?startDate=${activeEvent.accommodation_start_date}&endDate=${activeEvent.accommodation_end_date}`);
      if (!res.ok) throw new Error('Failed to fetch hotels');
      const data = await res.json();
      setHotels(data);
    } catch (error) {
      console.error('Error fetching hotels:', error);
      toast.error('Failed to load hotels');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (count) => {
    return Array(count)
      .fill(null)
      .map((_, index) => (
        <StarIcon key={index} className="h-4 w-4 text-yellow-400 fill-current" />
      ));
  };

  const getAvailabilityForDate = (roomType, date) => {
    const dateStr = date.toISOString().split('T')[0];
    return roomType.availability?.find(a => a.date === dateStr) || {
      available_rooms: roomType.total_rooms,
      price_per_night: roomType.base_price_per_night
    };
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading hotels...</div>;
  }

  if (!activeEvent) {
    return <div className="text-center py-4">No active event found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium">Active Event: {activeEvent.name}</h3>
        <p className="text-sm text-gray-600">
          Accommodation Period: {new Date(activeEvent.accommodation_start_date).toLocaleDateString()} - {new Date(activeEvent.accommodation_end_date).toLocaleDateString()}
        </p>
        {selection.roomTypeId && (
          <p className="text-sm text-blue-600 mt-2">
            {selection.dates.length === 1 
              ? 'Select check-out date' 
              : selection.dates.length === 0 
                ? 'Select check-in date'
                : `Selected: ${selection.dates[0].toLocaleDateString()} - ${selection.dates[1].toLocaleDateString()}`
            }
          </p>
        )}
      </div>

      <div className="border rounded-lg overflow-x-auto relative">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="sticky left-0 bg-white z-20 border-r"
                style={{ minWidth: '200px' }}
              >
                Hotel
              </TableHead>
              <TableHead 
                className="sticky left-[200px] bg-white z-20 border-r"
                style={{ minWidth: '150px' }}
              >
                Room Type
              </TableHead>
              {dates.map(date => (
                <TableHead 
                  key={date.toISOString()} 
                  className="text-center min-w-[120px] z-10"
                >
                  {date.toLocaleDateString()}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {hotels.map((hotel) => (
              <React.Fragment key={hotel.hotel_id}>
                {hotel.room_types?.map((roomType, index) => (
                  <TableRow key={roomType.room_type_id}>
                    {index === 0 ? (
                      <TableCell 
                        rowSpan={hotel.room_types.length} 
                        className="sticky left-0 bg-white z-20 border-r"
                      >
                        <div>
                          <div className="font-medium">{hotel.name}</div>
                          <div className="flex items-center mt-1">
                            {renderStars(hotel.stars)}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">{hotel.area}</div>
                          <div className="mt-1">
                            <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              {hotel.category}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                    ) : null}
                    <TableCell 
                      className="sticky left-[200px] bg-white z-20 border-r"
                    >
                      <div className="font-medium">{roomType.name}</div>
                      <div className="text-sm text-gray-600">Base: €{roomType.base_price_per_night}</div>
                    </TableCell>
                    {dates.map(date => {
                      const availability = getAvailabilityForDate(roomType, date);
                      const isSelected = isDateSelected(roomType.room_type_id, date);
                      const isInRange = isDateInRange(roomType.room_type_id, date);
                      return (
                        <TableCell 
                          key={date.toISOString()} 
                          className={`text-center whitespace-nowrap cursor-pointer transition-colors
                            ${availability.available_rooms > 0 ? 'hover:bg-gray-50' : 'bg-gray-100 cursor-not-allowed'}
                            ${isSelected ? 'bg-blue-100 hover:bg-blue-200' : ''}
                            ${isInRange ? 'bg-blue-50' : ''}
                          `}
                          onClick={() => {
                            if (availability.available_rooms > 0) {
                              handleCellClick(roomType, date);
                            }
                          }}
                        >
                          <div className="font-medium">
                            {availability.available_rooms} rooms
                          </div>
                          <div className="text-sm text-gray-600">
                            €{availability.price_per_night}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 