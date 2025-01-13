'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import AccommodationTable from '@/components/AccommodationTable';
import EventSelector from '@/components/EventSelector';

export default function Accommodation() {
  const [selectedEvent, setSelectedEvent] = useState(null);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Accommodation Management</h1>
        <div className="w-[300px]">
          <EventSelector
            value={selectedEvent}
            onChange={setSelectedEvent}
          />
        </div>
      </div>
      
      <Card className="p-6">
        <AccommodationTable eventId={selectedEvent} />
      </Card>
    </div>
  );
}
