'use client';

import { Button } from "@/components/ui/button";
import { StarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';

export default function AccommodationConfirmation({ 
  person, 
  selection,
  onConfirm,
  onCancel,
  isLoading
}) {
  const [isPayable, setIsPayable] = useState(true);

  if (!person || !selection) return null;

  const checkIn = selection.checkIn;
  const checkOut = selection.checkOut;
  const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  const pricePerNight = selection.roomType.price_per_night;
  const totalCost = nights * pricePerNight;

  const handleConfirm = () => {
    onConfirm({ isPayable });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Guest Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <p>Name: {person.first_name} {person.last_name}</p>
            <p>Email: {person.email}</p>
            <p>Department: {person.department}</p>
            <p>Position: {person.position}</p>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Accommodation Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <p>Hotel: {selection.roomType.hotel.name}</p>
            <p>Room Type: {selection.roomType.name}</p>
            <p>Check-in: {format(checkIn, 'PP')}</p>
            <p>Check-out: {format(checkOut, 'PP')}</p>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Cost Summary</h3>
          <div className="grid grid-cols-2 gap-4">
            <p>Number of nights: {nights}</p>
            <p>Price per night: €{pricePerNight.toFixed(2)}</p>
            <p className="font-medium">Total cost: €{totalCost.toFixed(2)}</p>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="payable"
                checked={isPayable}
                onCheckedChange={setIsPayable}
              />
              <label
                htmlFor="payable"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Payable by guest
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={isLoading}>
          {isLoading ? 'Confirming...' : 'Confirm Booking'}
        </Button>
      </div>
    </div>
  );
} 