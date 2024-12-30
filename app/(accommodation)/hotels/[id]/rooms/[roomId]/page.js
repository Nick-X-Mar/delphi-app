'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import RoomTypeForm from '@/components/RoomTypeForm';
import RoomAvailabilityCalendar from '@/components/RoomAvailabilityCalendar';
import { Button } from '@/components/ui/button';

export default function EditRoomTypePage() {
  const { id, roomId } = useParams();
  const router = useRouter();
  const [roomType, setRoomType] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRoomType();
  }, [id, roomId]);

  const fetchRoomType = async () => {
    try {
      const response = await fetch(`/api/hotels/${id}/room-types/${roomId}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setRoomType(data);
    } catch (error) {
      console.error('Error fetching room type:', error);
      toast.error('Failed to fetch room type details');
      router.push(`/hotels/${id}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = () => {
    router.push(`/hotels/${id}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6" />
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

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
          onClick={() => router.push(`/hotels/${id}`)}
        >
          Back to Hotel
        </Button>
      </div>
      
      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Room Type Details</h2>
            <RoomTypeForm
              hotelId={id}
              roomType={roomType}
              onSuccess={handleSuccess}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Availability & Pricing</h2>
            <RoomAvailabilityCalendar
              hotelId={id}
              roomTypeId={roomId}
              totalRooms={roomType.total_rooms}
              basePrice={roomType.base_price_per_night}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 