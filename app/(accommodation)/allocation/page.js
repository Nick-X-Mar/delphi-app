'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import PeopleList from '@/components/PeopleList';
import AccommodationHotelList from '@/components/AccommodationHotelList';
import AccommodationConfirmation from '@/components/AccommodationConfirmation';
import EventSelector from '@/components/EventSelector';
import { toast } from 'sonner';

export default function Allocation() {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [roomSelection, setRoomSelection] = useState(null);
  const [expandedStep, setExpandedStep] = useState(1);
  const [bookingResult, setBookingResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleEventChange = (eventId) => {
    setSelectedEvent(eventId);
    setSelectedPerson(null);
    setRoomSelection(null);
    setBookingResult(null);
    setExpandedStep(1);
  };

  const handleRoomSelection = (selection) => {
    setRoomSelection(selection);
    setExpandedStep(3);
  };

  const handleConfirm = async ({ isPayable }) => {
    if (!selectedEvent) {
      toast.error('Please select an event first');
      return;
    }

    setIsLoading(true);
    try {
      // Format dates to YYYY-MM-DD in local timezone
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Calculate total cost
      const checkIn = roomSelection.checkIn;
      const checkOut = roomSelection.checkOut;
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      const pricePerNight = roomSelection.roomType.price_per_night;
      const totalCost = nights * pricePerNight;

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: selectedEvent,
          personId: selectedPerson.person_id,
          roomTypeId: roomSelection.roomType.room_type_id,
          checkInDate: formatDate(checkIn),
          checkOutDate: formatDate(checkOut),
          totalCost,
          payable: isPayable,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking');
      }

      setBookingResult({
        success: true,
        booking: data.booking,
      });
      setExpandedStep(4);
    } catch (error) {
      console.error('Error creating booking:', error);
      setBookingResult({
        success: false,
        error: error.message,
      });
      setExpandedStep(4);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setRoomSelection(null);
    setExpandedStep(2);
  };

  const handleReset = () => {
    setSelectedPerson(null);
    setRoomSelection(null);
    setBookingResult(null);
    setExpandedStep(1);
  };

  const toggleStep = (step) => {
    if (
      (step === 1 && !selectedPerson) ||
      (step === 2 && !selectedPerson) ||
      (step === 3 && !roomSelection) ||
      (step === 4 && !bookingResult)
    ) {
      return;
    }
    setExpandedStep(expandedStep === step ? 0 : step);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Accommodation Allocation</h1>
        <div className="w-[300px]">
          <EventSelector
            value={selectedEvent}
            onChange={handleEventChange}
          />
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Step 1: Select Person */}
        <Card className={!selectedEvent ? 'opacity-50' : ''}>
          <CardHeader 
            className={`${selectedEvent ? 'cursor-pointer hover:bg-gray-50' : ''}`}
            onClick={() => selectedEvent && toggleStep(1)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-sm font-medium">
                  1
                </span>
                <CardTitle className="flex items-center gap-2">
                  Select Person
                  {selectedPerson && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                </CardTitle>
              </div>
              {selectedPerson && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    {selectedPerson.first_name} {selectedPerson.last_name}
                  </span>
                  {expandedStep === 1 ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          {expandedStep === 1 && selectedEvent && (
            <CardContent>
              <PeopleList 
                eventId={selectedEvent}
                onPersonSelect={(person) => {
                  setSelectedPerson(person);
                  setExpandedStep(2);
                }}
                selectedPerson={selectedPerson}
              />
            </CardContent>
          )}
        </Card>

        {/* Step 2: Select Hotel & Room */}
        <Card className={!selectedPerson ? 'opacity-50' : ''}>
          <CardHeader 
            className={`${selectedPerson ? 'cursor-pointer hover:bg-gray-50' : ''}`}
            onClick={() => toggleStep(2)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-sm font-medium">
                  2
                </span>
                <CardTitle className="flex items-center gap-2">
                  Select Hotel & Room
                  {roomSelection && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                </CardTitle>
              </div>
              {roomSelection && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    {roomSelection.roomType.hotel.name} - {roomSelection.roomType.name}
                  </span>
                  {expandedStep === 2 ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          {expandedStep === 2 && selectedPerson && (
            <CardContent>
              <AccommodationHotelList 
                eventId={selectedEvent}
                personId={selectedPerson.person_id}
                onRoomSelection={handleRoomSelection}
              />
            </CardContent>
          )}
        </Card>

        {/* Step 3: Confirm Booking */}
        <Card className={!roomSelection ? 'opacity-50' : ''}>
          <CardHeader 
            className={`${roomSelection ? 'cursor-pointer hover:bg-gray-50' : ''}`}
            onClick={() => toggleStep(3)}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-sm font-medium">
                3
              </span>
              <CardTitle className="flex items-center gap-2">
                Confirm Booking
                {bookingResult && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
              </CardTitle>
            </div>
          </CardHeader>
          {expandedStep === 3 && roomSelection && (
            <CardContent>
              <AccommodationConfirmation
                person={selectedPerson}
                selection={roomSelection}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                isLoading={isLoading}
              />
            </CardContent>
          )}
        </Card>

        {/* Step 4: Booking Result */}
        {bookingResult && (
          <Card>
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => toggleStep(4)}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-sm font-medium">
                  4
                </span>
                <CardTitle className="flex items-center gap-2">
                  Booking Status
                  {bookingResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            {expandedStep === 4 && (
              <CardContent>
                {bookingResult.success ? (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-green-50 p-4 text-green-700">
                      <h3 className="font-medium">Booking Confirmed</h3>
                      <p className="mt-1 text-sm">
                        Successfully booked room for {selectedPerson.first_name} {selectedPerson.last_name}
                      </p>
                      <p className="mt-2 text-sm">
                        Hotel: {bookingResult.booking.hotel_name}<br />
                        Room Type: {bookingResult.booking.room_type_name}<br />
                        Total Cost: €{bookingResult.booking.total_cost}
                      </p>
                    </div>
                    <Button onClick={handleReset}>
                      Make Another Booking
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg bg-red-50 p-4 text-red-700">
                      <h3 className="font-medium">Booking Failed</h3>
                      <p className="mt-1 text-sm">{bookingResult.error}</p>
                    </div>
                    <div className="flex gap-4">
                      <Button onClick={handleReset} variant="outline">
                        Start Over
                      </Button>
                      <Button onClick={() => setExpandedStep(3)} variant="default">
                        Try Again
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
