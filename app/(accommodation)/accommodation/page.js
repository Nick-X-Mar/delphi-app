'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import AccommodationTable from '@/components/AccommodationTable';
import EventSelector from '@/components/EventSelector';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getHotelCategories } from '@/lib/hotelCategories';

export default function Accommodation() {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filters, setFilters] = useState({
    // People filters
    firstName: '',
    lastName: '',
    email: '',
    guestType: 'all',
    // Hotel filters
    hotelSearch: '',
    hotelCategory: 'all'
  });

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    ...getHotelCategories()
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Accommodation Management</h1>
        <div className="w-[300px]">
          <EventSelector
            value={selectedEvent}
            onChange={setSelectedEvent}
          />
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* People Filters */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500">People Filters</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    First Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Filter by first name"
                    value={filters.firstName}
                    onChange={(e) => handleFilterChange('firstName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Last Name
                  </label>
                  <Input
                    type="text"
                    placeholder="Filter by last name"
                    value={filters.lastName}
                    onChange={(e) => handleFilterChange('lastName', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Email
                  </label>
                  <Input
                    type="text"
                    placeholder="Filter by email"
                    value={filters.email}
                    onChange={(e) => handleFilterChange('email', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Guest Type
                  </label>
                  <Select
                    value={filters.guestType}
                    onValueChange={(value) => handleFilterChange('guestType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Guest Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Guest Types</SelectItem>
                      <SelectItem value="speaker">Speaker</SelectItem>
                      <SelectItem value="press">Press</SelectItem>
                      <SelectItem value="guest">Guest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Hotel Filters */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500">Hotel Filters</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1 block">
                    Search Hotels
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search by name or location..."
                      value={filters.hotelSearch}
                      onChange={(e) => handleFilterChange('hotelSearch', e.target.value)}
                      className="pl-8"
                    />
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Category
                  </label>
                  <Select
                    value={filters.hotelCategory}
                    onValueChange={(value) => handleFilterChange('hotelCategory', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      <Card className="p-6">
        <AccommodationTable 
          eventId={selectedEvent}
          filters={filters}
        />
      </Card>
    </div>
  );
}
