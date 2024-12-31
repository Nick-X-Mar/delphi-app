'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import PeopleList from '@/components/PeopleList';
import AccommodationHotelList from '@/components/AccommodationHotelList';
import AccommodationConfirmation from '@/components/AccommodationConfirmation';
import { toast } from 'sonner';

export default function Allocation() {
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [roomSelection, setRoomSelection] = useState(null);
  const [expandedStep, setExpandedStep] = useState(1);

  const handleRoomSelection = (selection) => {
    setRoomSelection(selection);
    setExpandedStep(3);
  };

  const handleConfirm = async () => {
    // TODO: Implement booking confirmation API call
    toast.success('Booking confirmed!');
  };

  const handleCancel = () => {
    setRoomSelection(null);
    setExpandedStep(2);
  };

  const toggleStep = (step) => {
    if (
      (step === 1 && !selectedPerson) ||
      (step === 2 && !selectedPerson) ||
      (step === 3 && !roomSelection)
    ) {
      return;
    }
    setExpandedStep(expandedStep === step ? 0 : step);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Accommodation Allocation</h1>
      
      <div className="space-y-4">
        {/* Step 1: Select Person */}
        <Card>
          <CardHeader 
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => toggleStep(1)}
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
          {expandedStep === 1 && (
            <CardContent>
              <PeopleList 
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
              <CardTitle>Confirm Booking</CardTitle>
            </div>
          </CardHeader>
          {expandedStep === 3 && roomSelection && (
            <CardContent>
              <AccommodationConfirmation
                person={selectedPerson}
                selection={roomSelection}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
              />
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
