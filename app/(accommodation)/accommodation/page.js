'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import AccommodationTable from '@/components/AccommodationTable';
import EventSelector from '@/components/EventSelector';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getHotelCategories } from '@/lib/hotelCategories';
import React from 'react';

export default function Accommodation() {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filters, setFilters] = useState({
    // People filters
    firstName: '',
    lastName: '',
    email: '',
    guestType: 'all',
    company: 'all',
    // Hotel filters
    hotelSearch: '',
    hotelCategory: 'all'
  });

  const [companies, setCompanies] = useState([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);
  const [isCancellingBookings, setIsCancellingBookings] = useState(false);
  const accommodationTableRef = React.useRef();

  // Fetch companies on component mount
  useEffect(() => {
    const fetchCompanies = async () => {
      setIsLoadingCompanies(true);
      try {
        const response = await fetch('/api/people-details/companies');
        const data = await response.json();
        setCompanies([{ value: 'all', label: 'All Companies' }, ...data]);
      } catch (error) {
        console.error('Failed to fetch companies:', error);
      } finally {
        setIsLoadingCompanies(false);
      }
    };

    fetchCompanies();
  }, []);

  const handleFilterChange = (field, value) => {
    setFilters(prev => {
      // If company filter is being changed
      if (field === 'company') {
        return {
          ...prev,
          company: value,
          firstName: '',
          lastName: '',
          email: '',
          guestType: 'all',
          hotelSearch: '',
          hotelCategory: 'all'
        };
      }
      // If any other filter is being changed, reset company filter
      if (value && prev.company !== 'all') {
        return {
          ...prev,
          [field]: value,
          company: 'all'
        };
      }
      return {
        ...prev,
        [field]: value
      };
    });
  };

  const categories = [
    { value: 'all', label: 'All Categories' },
    ...getHotelCategories()
  ];

  const handleCancelCompanyBookings = async () => {
    if (!selectedEvent || filters.company === 'all') return;

    try {
      // First get all bookings for this company to show in confirmation
      const response = await fetch(`/api/events/${selectedEvent}/bookings?company=${filters.company}`);
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const { bookings } = await response.json();

      if (!bookings || bookings.length === 0) {
        toast.info('No active bookings found for this company');
        return;
      }

      const companyName = companies.find(c => c.value === filters.company)?.label || filters.company;
      const confirmMessage = `Are you sure you want to cancel all bookings for ${companyName}?\n\n` +
        `This will cancel ${bookings.length} booking(s).\n` +
        `This action cannot be undone.`;

      if (!confirm(confirmMessage)) return;

      setIsCancellingBookings(true);

      // Cancel all bookings
      const cancelResponse = await fetch(`/api/events/${selectedEvent}/bookings/cancel-by-company`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company: filters.company
        }),
      });

      if (!cancelResponse.ok) throw new Error('Failed to cancel bookings');

      const { cancelledCount } = await cancelResponse.json();
      toast.success(`Successfully cancelled ${cancelledCount} booking(s)`);

      // Reset company filter to 'all'
      handleFilterChange('company', 'all');
      
      // Refresh the accommodation table data
      if (accommodationTableRef.current?.fetchData) {
        await accommodationTableRef.current.fetchData();
      }
    } catch (error) {
      console.error('Error cancelling company bookings:', error);
      toast.error('Failed to cancel bookings');
    } finally {
      setIsCancellingBookings(false);
    }
  };

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
                    disabled={filters.company !== 'all'}
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
                    disabled={filters.company !== 'all'}
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
                    disabled={filters.company !== 'all'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Guest Type
                  </label>
                  <Select
                    value={filters.guestType}
                    onValueChange={(value) => handleFilterChange('guestType', value)}
                    disabled={filters.company !== 'all'}
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
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">
                    Company
                  </label>
                  <Select
                    value={filters.company}
                    onValueChange={(value) => handleFilterChange('company', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map(company => (
                        <SelectItem 
                          key={company.value} 
                          value={company.value}
                          disabled={isLoadingCompanies}
                        >
                          {isLoadingCompanies ? 'Loading...' : company.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {filters.company !== 'all' && (
                  <Button
                    variant="secondary"
                    onClick={handleCancelCompanyBookings}
                    disabled={isCancellingBookings}
                    className="whitespace-nowrap bg-red-900 text-white hover:bg-red-800"
                  >
                    {isCancellingBookings ? 'Cancelling...' : 'Cancel all Company Bookings'}
                  </Button>
                )}
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
                      disabled={filters.company !== 'all'}
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
                    disabled={filters.company !== 'all'}
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
          ref={accommodationTableRef}
          eventId={selectedEvent}
          filters={filters}
        />
      </Card>
    </div>
  );
}
