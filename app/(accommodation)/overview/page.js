'use client';

import * as React from "react";
import { useState, useEffect } from 'react';
import { Star, Search } from 'lucide-react';
import { toast } from 'sonner';
import { getHotelCategories, getHotelCategoryColor } from '@/lib/hotelCategories';
import { Input } from '@/components/ui/input';
import { formatDate, formatDateForAPI } from '@/utils/dateFormatters';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Pagination from '@/components/Pagination';

export default function OverviewPage() {
  const [hotels, setHotels] = useState([]);
  const [filteredHotels, setFilteredHotels] = useState([]);
  const [event, setEvent] = useState(null);
  const [eventId, setEventId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dates, setDates] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Read workingEventId from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('workingEventId');
    if (stored) setEventId(stored);
  }, []);

  // Listen for workingEventChanged
  useEffect(() => {
    const handleWorkingEventChange = () => {
      const workingEventId = localStorage.getItem('workingEventId');
      if (workingEventId) {
        setEventId(workingEventId);
      }
    };

    window.addEventListener('workingEventChanged', handleWorkingEventChange);
    return () => {
      window.removeEventListener('workingEventChanged', handleWorkingEventChange);
    };
  }, []);

  // Fetch event details when eventId changes
  useEffect(() => {
    if (!eventId) {
      setIsLoading(false);
      return;
    }

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

    fetchEvent();
  }, [eventId]);

  // Fetch hotels and generate date range when event loads
  useEffect(() => {
    if (!event) return;

    const fetchHotels = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/hotels`);
        if (!res.ok) throw new Error('Failed to fetch hotels');
        const data = await res.json();
        setHotels(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching hotels:', error);
        toast.error('Failed to load hotels');
        setHotels([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Generate date range
    const start = new Date(event.accommodation_start_date);
    const end = new Date(event.accommodation_end_date);
    const dateArray = [];
    let currentDate = new Date(start);
    while (currentDate <= end) {
      dateArray.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    setDates(dateArray);

    fetchHotels();
  }, [event, eventId]);

  // Apply filters
  useEffect(() => {
    let filtered = [...hotels];

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(hotel =>
        hotel.name.toLowerCase().includes(searchTerm) ||
        hotel.area.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.category !== 'all') {
      filtered = filtered.filter(hotel => hotel.category === filters.category);
    }

    setFilteredHotels(filtered.filter(h => h.room_types?.length > 0));
  }, [hotels, filters]);

  const getAvailabilityForDate = (roomType, date) => {
    const dateStr = formatDateForAPI(date);
    return roomType.availability?.find(a => a.date === dateStr) || {
      available_rooms: roomType.total_rooms,
      price_per_night: roomType.base_price_per_night
    };
  };

  const getHotelTotalForDate = (hotel, date) => {
    if (!hotel.room_types) return 0;
    return hotel.room_types.reduce((sum, rt) => {
      const availability = getAvailabilityForDate(rt, date);
      return sum + (availability.available_rooms || 0);
    }, 0);
  };

  const renderStars = (count) => {
    const stars = [];
    const fullStars = Math.floor(count);
    const hasHalfStar = count % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={`full-${i}`} className="h-4 w-4 text-yellow-400 fill-current" />
      );
    }

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

    const remainingStars = 5 - Math.ceil(count);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />
      );
    }

    return stars;
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const paginatedHotels = filteredHotels.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const categories = [
    { value: 'all', label: 'All Categories' },
    ...getHotelCategories()
  ];

  if (isLoading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  if (!eventId) {
    return (
      <div className="text-center py-8 text-gray-500">
        Please select a working event to view hotel availability.
      </div>
    );
  }

  if (!event) {
    return <div className="text-center py-4">Loading event...</div>;
  }

  if (hotels.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium">Event: {event.name}</h3>
          <p className="text-sm text-gray-600">
            Accommodation Period: {formatDate(event.accommodation_start_date)} - {formatDate(event.accommodation_end_date)}
          </p>
        </div>
        <div className="text-center py-4 text-gray-500">
          No hotels assigned to this event.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium">Event: {event.name}</h3>
        <p className="text-sm text-gray-600">
          Accommodation Period: {formatDate(event.accommodation_start_date)} - {formatDate(event.accommodation_end_date)}
        </p>
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
          <table className="w-full border-separate border-spacing-0">
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
                    {format(date, 'dd/MM/yyyy')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedHotels.map((hotel) => {
                const roomTypes = hotel.room_types;
                const showTotal = roomTypes.length > 1;
                const totalRows = roomTypes.length + (showTotal ? 1 : 0);

                return (
                  <React.Fragment key={hotel.hotel_id}>
                    {roomTypes.map((roomType, index) => (
                      <tr key={roomType.room_type_id} className="border-b">
                        {index === 0 && (
                          <td
                            rowSpan={totalRows}
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
                        )}
                        <td
                          className="sticky left-[200px] bg-white z-10 border-r p-4 align-top"
                          style={{ width: '150px', minWidth: '150px' }}
                        >
                          <div className="font-medium">{roomType.name}</div>
                        </td>
                        {dates.map(date => {
                          const availability = getAvailabilityForDate(roomType, date);
                          const available = availability.available_rooms;

                          return (
                            <td
                              key={date.toISOString()}
                              className={`p-4 text-center whitespace-nowrap bg-white ${available <= 0 ? 'text-gray-400' : ''}`}
                              style={{ width: '120px', minWidth: '120px' }}
                            >
                              {available}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {showTotal && (
                      <tr className="border-b bg-gray-50">
                        <td
                          className="sticky left-[200px] bg-gray-50 z-10 border-r p-4 font-semibold text-sm"
                          style={{ width: '150px', minWidth: '150px' }}
                        >
                          Avail. Rooms
                        </td>
                        {dates.map(date => (
                          <td
                            key={date.toISOString()}
                            className="p-4 text-center whitespace-nowrap bg-gray-50 font-semibold"
                            style={{ width: '120px', minWidth: '120px' }}
                          >
                            {getHotelTotalForDate(hotel, date)}
                          </td>
                        ))}
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
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
        onItemsPerPageChange={handleItemsPerPageChange}
      />
    </div>
  );
}
