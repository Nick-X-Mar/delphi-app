'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import EventList from '@/components/EventList';
import EventForm from '@/components/EventForm';

export default function EventsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to fetch events');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEventCreated = (newEvent) => {
    setEvents(prev => [newEvent, ...prev]);
    setShowCreateModal(false);
  };

  const handleEventUpdated = (updatedEvent) => {
    setEvents(prev => prev.map(event => 
      event.event_id === updatedEvent.event_id ? updatedEvent : event
    ));
  };

  const handleEventDeleted = (eventId) => {
    setEvents(prev => prev.filter(event => event.event_id !== eventId));
  };

  const handleUpdateEvents = async () => {
    try {
      setIsUpdating(true);
      const response = await fetch('/api/events/update-active-status', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to update events');
      }

      await fetchEvents(); // Refresh the events list
      toast.success('Events updated successfully');
    } catch (error) {
      console.error('Error updating events:', error);
      toast.error('Failed to update events');
    } finally {
      setIsUpdating(false);
    }
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={handleUpdateEvents}
            disabled={isUpdating}
            className="inline-flex items-center"
          >
            <ArrowPathIcon className={`h-5 w-5 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
            {isUpdating ? 'Updating...' : 'Update Events'}
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center"
            disabled={true}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Event
          </Button>
        </div>
      </div>

      <EventList
        events={events}
        onEventUpdated={handleEventUpdated}
        onEventDeleted={handleEventDeleted}
      />

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Create New Event</CardTitle>
            </CardHeader>
            <CardContent>
              <EventForm
                onSuccess={handleEventCreated}
                onCancel={() => setShowCreateModal(false)}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 