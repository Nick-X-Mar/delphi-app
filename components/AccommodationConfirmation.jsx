'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';
import { useState, useMemo } from 'react';

export default function AccommodationConfirmation({ 
  person, 
  selection,
  onConfirm,
  onCancel,
  isLoading,
  isViewOnly = false
}) {
  const [daysPaidByGuest, setDaysPaidByGuest] = useState(0);

  if (!person || !selection) return null;

  const checkIn = selection.checkIn;
  const checkOut = selection.checkOut;
  const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  const pricePerNight = selection.roomType.price_per_night;
  const overnightStayTax = parseFloat(selection.roomType.hotel?.overnight_stay_tax) || 0;
  const totalCost = selection.totalCost != null ? selection.totalCost : nights * pricePerNight;
  const displayPricePerNight = nights > 0 && totalCost != null ? totalCost / nights : pricePerNight;

  const { guestCost, defCost } = useMemo(() => {
    if (!selection.dailyPrices || selection.dailyPrices.length === 0) {
      const avgPricePerNight = totalCost / nights;
      const guest = daysPaidByGuest * avgPricePerNight;
      return {
        guestCost: guest,
        defCost: totalCost - guest
      };
    }
    
    const guestDays = Math.min(Math.max(0, daysPaidByGuest), nights);
    const guestStartIndex = nights - guestDays;
    const guest = selection.dailyPrices
      .slice(guestStartIndex)
      .reduce((sum, dp) => sum + dp.price, 0);
    
    return {
      guestCost: guest,
      defCost: totalCost - guest
    };
  }, [daysPaidByGuest, nights, totalCost, selection.dailyPrices]);

  const handleDaysPaidChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value)) {
      setDaysPaidByGuest(0);
    } else {
      setDaysPaidByGuest(Math.min(Math.max(0, value), nights));
    }
  };

  const handleConfirm = () => {
    onConfirm({ daysPaidByGuest, guestCost, defCost });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Guest Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <p>Name: {person.first_name} {person.last_name}</p>
            <p>Email: {person.email}</p>
            <p>Company: {person.company}</p>
            <p>Job Title: {person.job_title}</p>
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
            <p>Price per night: €{displayPricePerNight.toFixed(2)} {selection.totalCost != null && nights > 1 ? '(avg)' : ''}{selection.isSinglePricing ? ' (single occupancy rate)' : ''}</p>
            {overnightStayTax > 0 && (
              <p className="text-sm text-gray-600">Includes overnight stay tax: €{overnightStayTax.toFixed(2)} / night</p>
            )}
            <p className="font-medium">Total cost: €{totalCost.toFixed(2)}</p>
            
            <div className="col-span-2 border-t pt-4 mt-2">
              <div className="flex items-center gap-4 mb-3">
                <label
                  htmlFor="daysPaidByGuest"
                  className="text-sm font-medium whitespace-nowrap"
                >
                  Days paid by guest:
                </label>
                <Input
                  id="daysPaidByGuest"
                  type="number"
                  min={0}
                  max={nights}
                  value={daysPaidByGuest}
                  onChange={handleDaysPaidChange}
                  disabled={isViewOnly}
                  className="w-20"
                />
                <span className="text-sm text-gray-500">/ {nights} nights</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <p>DEF cost ({nights - daysPaidByGuest} nights): <span className="font-medium">€{defCost.toFixed(2)}</span></p>
                <p>Guest cost ({daysPaidByGuest} nights): <span className="font-medium">€{guestCost.toFixed(2)}</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onCancel} disabled={isLoading || isViewOnly}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={isLoading || isViewOnly}>
          {isLoading ? 'Confirming...' : 'Confirm Booking'}
        </Button>
      </div>
    </div>
  );
} 