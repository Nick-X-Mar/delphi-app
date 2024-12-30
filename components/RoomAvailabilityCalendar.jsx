'use client';

import { useState, useEffect } from 'react';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, isAfter, parseISO } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function RoomAvailabilityCalendar({ hotelId, roomTypeId, totalRooms, basePrice }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailability] = useState({});
  const [unsavedChanges, setUnsavedChanges] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [event, setEvent] = useState(null);

  useEffect(() => {
    fetchEvent();
  }, []);

  useEffect(() => {
    if (event) {
      fetchAvailability();
      setCurrentDate(new Date(event.accommodation_start_date));
    }
  }, [event]);

  useEffect(() => {
    if (event) {
      fetchAvailability();
    }
  }, [currentDate]);

  const fetchEvent = async () => {
    try {
      const response = await fetch('/api/events/active');
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Failed to fetch active event');
    }
  };

  const fetchAvailability = async () => {
    try {
      setIsLoading(true);
      const eventStart = new Date(event.accommodation_start_date);
      const eventEnd = new Date(event.accommodation_end_date);

      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      const startDate = format(
        isBefore(monthStart, eventStart) ? eventStart : monthStart,
        'yyyy-MM-dd'
      );
      const endDate = format(
        isAfter(monthEnd, eventEnd) ? eventEnd : monthEnd,
        'yyyy-MM-dd'
      );

      const response = await fetch(
        `/api/hotels/${hotelId}/room-types/${roomTypeId}/availability?start_date=${startDate}&end_date=${endDate}`
      );
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const availabilityMap = {};
      data.forEach(item => {
        availabilityMap[format(new Date(item.date), 'yyyy-MM-dd')] = {
          available_rooms: item.available_rooms,
          price_per_night: item.price_per_night
        };
      });

      setAvailability(availabilityMap);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Failed to fetch availability');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    const newDate = addMonths(currentDate, -1);
    if (!event || !isBefore(newDate, new Date(event.accommodation_start_date))) {
      setCurrentDate(newDate);
    }
  };

  const handleNextMonth = () => {
    const newDate = addMonths(currentDate, 1);
    if (!event || !isAfter(newDate, new Date(event.accommodation_end_date))) {
      setCurrentDate(newDate);
    }
  };

  const handleDayUpdate = (date, field, value) => {
    const currentData = unsavedChanges[date] || availability[date] || {
      available_rooms: totalRooms,
      price_per_night: basePrice || 0
    };

    const updatedData = {
      ...currentData,
      [field]: field === 'available_rooms' ? parseInt(value) : parseFloat(value),
      price_per_night: field === 'available_rooms' 
        ? (currentData.price_per_night || basePrice || 0)
        : (field === 'price_per_night' ? parseFloat(value) : currentData.price_per_night)
    };

    setUnsavedChanges(prev => ({
      ...prev,
      [date]: updatedData
    }));
  };

  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      
      const updates = Object.entries(unsavedChanges).map(([date, data]) => ({
        date,
        available_rooms: data.available_rooms,
        price_per_night: data.price_per_night
      }));

      for (const update of updates) {
        const response = await fetch(`/api/hotels/${hotelId}/room-types/${roomTypeId}/availability`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(update),
        });

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
      }

      setUnsavedChanges({});
      toast.success('All changes saved successfully');

      await fetchAvailability();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error(error.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No active event found. Please create an event first.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-96 bg-gray-200 rounded" />
      </div>
    );
  }

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const eventStart = parseISO(event.accommodation_start_date);
  const eventEnd = parseISO(event.accommodation_end_date);

  const hasUnsavedChanges = Object.keys(unsavedChanges).length > 0;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="text-sm font-medium text-blue-900 mb-1">Event Period</h3>
        <p className="text-sm text-blue-700">
          {format(parseISO(event.start_date), 'dd/MM/yyyy')} - {format(parseISO(event.end_date), 'dd/MM/yyyy')}
        </p>
        <h3 className="text-sm font-medium text-blue-900 mt-2 mb-1">Accommodation Period</h3>
        <p className="text-sm text-blue-700">
          {format(eventStart, 'dd/MM/yyyy')} - {format(eventEnd, 'dd/MM/yyyy')}
        </p>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={handlePreviousMonth}
            disabled={isSaving || isBefore(startOfMonth(currentDate), eventStart)}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <Button
            variant="outline"
            onClick={handleNextMonth}
            disabled={isSaving || isAfter(endOfMonth(currentDate), eventEnd)}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center space-x-4">
          {hasUnsavedChanges && editMode && (
            <Button
              onClick={handleSaveChanges}
              disabled={isSaving}
              variant="default"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
          <Button
            onClick={() => {
              if (editMode && hasUnsavedChanges) {
                if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                  setEditMode(false);
                  setUnsavedChanges({});
                }
              } else {
                setEditMode(!editMode);
              }
            }}
            variant={editMode ? "outline" : "default"}
          >
            {editMode ? 'Cancel Edit' : 'Edit Mode'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-medium py-2">
            {day}
          </div>
        ))}
        
        {daysInMonth.map(date => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const isWithinEvent = !isBefore(date, eventStart) && !isAfter(date, eventEnd);
          const dayData = unsavedChanges[dateStr] || availability[dateStr] || {
            available_rooms: totalRooms,
            price_per_night: basePrice || 0
          };

          if (!isWithinEvent) {
            return (
              <div
                key={dateStr}
                className="p-2 border rounded bg-gray-50"
              >
                <div className="text-sm font-medium text-gray-400">
                  {format(date, 'd')}
                </div>
              </div>
            );
          }

          return (
            <div
              key={dateStr}
              className={`p-2 border rounded ${
                editMode ? 'hover:bg-gray-50' : ''
              } ${unsavedChanges[dateStr] ? 'border-blue-500' : ''}`}
            >
              <div className="text-sm font-medium mb-1">
                {format(date, 'd')}
              </div>
              {editMode ? (
                <div className="space-y-1">
                  <Input
                    type="number"
                    value={dayData.available_rooms}
                    onChange={(e) => handleDayUpdate(
                      dateStr,
                      'available_rooms',
                      e.target.value
                    )}
                    min="0"
                    max={totalRooms}
                    className="w-full text-sm"
                  />
                  <Input
                    type="number"
                    value={dayData.price_per_night}
                    onChange={(e) => handleDayUpdate(
                      dateStr,
                      'price_per_night',
                      e.target.value
                    )}
                    min="0.01"
                    step="0.01"
                    className="w-full text-sm"
                  />
                </div>
              ) : (
                <div className="text-sm">
                  <div className={dayData.available_rooms === 0 ? 'text-red-500' : 'text-green-600'}>
                    {dayData.available_rooms} / {totalRooms}
                  </div>
                  <div className="text-blue-600 font-medium">
                    €{parseFloat(dayData.price_per_night || basePrice || 0).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
} 