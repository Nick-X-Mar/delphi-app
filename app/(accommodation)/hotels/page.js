'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { useRouter } from 'next/navigation';
import HotelList from '@/components/HotelList';
import { Button } from '@/components/ui/button';
import { useViewOnlyMode } from '@/lib/viewOnlyMode';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function HotelsPage() {
  const router = useRouter();
  const [workingEventId, setWorkingEventId] = useState(null);
  const { isViewOnly } = useViewOnlyMode();

  useEffect(() => {
    // Get working event from localStorage
    if (typeof window !== 'undefined') {
      const eventId = localStorage.getItem('workingEventId');
      setWorkingEventId(eventId);
    }

    // Listen for working event changes
    const handleWorkingEventChange = () => {
      if (typeof window !== 'undefined') {
        const eventId = localStorage.getItem('workingEventId');
        setWorkingEventId(eventId);
      }
    };

    window.addEventListener('workingEventChanged', handleWorkingEventChange);
    return () => {
      window.removeEventListener('workingEventChanged', handleWorkingEventChange);
    };
  }, []);

  const handleAddHotel = () => {
    router.push('/hotels/new');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {isViewOnly && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>View-Only Mode:</strong> This event has passed. All modifications are disabled.
          </p>
        </div>
      )}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Hotels</h1>
        <Button onClick={handleAddHotel} disabled={isViewOnly}>
          Add New Hotel
        </Button>
      </div>

      <HotelList initialEventId={workingEventId} isViewOnly={isViewOnly} />
    </div>
  );
}
