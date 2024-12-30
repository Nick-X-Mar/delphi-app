'use client';

import { useState } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function EventForm({ event, onSuccess, onCancel }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: event?.name || '',
    start_date: event?.start_date ? format(new Date(event.start_date), 'yyyy-MM-dd') : '',
    end_date: event?.end_date ? format(new Date(event.end_date), 'yyyy-MM-dd') : ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);

      // Validate required fields
      if (!formData.name || !formData.start_date || !formData.end_date) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Validate dates
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);

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
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      toast.success(
        event
          ? 'Event updated successfully'
          : 'Event created successfully'
      );

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
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Calculate accommodation dates for display
  const accommodationStartDate = formData.start_date
    ? format(subDays(new Date(formData.start_date), 2), 'yyyy-MM-dd')
    : '';
  
  const accommodationEndDate = formData.end_date
    ? format(addDays(new Date(formData.end_date), 2), 'yyyy-MM-dd')
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