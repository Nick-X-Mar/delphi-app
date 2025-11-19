'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import RoomTypeForm from '@/components/RoomTypeForm';
import RoomAvailabilityCalendar from '@/components/RoomAvailabilityCalendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useViewOnlyMode } from '@/lib/viewOnlyMode';

export default function EditRoomTypePage() {
  const params = useParams();
  const router = useRouter();
  const { isViewOnly } = useViewOnlyMode();
  const hotelId = params.hotelId;
  const roomTypeId = params.roomTypeId;
  const [roomType, setRoomType] = useState(null);
  const [eventDates, setEventDates] = useState(null);
  const [basePrice, setBasePrice] = useState(null);
  const [key, setKey] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchRoomType();
    fetchEventDates();
  }, []);

  const fetchEventDates = async () => {
    try {
      const res = await fetch(`/api/hotels/${hotelId}/room-types/${roomTypeId}/event-dates`);
      if (!res.ok) throw new Error('Failed to fetch event dates');
      const data = await res.json();
      setEventDates(data);
    } catch (error) {
      console.error('Error fetching event dates:', error);
      toast.error('Failed to load event dates');
    }
  };

  const fetchRoomType = async () => {
    try {
      const res = await fetch(`/api/hotels/${hotelId}/room-types/${roomTypeId}`);
      if (!res.ok) throw new Error('Failed to fetch room type');
      const data = await res.json();
      setRoomType(data);
      setBasePrice(data.base_price_per_night);
    } catch (error) {
      console.error('Error fetching room type:', error);
      toast.error('Failed to load room type');
    }
  };

  const handleDelete = async () => {
    try {
      // First get all active bookings for this room type
      const bookingsRes = await fetch(`/api/hotels/${hotelId}/room-types/${roomTypeId}/bookings`);
      if (!bookingsRes.ok) throw new Error('Failed to fetch bookings');
      const { bookings } = await bookingsRes.json();

      const confirmMessage = `Are you sure you want to delete this room type?\n\n` +
        `This will permanently delete:\n` +
        `- All availability and pricing data\n` +
        `- ${bookings.length} booking(s)\n\n` +
        `This action cannot be undone.`;

      if (!confirm(confirmMessage)) return;

      setIsDeleting(true);

      const deleteRes = await fetch(`/api/hotels/${hotelId}/room-types/${roomTypeId}`, {
        method: 'DELETE'
      });

      if (!deleteRes.ok) {
        throw new Error('Failed to delete room type');
      }

      toast.success('Room type deleted successfully');
      router.push(`/hotels/${hotelId}`);
    } catch (error) {
      console.error('Error deleting room type:', error);
      toast.error(error.message || 'Failed to delete room type');
      setIsDeleting(false);
    }
  };

  const handleSuccess = async (updatedRoomType) => {
    setBasePrice(updatedRoomType.base_price_per_night);
    setKey(prevKey => prevKey + 1);
    await fetchRoomType();
    toast.success('Room type updated successfully');
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
      {isViewOnly && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>View-Only Mode:</strong> This event has passed. All modifications are disabled.
          </p>
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Room Type</h1>
        <div className="space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/hotels/${hotelId}`)}
          >
            Back to Hotel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || isViewOnly}
          >
            {isDeleting ? 'Deleting...' : 'Delete Room Type'}
          </Button>
        </div>
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
              isViewOnly={isViewOnly}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Availability & Pricing</CardTitle>
            {eventDates && (
              <p className="text-sm text-gray-600">
                Event Period: {new Date(eventDates.accommodation_start_date).toLocaleDateString()} - {new Date(eventDates.accommodation_end_date).toLocaleDateString()}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {eventDates ? (
              <RoomAvailabilityCalendar
                key={key}
                hotelId={hotelId}
                roomTypeId={roomTypeId}
                basePrice={basePrice}
                totalRooms={roomType.total_rooms}
                eventStartDate={eventDates.accommodation_start_date}
                eventEndDate={eventDates.accommodation_end_date}
                isViewOnly={isViewOnly}
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