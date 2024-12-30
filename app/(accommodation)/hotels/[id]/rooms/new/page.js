'use client';

import { useParams, useRouter } from 'next/navigation';
import RoomTypeForm from '@/components/RoomTypeForm';

export default function NewRoomTypePage() {
  const { id: hotelId } = useParams();
  const router = useRouter();

  const handleSuccess = () => {
    router.push(`/hotels/${hotelId}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Room Type</h1>
      <RoomTypeForm hotelId={hotelId} onSuccess={handleSuccess} />
    </div>
  );
} 