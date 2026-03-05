'use client';

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getHotelCategoryColor } from '@/lib/hotelCategories';

export default function PreparationHotelsConfigPage() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [hotels, setHotels] = useState([]);
  const [selectedHotelIds, setSelectedHotelIds] = useState(new Set());
  const [savedHotelIds, setSavedHotelIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchPreparationHotels(selectedEventId);
    } else {
      setHotels([]);
      setSelectedHotelIds(new Set());
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      if (!data.error) {
        setEvents(data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    }
  };

  const fetchPreparationHotels = async (eventId) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/events/${eventId}/preparation-hotels`);
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setHotels(data);
      const preSelected = new Set(
        data.filter((h) => h.is_preparation_hotel).map((h) => h.hotel_id)
      );
      setSelectedHotelIds(preSelected);
      setSavedHotelIds(new Set(preSelected));
      setSaveError('');
    } catch (error) {
      console.error('Error fetching preparation hotels:', error);
      toast.error('Failed to load hotels');
      setHotels([]);
      setSelectedHotelIds(new Set());
      setSavedHotelIds(new Set());
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleHotel = (hotelId) => {
    setSaveError('');
    setSelectedHotelIds((prev) => {
      const next = new Set(prev);
      if (next.has(hotelId)) {
        next.delete(hotelId);
      } else {
        next.add(hotelId);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    setSaveError('');
    if (selectedHotelIds.size === hotels.length) {
      setSelectedHotelIds(new Set());
    } else {
      setSelectedHotelIds(new Set(hotels.map((h) => h.hotel_id)));
    }
  };

  const handleSave = async () => {
    if (!selectedEventId) {
      toast.error('Please select an event first');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    try {
      const response = await fetch(
        `/api/events/${selectedEventId}/preparation-hotels`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hotelIds: Array.from(selectedHotelIds) }),
        }
      );
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setSavedHotelIds(new Set(selectedHotelIds));
      toast.success('Preparation hotel configuration saved successfully');
    } catch (error) {
      console.error('Error saving configuration:', error);
      setSaveError('Failed to Update');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedEvent = events.find(
    (e) => e.event_id.toString() === selectedEventId
  );
  const hasPreparationDates =
    selectedEvent?.preparation_start_date && selectedEvent?.preparation_end_date;

  const hasChanges =
    selectedHotelIds.size !== savedHotelIds.size ||
    [...selectedHotelIds].some((id) => !savedHotelIds.has(id));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Preparation Hotels Configuration
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Event</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent>
              {events.map((evt) => (
                <SelectItem
                  key={evt.event_id}
                  value={evt.event_id.toString()}
                >
                  {evt.name} (
                  {format(parseISO(evt.start_date), 'dd/MM/yyyy')} -{' '}
                  {format(parseISO(evt.end_date), 'dd/MM/yyyy')})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedEventId && !hasPreparationDates && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                This event does not have preparation dates configured. Please
                set Preparation Start Date and Preparation End Date on the
                Events page first.
              </p>
            </div>
          )}

          {selectedEventId && hasPreparationDates && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                Preparation Period:{' '}
                <span className="font-medium">
                  {format(
                    parseISO(selectedEvent.preparation_start_date),
                    'dd/MM/yyyy'
                  )}
                </span>{' '}
                -{' '}
                <span className="font-medium">
                  {format(
                    parseISO(selectedEvent.preparation_end_date),
                    'dd/MM/yyyy'
                  )}
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedEventId && hotels.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>
              Hotels ({selectedHotelIds.size} of {hotels.length} selected)
            </CardTitle>
            <div className="flex flex-col items-end gap-1">
              <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
                {isSaving ? 'Saving...' : 'Save Configuration'}
              </Button>
              {saveError && (
                <p className="text-sm text-red-600">{saveError}</p>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        hotels.length > 0 &&
                        selectedHotelIds.size === hotels.length
                      }
                      onCheckedChange={handleToggleAll}
                    />
                  </TableHead>
                  <TableHead>Hotel Name</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Category</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hotels.map((hotel) => (
                  <TableRow key={hotel.hotel_id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedHotelIds.has(hotel.hotel_id)}
                        onCheckedChange={() => handleToggleHotel(hotel.hotel_id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{hotel.name}</TableCell>
                    <TableCell>{hotel.area}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${getHotelCategoryColor(hotel.category)}`}
                      >
                        {hotel.category}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {selectedEventId && !isLoading && hotels.length === 0 && (
        <Card className="mt-6">
          <CardContent className="py-12">
            <p className="text-center text-gray-500">
              No hotels are associated with this event. Add hotels to the event
              first.
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card className="mt-6">
          <CardContent className="py-12">
            <p className="text-center text-gray-500">Loading hotels...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
