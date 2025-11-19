'use client';

import { useState, useEffect } from 'react';
import PeopleTable from '@/components/PeopleTable';
import { Toaster } from 'sonner';
import { useViewOnlyMode, clearViewOnlyCache } from '@/lib/viewOnlyMode';

export default function People() {
  const [selectedEvent, setSelectedEvent] = useState(() => {
    // Initialize with working event from localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('workingEventId');
    }
    return null;
  });
  const { isViewOnly } = useViewOnlyMode(selectedEvent);

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
