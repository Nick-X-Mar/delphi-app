'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import EventForm from './EventForm';

export default function EventList({ events, onEventUpdated, onEventDeleted }) {
  const { data: session } = useSession();
  const [editingEvent, setEditingEvent] = useState(null);
  const [workingEventId, setWorkingEventId] = useState(null);
  
  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    // Get current working event from localStorage
    const currentWorkingEventId = localStorage.getItem('workingEventId');
    setWorkingEventId(currentWorkingEventId ? parseInt(currentWorkingEventId) : null);

    // Listen for changes to working event
    const handleWorkingEventChange = () => {
      const newWorkingEventId = localStorage.getItem('workingEventId');
      setWorkingEventId(newWorkingEventId ? parseInt(newWorkingEventId) : null);
    };

    window.addEventListener('workingEventChanged', handleWorkingEventChange);
    return () => {
      window.removeEventListener('workingEventChanged', handleWorkingEventChange);
    };
  }, []);

  const handleSetWorkingEvent = (eventId) => {
    localStorage.setItem('workingEventId', eventId.toString());
    setWorkingEventId(eventId);
    window.dispatchEvent(new CustomEvent('workingEventChanged'));
    toast.success('Working event updated');
  };

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
      {events.map(event => {
        const isWorkingEvent = workingEventId === event.event_id;
        return (
          <Card 
            key={event.event_id}
            className={isWorkingEvent ? 'border-2 border-blue-500 bg-blue-50' : ''}
          >
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
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl font-bold">
                      {event.name}
                    </CardTitle>
                    {event.tag && (
                      <span className="px-2 py-1 text-xs font-semibold bg-gray-200 text-gray-700 rounded">
                        {event.tag}
                      </span>
                    )}
                    {isWorkingEvent && (
                      <span className="px-2 py-1 text-xs font-semibold bg-blue-500 text-white rounded">
                        Working Event
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingEvent(event)}
                      disabled={!isAdmin}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(event)}
                      disabled={!isAdmin}
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
                      {event.preparation_start_date && event.preparation_end_date && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">
                            Preparation Period
                          </h3>
                          <p className="mt-1">
                            {format(new Date(event.preparation_start_date), 'dd/MM/yyyy')} - {format(new Date(event.preparation_end_date), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        {event.is_active ? (
                          <span className="text-green-600 font-medium">Active</span>
                        ) : (
                          <span className="text-red-600 font-medium">Inactive</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`working-event-${event.event_id}`}
                          checked={isWorkingEvent}
                          onCheckedChange={() => handleSetWorkingEvent(event.event_id)}
                        />
                        <label
                          htmlFor={`working-event-${event.event_id}`}
                          className="text-sm font-medium text-gray-700 cursor-pointer"
                        >
                          Set as Working Event
                        </label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
} 