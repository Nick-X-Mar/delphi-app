import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function EventSelector({ value, onChange, className, disabled = false }) {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (!response.ok) throw new Error('Failed to fetch events');
        const data = await response.json();
        
        setEvents(data);
        
        // If we have events and no value is selected, select the working event or first one
        if (data.length > 0 && !value) {
          // Try to get working event from localStorage
          const workingEventId = typeof window !== 'undefined' 
            ? localStorage.getItem('workingEventId') 
            : null;
          
          // Check if working event exists in the events list
          const workingEvent = workingEventId 
            ? data.find(e => e.event_id.toString() === workingEventId)
            : null;
          
          // Select working event if found, otherwise select first event
          const eventToSelect = workingEvent || data[0];
          onChange(eventToSelect.event_id.toString());
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load events');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Loading events..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (events.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="No events found" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select event" />
      </SelectTrigger>
      <SelectContent>
        {events.map(event => (
          <SelectItem key={event.event_id} value={event.event_id.toString()}>
            {event.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 