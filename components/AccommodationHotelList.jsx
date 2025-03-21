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
import { Star, Search } from 'lucide-react';
import { toast } from 'sonner';
import { getHotelCategories, getHotelCategoryColor } from '@/lib/hotelCategories';
import { Input } from '@/components/ui/input';
import { formatDateForAPI } from '@/utils/dateFormatters';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Pagination from '@/components/Pagination';

export default function AccommodationHotelList({ eventId, personId, onRoomSelection }) {
  const [hotels, setHotels] = useState([]);
  const [filteredHotels, setFilteredHotels] = useState([]);
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dates, setDates] = useState([]);
  const [selection, setSelection] = useState({
    roomTypeId: null,
    dates: []
  });
  const [filters, setFilters] = useState({
    search: '',
    category: 'all'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (!res.ok) throw new Error('Failed to fetch event');
        const data = await res.json();
        setEvent(data);
      } catch (error) {
        console.error('Error fetching event:', error);
        toast.error('Failed to load event');
      }
    };

    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  useEffect(() => {
    if (event) {
      fetchHotelsWithAvailability();
      generateDateRange();
    }
  }, [event]);

  // When we have two dates selected, validate and notify
  useEffect(() => {
    if (selection.dates.length === 2) {
      validateAndNotifySelection();
    }
  }, [selection.dates]);

  useEffect(() => {
    // Apply filters and pagination
    let filtered = [...hotels];
    
    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(hotel => 
        hotel.name.toLowerCase().includes(searchTerm) ||
        hotel.area.toLowerCase().includes(searchTerm)
      );
    }

    // Apply category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(hotel => hotel.category === filters.category);
    }

    setFilteredHotels(filtered);
  }, [hotels, filters]);

  const generateDateRange = () => {
    const start = new Date(event.accommodation_start_date);
    const end = new Date(event.accommodation_end_date);
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
      // Prevent selecting the same date
      if (selection.dates[0].getTime() === date.getTime()) {
        return;
      }
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
      h.room_types?.some(rt => rt.room_type_id === selection.roomTypeId)
    );

    if (!selectedHotel || !selectedHotel.room_types) {
      toast.error('Selected room type not found');
      setSelection({
        roomTypeId: null,
        dates: []
      });
      return;
    }

    const roomType = selectedHotel.room_types.find(rt => rt.room_type_id === selection.roomTypeId);

    if (!roomType) {
      toast.error('Selected room type not found');
      setSelection({
        roomTypeId: null,
        dates: []
      });
      return;
    }

    // Get all dates between check-in and check-out (excluding checkout date)
    const dates = [];
    let currentDate = new Date(checkIn);
    // Only check availability up to the day before checkout
    while (currentDate < checkOut) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Check availability for all dates (excluding checkout date)
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
      // Get the price for the first selected date (or base price if not found)
      const firstDateAvailability = getAvailabilityForDate(roomType, checkIn);
      
      onRoomSelection({
        roomTypeId: selection.roomTypeId,
        checkIn,
        checkOut,
        roomType: {
          ...roomType,
          price_per_night: firstDateAvailability.price_per_night || roomType.base_price_per_night,
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

  const fetchHotelsWithAvailability = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/hotels`);
      if (!res.ok) throw new Error('Failed to fetch hotels');
      const data = await res.json();
      // Ensure data is an array
      setHotels(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching hotels:', error);
      toast.error('Failed to load hotels');
      setHotels([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (count) => {
    const stars = [];
    const fullStars = Math.floor(count);
    const hasHalfStar = count % 1 !== 0;

    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={`full-${i}`} className="h-4 w-4 text-yellow-400 fill-current" />
      );
    }

    // Add half star if needed
    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative" style={{ width: '1rem', height: '1rem' }}>
          <Star className="absolute h-4 w-4 text-yellow-400" />
          <div className="absolute overflow-hidden" style={{ width: '50%' }}>
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
          </div>
        </div>
      );
    }

    // Add remaining empty stars
    const remainingStars = 5 - Math.ceil(count);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />
      );
    }

    return stars;
  };

  const getAvailabilityForDate = (roomType, date) => {
    const dateStr = formatDateForAPI(date);
    return roomType.availability?.find(a => a.date === dateStr) || {
      available_rooms: roomType.total_rooms,
      price_per_night: roomType.base_price_per_night
    };
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Get paginated hotels
  const paginatedHotels = filteredHotels.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (isLoading) {
    return <div className="text-center py-4">Loading hotels...</div>;
  }

  if (!event) {
    return <div className="text-center py-4">No event found</div>;
  }

  if (hotels.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No hotels assigned to this event. Please assign hotels to the event first.
      </div>
    );
  }

  const categories = [
    { value: 'all', label: 'All Categories' },
    ...getHotelCategories()
  ];

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium">Event: {event.name}</h3>
        <p className="text-sm text-gray-600">
          Accommodation Period: {new Date(event.accommodation_start_date).toLocaleDateString()} - {new Date(event.accommodation_end_date).toLocaleDateString()}
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

      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1 block">
            Search Hotels
          </label>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search by name or location..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-8"
            />
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          </div>
        </div>
        <div className="w-[200px]">
          <label className="text-sm font-medium mb-1 block">
            Category
          </label>
          <Select
            value={filters.category}
            onValueChange={(value) => handleFilterChange('category', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg">
        <div className="max-h-[70vh] overflow-auto relative">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th 
                  className="sticky top-0 left-0 bg-white z-30 border-r p-4 text-left font-medium text-sm"
                  style={{ width: '200px', minWidth: '200px' }}
                >
                  Hotel
                </th>
                <th 
                  className="sticky top-0 left-[200px] bg-white z-30 border-r p-4 text-left font-medium text-sm"
                  style={{ width: '150px', minWidth: '150px' }}
                >
                  Room Type
                </th>
                {dates.map(date => (
                  <th 
                    key={date.toISOString()} 
                    className="sticky top-0 bg-white z-20 p-4 text-center font-medium text-sm"
                    style={{ width: '120px', minWidth: '120px' }}
                  >
                    {date.toLocaleDateString()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedHotels.map((hotel) => (
                <React.Fragment key={hotel.hotel_id}>
                  {hotel.room_types?.map((roomType, index) => (
                    <tr key={roomType.room_type_id} className="border-b">
                      {index === 0 ? (
                        <td 
                          rowSpan={hotel.room_types.length} 
                          className="sticky left-0 bg-white z-10 border-r p-4 align-top"
                          style={{ width: '200px', minWidth: '200px' }}
                        >
                          <div>
                            <div className="font-medium">{hotel.name}</div>
                            <div className="flex items-center mt-1">
                              {renderStars(hotel.stars)}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">{hotel.area}</div>
                            <div className="mt-1">
                              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getHotelCategoryColor(hotel.category)}`}>
                                {hotel.category}
                              </span>
                            </div>
                          </div>
                        </td>
                      ) : null}
                      <td 
                        className="sticky left-[200px] bg-white z-10 border-r p-4 align-top"
                        style={{ width: '150px', minWidth: '150px' }}
                      >
                        <div className="font-medium">{roomType.name}</div>
                        <div className="text-sm text-gray-600">Base: €{roomType.base_price_per_night}</div>
                      </td>
                      {dates.map(date => {
                        const availability = getAvailabilityForDate(roomType, date);
                        const isSelected = isDateSelected(roomType.room_type_id, date);
                        const isInRange = isDateInRange(roomType.room_type_id, date);
                        
                        const couldBeCheckoutDate = selection.dates.length === 1 && 
                          selection.roomTypeId === roomType.room_type_id && 
                          date > selection.dates[0];
                        
                        const bgClass = isSelected 
                          ? 'bg-blue-100 hover:bg-blue-200'
                          : isInRange 
                            ? 'bg-blue-50' 
                            : (availability.available_rooms > 0 || couldBeCheckoutDate)
                              ? 'hover:bg-gray-50'
                              : 'bg-gray-100';
                        
                        const cursorClass = (availability.available_rooms > 0 || couldBeCheckoutDate)
                          ? 'cursor-pointer'
                          : 'cursor-not-allowed';
                        
                        return (
                          <td 
                            key={date.toISOString()} 
                            className={`p-4 text-center whitespace-nowrap ${bgClass} ${cursorClass}`}
                            style={{ width: '120px', minWidth: '120px' }}
                            onClick={() => {
                              if (availability.available_rooms > 0 || couldBeCheckoutDate) {
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
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(filteredHotels.length / itemsPerPage)}
        onPageChange={setCurrentPage}
        totalItems={filteredHotels.length}
        itemsPerPage={itemsPerPage}
      />
    </div>
  );
} 