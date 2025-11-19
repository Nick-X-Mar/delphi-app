'use client';

import { useState, useEffect } from 'react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, formatDateForAPI } from '@/utils/dateFormatters';

export default function EventForm({ event, onSuccess, onCancel }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allEvents, setAllEvents] = useState([]);
  const [formData, setFormData] = useState({
    name: event?.name || '',
    start_date: event?.start_date ? format(parseISO(event.start_date), 'yyyy-MM-dd') : '',
    end_date: event?.end_date ? format(parseISO(event.end_date), 'yyyy-MM-dd') : '',
    tag: event?.tag || '',
    migrateFromEventId: '',
    isWorkingEvent: false
  });

  // Fetch all events for migrate hotels dropdown (only when creating new event)
  useEffect(() => {
    if (!event) {
      fetchAllEvents();
    }
  }, [event]);

  const fetchAllEvents = async () => {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      if (!data.error) {
        setAllEvents(data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);

      // Validate required fields
      if (!formData.name || !formData.start_date || !formData.end_date) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Create dates in UTC
      const startDate = new Date(formData.start_date + 'T12:00:00Z');
      const endDate = new Date(formData.end_date + 'T12:00:00Z');

      if (endDate < startDate) {
        toast.error('End date must be after start date');
        return;
      }

      const url = event
        ? `/api/events/${event.event_id}`
        : '/api/events';

      const response = await fetch(url, {
        method: event ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          tag: formData.tag || null
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // If creating new event and migrate hotels is selected, migrate hotels
      if (!event && formData.migrateFromEventId) {
        try {
          const migrateResponse = await fetch(`/api/events/${data.event_id}/migrate-hotels`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sourceEventId: formData.migrateFromEventId
            }),
          });

          const migrateData = await migrateResponse.json();
          if (migrateData.error) {
            toast.warning('Event created but hotel migration failed: ' + migrateData.error);
          } else {
            toast.success(`Event created and ${migrateData.hotelsMigrated || 0} hotels migrated successfully`);
          }
        } catch (migrateError) {
          console.error('Migration error:', migrateError);
          toast.warning('Event created but hotel migration failed');
        }
      } else {
        toast.success(
          event
            ? 'Event updated successfully'
            : 'Event created successfully'
        );
      }

      // Handle working event checkbox (only for new events)
      if (!event && formData.isWorkingEvent) {
        localStorage.setItem('workingEventId', data.event_id.toString());
        window.dispatchEvent(new CustomEvent('workingEventChanged'));
      }

      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Failed to save event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSelectChange = (value) => {
    setFormData(prev => ({
      ...prev,
      migrateFromEventId: value
    }));
  };

  // Calculate accommodation dates for display
  const accommodationStartDate = formData.start_date
    ? format(subDays(new Date(formData.start_date + 'T12:00:00Z'), 2), 'yyyy-MM-dd')
    : '';
  
  const accommodationEndDate = formData.end_date
    ? format(addDays(new Date(formData.end_date + 'T12:00:00Z'), 2), 'yyyy-MM-dd')
    : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Event Name *
          </label>
          <Input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Annual Conference 2024"
            className="mt-1"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Start Date *
          </label>
          <Input
            type="date"
            name="start_date"
            value={formData.start_date}
            onChange={handleChange}
            className="mt-1"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            End Date *
          </label>
          <Input
            type="date"
            name="end_date"
            value={formData.end_date}
            onChange={handleChange}
            min={formData.start_date}
            className="mt-1"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Tag
          </label>
          <Input
            type="text"
            name="tag"
            value={formData.tag}
            onChange={handleChange}
            placeholder="e.g., CONF2024"
            className="mt-1"
            disabled={isSubmitting}
          />
        </div>

        {!event && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Migrate Hotels
              </label>
              <Select
                value={formData.migrateFromEventId}
                onValueChange={handleSelectChange}
                disabled={isSubmitting}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an event to copy hotels from" />
                </SelectTrigger>
                <SelectContent>
                  {allEvents.map((evt) => (
                    <SelectItem key={evt.event_id} value={evt.event_id.toString()}>
                      {evt.name} ({format(parseISO(evt.start_date), 'dd/MM/yyyy')} - {format(parseISO(evt.end_date), 'dd/MM/yyyy')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-gray-500">
                Select an event to copy all its hotels to this new event
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isWorkingEvent"
                checked={formData.isWorkingEvent}
                onCheckedChange={(checked) => {
                  setFormData(prev => ({
                    ...prev,
                    isWorkingEvent: checked
                  }));
                }}
                disabled={isSubmitting}
              />
              <label
                htmlFor="isWorkingEvent"
                className="text-sm font-medium text-gray-700 cursor-pointer"
              >
                Set as Working Event
              </label>
            </div>
          </>
        )}

        {(formData.start_date && formData.end_date) && (
          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Accommodation Period
            </h3>
            <p className="text-sm text-gray-600">
              Check-in available from: <span className="font-medium">{accommodationStartDate}</span>
            </p>
            <p className="text-sm text-gray-600">
              Check-out until: <span className="font-medium">{accommodationEndDate}</span>
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? (event ? 'Updating...' : 'Creating...')
            : (event ? 'Update Event' : 'Create Event')
          }
        </Button>
      </div>
    </form>
  );
} 