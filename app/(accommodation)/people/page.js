'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PeopleTable from '@/components/PeopleTable';
import { Toaster } from 'sonner';
import { useViewOnlyMode, clearViewOnlyCache } from '@/lib/viewOnlyMode';
import { PlusIcon } from '@heroicons/react/24/solid';

export default function People() {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { isViewOnly } = useViewOnlyMode(selectedEvent);

  // Sync initial event from localStorage after mount (avoids hydration mismatch)
  useEffect(() => {
    const stored = localStorage.getItem('workingEventId');
    if (stored) setSelectedEvent(stored);
  }, []);

  // Handle event change - clear cache and re-check view-only mode
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
        <h1 className="text-2xl font-bold text-gray-900">People Management</h1>
        {!isViewOnly && (
          <Link
            href="/people/new"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-600 hover:bg-green-700 text-white transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
          </Link>
        )}
      </div>
      <PeopleTable 
        isViewOnly={isViewOnly} 
        selectedEvent={selectedEvent}
        onEventChange={handleEventChange}
      />
      <Toaster />
    </div>
  );
}
