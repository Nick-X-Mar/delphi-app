'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StarIcon } from 'lucide-react';

export default function AccommodationConfirmation({ 
  person, 
  selection,
  onConfirm,
  onCancel 
}) {
  if (!person || !selection || !selection.roomType || !selection.roomType.hotel) {
    return null;
  }

  const { roomType, checkIn, checkOut } = selection;
  const { hotel } = roomType;

  // Calculate number of nights
  const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

  // Calculate total cost based on price per night
  const totalCost = nights * roomType.base_price_per_night;

  const renderStars = (count) => {
    return Array(count)
      .fill(null)
      .map((_, index) => (
        <StarIcon key={index} className="h-4 w-4 text-yellow-400 fill-current" />
      ));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm Accommodation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Person Details */}
        <div>
          <h3 className="font-medium mb-2">Guest Details</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{person.first_name} {person.last_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium">{person.email}</p>
              </div>
              {person.department && (
                <div>
                  <p className="text-sm text-gray-600">Department</p>
                  <p className="font-medium">{person.department}</p>
                </div>
              )}
              {person.position && (
                <div>
                  <p className="text-sm text-gray-600">Position</p>
                  <p className="font-medium">{person.position}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hotel & Room Details */}
        <div>
          <h3 className="font-medium mb-2">Accommodation Details</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Hotel</p>
                <div>
                  <p className="font-medium">{hotel.name}</p>
                  <div className="flex items-center mt-1">
                    {renderStars(hotel.stars)}
                  </div>
                  <p className="text-sm text-gray-600">{hotel.area}</p>
                  <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    {hotel.category}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Room Type</p>
                <p className="font-medium">{roomType.name}</p>
                <p className="text-sm text-gray-600">€{roomType.base_price_per_night} per night</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Check-in</p>
                  <p className="font-medium">{checkIn.toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Check-out</p>
                  <p className="font-medium">{checkOut.toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Summary */}
        <div>
          <h3 className="font-medium mb-2">Cost Summary</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between">
                <p className="text-gray-600">Number of nights</p>
                <p className="font-medium">{nights}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-gray-600">Price per night</p>
                <p className="font-medium">€{roomType.base_price_per_night}</p>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <p className="font-medium">Total Cost</p>
                  <p className="font-medium">€{totalCost}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Confirm Booking
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 