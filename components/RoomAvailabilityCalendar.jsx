'use client';

import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function RoomAvailabilityCalendar({ hotelId, roomTypeId, basePrice }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [availability, setAvailability] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState({
    available_rooms: '',
    price_per_night: ''
  });

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    try {
      const res = await fetch(`/api/hotels/${hotelId}/room-types/${roomTypeId}/availability`);
      if (!res.ok) throw new Error('Failed to fetch availability');
      const data = await res.json();
      
      // Convert array to object for easier lookup
      const availabilityMap = {};
      data.forEach(item => {
        availabilityMap[item.date] = {
          available_rooms: item.available_rooms,
          price_per_night: item.price_per_night || basePrice
        };
      });
      setAvailability(availabilityMap);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Failed to fetch availability');
    }
  };

  const handleDayClick = (date) => {
    const formattedDate = date.toISOString().split('T')[0];
    setSelectedDate(formattedDate);
    
    const dayAvailability = availability[formattedDate] || {};
    setEditValues({
      available_rooms: dayAvailability.available_rooms || '',
      price_per_night: dayAvailability.price_per_night || basePrice || ''
    });
    
    setEditMode(true);
  };

  const handleDayUpdate = async () => {
    if (!selectedDate) return;

    try {
      const res = await fetch(`/api/hotels/${hotelId}/room-types/${roomTypeId}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          available_rooms: parseInt(editValues.available_rooms),
          price_per_night: editValues.price_per_night || basePrice
        })
      });

      if (!res.ok) throw new Error('Failed to update availability');

      const updatedDay = await res.json();
      setAvailability(prev => ({
        ...prev,
        [selectedDate]: {
          available_rooms: updatedDay.available_rooms,
          price_per_night: updatedDay.price_per_night || basePrice
        }
      }));

      setEditMode(false);
      setSelectedDate(null);
      toast.success('Availability updated successfully');
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setSelectedDate(null);
    setEditValues({
      available_rooms: '',
      price_per_night: ''
    });
  };

  const renderDayContent = (date) => {
    const formattedDate = date.toISOString().split('T')[0];
    const dayAvailability = availability[formattedDate];

    if (!dayAvailability) {
      return (
        <div className="text-center">
          <div className="text-sm font-medium">Available: -</div>
          <div className="text-xs">€{basePrice}</div>
        </div>
      );
    }

    return (
      <div className="text-center">
        <div className="text-sm font-medium">
          Available: {dayAvailability.available_rooms || '-'}
        </div>
        <div className="text-xs">
          €{dayAvailability.price_per_night || basePrice}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-4">
        <div className="flex-1">
          <Calendar
            mode="single"
            selected={selectedDate ? new Date(selectedDate) : null}
            onSelect={(date) => date && handleDayClick(date)}
            disabled={(date) => date < new Date()}
            components={{
              DayContent: ({ date }) => renderDayContent(date)
            }}
          />
        </div>
        {editMode && (
          <div className="w-72 space-y-4 p-4 border rounded-lg">
            <h3 className="font-medium">Edit Availability</h3>
            <div className="space-y-2">
              <label className="text-sm">Available Rooms</label>
              <Input
                type="number"
                value={editValues.available_rooms}
                onChange={(e) => setEditValues(prev => ({
                  ...prev,
                  available_rooms: e.target.value
                }))}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm">Price per Night (€)</label>
              <Input
                type="number"
                value={editValues.price_per_night}
                onChange={(e) => setEditValues(prev => ({
                  ...prev,
                  price_per_night: e.target.value
                }))}
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleDayUpdate}>Save</Button>
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 