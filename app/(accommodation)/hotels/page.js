'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { useRouter } from 'next/navigation';
import HotelList from '@/components/HotelList';
import { Button } from '@/components/ui/button';
import { useViewOnlyMode, clearViewOnlyCache } from '@/lib/viewOnlyMode';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function HotelsPage() {
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { isViewOnly } = useViewOnlyMode(selectedEvent);

  // Sync initial event from localStorage after mount (avoids hydration mismatch)
  useEffect(() => {
    const stored = localStorage.getItem('workingEventId');
    if (stored) setSelectedEvent(stored);
  }, []);

  // Handle event change from HotelList
  const handleEventChange = (eventId) => {
    clearViewOnlyCache();
    setSelectedEvent(eventId);
  };

  // Listen for working event changes
  useEffect(() => {
    const handleWorkingEventChange = () => {
      if (typeof window !== 'undefined') {
        const workingEventId = localStorage.getItem('workingEventId');
        if (workingEventId && !selectedEvent) {
          setSelectedEvent(workingEventId);
        }
      }
    };

    window.addEventListener('workingEventChanged', handleWorkingEventChange);
    return () => {
      window.removeEventListener('workingEventChanged', handleWorkingEventChange);
    };
  }, [selectedEvent]);

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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/hotels/preparation-config')}
          >
            Configure Hotels
          </Button>
          <Button onClick={handleAddHotel} disabled={isViewOnly}>
            Add New Hotel
          </Button>
        </div>
      </div>

      <HotelList 
        initialEventId={selectedEvent} 
        isViewOnly={isViewOnly}
        onEventChange={handleEventChange}
      />
    </div>
  );
}
