'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { formatDateForAPI } from '@/utils/dateFormatters';

export default function RoomAvailabilityCalendar({ 
  hotelId, 
  roomTypeId, 
  basePrice = 0, 
  totalRooms = 0,
  eventStartDate,
  eventEndDate,
  isViewOnly = false
}) {
  // Convert string IDs to numbers
  const numericHotelId = parseInt(hotelId);
  const numericRoomTypeId = parseInt(roomTypeId);
  
  console.log('Props received:', { 
    hotelId: numericHotelId, 
    roomTypeId: numericRoomTypeId, 
    basePrice, 
    totalRooms,
    eventStartDate,
    eventEndDate
  });
  
  const [availability, setAvailability] = useState({});
  const [pendingChanges, setPendingChanges] = useState({});
  const [dates, setDates] = useState([]);
  const [roomData, setRoomData] = useState({ totalRooms, basePrice, baseSinglePrice: null });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (eventStartDate && eventEndDate) {
      generateDates();
      fetchRoomTypeData();
    }
  }, [eventStartDate, eventEndDate]);

  const generateDates = () => {
    const dateArray = [];
    const startDate = new Date(eventStartDate);
    const endDate = new Date(eventEndDate);
    
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dateArray.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    setDates(dateArray);
  };

  const formatDate = (date) => {
    return formatDateForAPI(date);
  };

  const fetchRoomTypeData = async () => {
    try {
      // Fetch room type data which includes availability
      const roomTypeRes = await fetch(`/api/hotels/${numericHotelId}/room-types/${numericRoomTypeId}`);
      if (!roomTypeRes.ok) throw new Error('Failed to fetch room type data');
      const roomTypeData = await roomTypeRes.json();
      
      console.log('Room Type Data:', roomTypeData);
      
      // Update room data from room type response
      setRoomData({
        totalRooms: roomTypeData.total_rooms,
        basePrice: parseFloat(roomTypeData.base_price_per_night),
        baseSinglePrice: roomTypeData.single_price_per_night != null ? parseFloat(roomTypeData.single_price_per_night) : null
      });

      // Map the availability array to an object with dates as keys
      const availabilityMap = {};
      
      if (roomTypeData.availability && Array.isArray(roomTypeData.availability)) {
        roomTypeData.availability.forEach(item => {
          availabilityMap[item.date] = {
            available_rooms: item.available_rooms,
            price_per_night: parseFloat(item.price_per_night),
            single_price_per_night: item.single_price_per_night != null ? parseFloat(item.single_price_per_night) : null
          };
        });
      }
      
      setAvailability(availabilityMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    }
  };

  const handleInputChange = (date, field, value) => {
    // Prevent changes to past dates or in view-only mode
    if (isPastDate(date) || isViewOnly) {
      return;
    }

    const formattedDate = formatDate(date);
    let newValue;
    if (field === 'available_rooms') {
      newValue = parseInt(value);
    } else if (field === 'single_price_per_night' && (value === '' || value === null)) {
      newValue = null;
    } else {
      newValue = parseFloat(value);
    }
    
    // Validate available rooms
    if (field === 'available_rooms') {
      if (newValue > roomData.totalRooms) {
        toast.error(`Cannot exceed total rooms (${roomData.totalRooms})`);
        return;
      }
      if (newValue < 0) {
        toast.error('Available rooms cannot be negative');
        return;
      }
    }

    setPendingChanges(prev => ({
      ...prev,
      [formattedDate]: {
        ...prev[formattedDate],
        [field]: newValue
      }
    }));
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      // Convert pending changes to array of updates
      const updates = Object.entries(pendingChanges).map(([date, values]) => {
        const currentAvailability = getAvailabilityForDate(new Date(date));
        const singlePrice = values.single_price_per_night !== undefined
          ? values.single_price_per_night
          : currentAvailability.single_price_per_night;
        return {
          date,
          available_rooms: parseInt(values.available_rooms ?? currentAvailability.available_rooms),
          price_per_night: parseFloat(values.price_per_night ?? currentAvailability.price_per_night),
          single_price_per_night: singlePrice != null ? parseFloat(singlePrice) : null
        };
      });

      console.log('Sending updates:', updates);

      // Send all updates in a single request
      const res = await fetch(`/api/hotels/${numericHotelId}/room-types/${numericRoomTypeId}/availability/batch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      if (!res.ok) {
        const responseText = await res.text();
        throw new Error(`Server responded with ${res.status}: ${responseText}`);
      }

      // Recalculate booking costs
      const recalculateRes = await fetch(`/api/hotels/${numericHotelId}/room-types/${numericRoomTypeId}/recalculate-bookings`, {
        method: 'POST'
      });

      if (!recalculateRes.ok) {
        throw new Error('Failed to recalculate booking costs');
      }

      const recalculateData = await recalculateRes.json();
      
      // Clear pending changes first
      setPendingChanges({});
      
      // Fetch fresh data
      await fetchRoomTypeData();
      
      toast.success(`Changes saved successfully. Updated ${recalculateData.updatedBookings} booking(s).`);
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error(error.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const getAvailabilityForDate = (date) => {
    const formattedDate = formatDate(date);
    const availabilityForDate = availability[formattedDate];
    const pendingForDate = pendingChanges[formattedDate];
    
    if (!availabilityForDate && !pendingForDate) {
      return {
        available_rooms: roomData.totalRooms,
        price_per_night: roomData.basePrice,
        single_price_per_night: roomData.baseSinglePrice
      };
    }
    
    const pendingSingle = pendingForDate?.single_price_per_night;
    const availSingle = availabilityForDate?.single_price_per_night;
    const singlePrice = pendingSingle !== undefined ? pendingSingle : (availSingle !== undefined ? availSingle : roomData.baseSinglePrice);

    return {
      available_rooms: pendingForDate?.available_rooms ?? availabilityForDate?.available_rooms ?? roomData.totalRooms,
      price_per_night: pendingForDate?.price_per_night ?? availabilityForDate?.price_per_night ?? roomData.basePrice,
      single_price_per_night: singlePrice
    };
  };

  const isPastDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        {hasPendingChanges && !isViewOnly && (
          <Button 
            onClick={saveChanges} 
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {dates.map((date) => {
          const dayAvailability = getAvailabilityForDate(date);
          const isPast = isPastDate(date);
          const formattedDate = formatDate(date);
          const hasChanges = !!pendingChanges[formattedDate];
          
          return (
            <div 
              key={date.toISOString()}
              className={cn(
                "p-3 border rounded-lg space-y-2",
                isPast ? "bg-gray-100" : "hover:border-gray-400",
                hasChanges && "border-blue-500"
              )}
            >
              <div className="text-sm font-medium text-center">
                {date.toLocaleDateString('en-GB', { 
                  day: 'numeric',
                  month: 'short'
                })}
              </div>
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-gray-500">Rooms:</div>
                  <Input
                    type="number"
                    min="0"
                    max={roomData.totalRooms}
                    value={dayAvailability.available_rooms}
                    onChange={(e) => handleInputChange(date, 'available_rooms', e.target.value)}
                    className="h-8 text-sm"
                    disabled={isPast || isViewOnly}
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Price:</div>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={Number(dayAvailability.price_per_night).toFixed(2)}
                    onChange={(e) => handleInputChange(date, 'price_per_night', e.target.value)}
                    className="h-8 text-sm"
                    disabled={isPast || isViewOnly}
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Single:</div>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={dayAvailability.single_price_per_night != null ? Number(dayAvailability.single_price_per_night).toFixed(2) : ''}
                    onChange={(e) => handleInputChange(date, 'single_price_per_night', e.target.value === '' ? null : e.target.value)}
                    className="h-8 text-sm"
                    placeholder="-"
                    disabled={isPast || isViewOnly}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 