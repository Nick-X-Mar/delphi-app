'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import EventForm from './EventForm';

export default function EventList({ events, onEventUpdated, onEventDeleted }) {
  const [editingEvent, setEditingEvent] = useState(null);

  const handleDelete = async (event) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      const response = await fetch(`/api/events/${event.event_id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      toast.success('Event deleted successfully');
      onEventDeleted(event.event_id);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.message || 'Failed to delete event');
    }
  };

  const handleEditSuccess = (updatedEvent) => {
    onEventUpdated(updatedEvent);
    setEditingEvent(null);
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No events found. Create one to get started!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {events.map(event => (
        <Card key={event.event_id}>
          {editingEvent?.event_id === event.event_id ? (
            <CardContent className="pt-6">
              <EventForm
                event={event}
                onSuccess={handleEditSuccess}
                onCancel={() => setEditingEvent(null)}
              />
            </CardContent>
          ) : (
            <>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xl font-bold">
                  {event.name}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingEvent(event)}
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(event)}
                    disabled={true}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        Event Period
                      </h3>
                      <p className="mt-1">
                        {format(new Date(event.start_date), 'dd/MM/yyyy')} - {format(new Date(event.end_date), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        Accommodation Period
                      </h3>
                      <p className="mt-1">
                        {format(new Date(event.accommodation_start_date), 'dd/MM/yyyy')} - {format(new Date(event.accommodation_end_date), 'dd/MM/yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {event.is_active ? (
                      <span className="text-green-600 font-medium">Active</span>
                    ) : (
                      <span className="text-red-600 font-medium">Inactive</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      ))}
    </div>
  );
} 