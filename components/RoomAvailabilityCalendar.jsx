'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

export default function RoomAvailabilityCalendar({ 
  hotelId, 
  roomTypeId, 
  basePrice = 0, 
  totalRooms = 0,
  eventStartDate,
  eventEndDate 
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
  const [roomData, setRoomData] = useState({ totalRooms, basePrice });
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
    return date.toISOString().split('T')[0];
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
        basePrice: parseFloat(roomTypeData.base_price_per_night)
      });

      // Map the availability array to an object with dates as keys
      const availabilityMap = {};
      
      if (roomTypeData.availability && Array.isArray(roomTypeData.availability)) {
        roomTypeData.availability.forEach(item => {
          availabilityMap[item.date] = {
            available_rooms: item.available_rooms,
            price_per_night: parseFloat(item.price_per_night)
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
    const formattedDate = formatDate(date);
    let newValue = field === 'available_rooms' ? parseInt(value) : parseFloat(value);
    
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
        return {
          date,
          available_rooms: parseInt(values.available_rooms ?? currentAvailability.available_rooms),
          price_per_night: parseFloat(values.price_per_night ?? currentAvailability.price_per_night)
        };
      });

      console.log('Sending updates:', updates);

      // Send all updates in a single request
      const res = await fetch(`/api/hotels/${numericHotelId}/room-types/${numericRoomTypeId}/availability/batch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      console.log('Response status:', res.status);
      const responseText = await res.text();
      console.log('Response text:', responseText);

      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}: ${responseText}`);
      }

      // Clear pending changes first
      setPendingChanges({});
      
      // Fetch fresh data
      await fetchRoomTypeData();
      
      toast.success('All changes saved successfully');
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
        price_per_night: roomData.basePrice
      };
    }
    
    // First check pending changes, then fall back to availability, then defaults
    return {
      available_rooms: pendingForDate?.available_rooms ?? availabilityForDate?.available_rooms ?? roomData.totalRooms,
      price_per_night: pendingForDate?.price_per_night ?? availabilityForDate?.price_per_night ?? roomData.basePrice
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
        {hasPendingChanges && (
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
                isPast ? "bg-gray-50" : "hover:border-gray-400",
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
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-500">Price:</div>
                  <Input
                    type="number"
                    min="0"
                    step="1.00"
                    value={dayAvailability.price_per_night}
                    onChange={(e) => handleInputChange(date, 'price_per_night', e.target.value)}
                    className="h-8 text-sm"
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