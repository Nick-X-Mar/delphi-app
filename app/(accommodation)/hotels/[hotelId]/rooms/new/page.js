'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import RoomTypeForm from '@/components/RoomTypeForm';
import { useViewOnlyMode } from '@/lib/viewOnlyMode';

export default function NewRoomTypePage() {
  const { hotelId } = useParams();
  const router = useRouter();
  const { isViewOnly, isLoading: isLoadingViewOnly } = useViewOnlyMode();

  useEffect(() => {
    if (!isLoadingViewOnly && isViewOnly) {
      toast.error('Cannot create room type: Event has passed. All modifications are disabled.');
      router.push(`/hotels/${hotelId}`);
    }
  }, [isViewOnly, isLoadingViewOnly, router, hotelId]);

  const handleSuccess = () => {
    router.push(`/hotels/${hotelId}`);
  };

  if (isLoadingViewOnly || isViewOnly) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Room Type</h1>
      <RoomTypeForm hotelId={hotelId} onSuccess={handleSuccess} />
    </div>
  );
} 