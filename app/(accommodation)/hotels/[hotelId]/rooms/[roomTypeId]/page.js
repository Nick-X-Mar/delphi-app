'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import RoomTypeForm from '@/components/RoomTypeForm';
import RoomAvailabilityCalendar from '@/components/RoomAvailabilityCalendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EditRoomTypePage() {
  const params = useParams();
  const router = useRouter();
  const hotelId = params.hotelId;
  const roomTypeId = params.roomTypeId;
  const [roomType, setRoomType] = useState(null);
  const [activeEvent, setActiveEvent] = useState(null);

  useEffect(() => {
    fetchRoomType();
    fetchActiveEvent();
  }, []);

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

  const fetchRoomType = async () => {
    try {
      const res = await fetch(`/api/hotels/${hotelId}/room-types/${roomTypeId}`);
      if (!res.ok) throw new Error('Failed to fetch room type');
      const data = await res.json();
      setRoomType(data);
    } catch (error) {
      console.error('Error fetching room type:', error);
      toast.error('Failed to load room type');
    }
  };

  const handleSuccess = () => {
    toast.success('Room type updated successfully');
    fetchRoomType();
  };

  if (!roomType) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-gray-600">Room type not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Room Type</h1>
        <Button
          variant="outline"
          onClick={() => router.push(`/hotels/${hotelId}`)}
        >
          Back to Hotel
        </Button>
      </div>
      
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Room Type Details</CardTitle>
          </CardHeader>
          <CardContent>
            <RoomTypeForm
              hotelId={hotelId}
              roomType={roomType}
              onSuccess={handleSuccess}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Availability & Pricing</CardTitle>
            {activeEvent && (
              <p className="text-sm text-gray-600">
                Event Period: {new Date(activeEvent.accommodation_start_date).toLocaleDateString()} - {new Date(activeEvent.accommodation_end_date).toLocaleDateString()}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {activeEvent ? (
              <RoomAvailabilityCalendar
                hotelId={hotelId}
                roomTypeId={roomTypeId}
                basePrice={roomType.base_price_per_night}
                totalRooms={roomType.total_rooms}
                eventStartDate={activeEvent.accommodation_start_date}
                eventEndDate={activeEvent.accommodation_end_date}
              />
            ) : (
              <p className="text-center text-gray-600">Loading event dates...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 