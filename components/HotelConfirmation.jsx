'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDate } from '@/utils/dateFormatters';

export default function HotelConfirmation({ isOpen, onClose, onConfirm, hotelName, eventId }) {
  const [eventDetails, setEventDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && eventId) {
      setIsLoading(true);
      fetch(`/api/events/${eventId}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setEventDetails(data);
          }
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error fetching event details:', error);
          setIsLoading(false);
        });
    } else {
      setEventDetails(null);
    }
  }, [isOpen, eventId]);

  const handleConfirm = () => {
    onConfirm();
  };

  const eventDisplayName = eventDetails?.tag || eventDetails?.name || 'Unknown Event';
  const eventDates = eventDetails 
    ? `${formatDate(eventDetails.start_date)} - ${formatDate(eventDetails.end_date)}`
    : 'Loading...';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Hotel Creation</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-2">
          {isLoading ? (
            <p className="text-gray-600">Loading event details...</p>
          ) : (
            <>
              <p className="text-gray-700">
                You are creating a new Hotel: <span className="font-semibold">{hotelName}</span>
              </p>
              <p className="text-gray-700">
                for event: <span className="font-semibold">{eventDisplayName}</span>
              </p>
              {eventDetails && (
                <p className="text-gray-700">
                  and dates: <span className="font-semibold">{eventDates}</span>
                </p>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

