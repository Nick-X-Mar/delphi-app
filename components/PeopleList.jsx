'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useDebounce } from 'use-debounce';
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate, formatDateTime } from '@/utils/dateFormatters';

export default function PeopleList({ eventId, onPersonSelect, selectedPerson }) {
  const [people, setPeople] = useState([]);
  const [filters, setFilters] = useState({
    firstName: '',
    lastName: '',
    email: '',
    onlyAvailable: true,
    hideNotAttending: true
  });
  const [debouncedFilters] = useDebounce(filters, 500);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });

  // Fetch people data when debounced filters or pagination changes
  useEffect(() => {
    const fetchPeople = async () => {
      if (!eventId) return;
      
      try {
        setIsLoading(true);
        const queryParams = new URLSearchParams({
          page: pagination.currentPage,
          limit: pagination.itemsPerPage,
          firstName: debouncedFilters.firstName,
          lastName: debouncedFilters.lastName,
          email: debouncedFilters.email,
          onlyAvailable: debouncedFilters.onlyAvailable,
          hideNotAttending: debouncedFilters.hideNotAttending
        });

        const response = await fetch(`/api/events/${eventId}/people?${queryParams}`);
        if (!response.ok) {
          throw new Error('Failed to fetch people');
        }
        const data = await response.json();
        setPeople(data.items || []);
        setPagination(prev => ({
          ...prev,
          totalPages: Math.ceil(data.total / pagination.itemsPerPage),
          totalItems: data.total
        }));
      } catch (error) {
        console.error('Error fetching people:', error);
        setPeople([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPeople();
  }, [eventId, pagination.currentPage, pagination.itemsPerPage, debouncedFilters]);

  // Handle filter changes without losing focus
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Reset to first page when filters change - in a separate useEffect
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
  }, [debouncedFilters]);

  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      currentPage: newPage
    }));
  };

  const handlePersonClick = (person) => {
    if (person.booking_id) {
      // Don't do anything if the person already has a booking
      return;
    }
    if (person.will_not_attend) {
      // Don't do anything if the person will not attend
      return;
    }
    onPersonSelect(person);
  };

  // Render the filter section separately to avoid re-rendering
  const renderFilters = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
      <div className="flex flex-col gap-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="onlyAvailable"
            checked={filters.onlyAvailable}
            onCheckedChange={(checked) => handleFilterChange('onlyAvailable', checked)}
          />
          <label
            htmlFor="onlyAvailable"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Available for Accommodation
          </label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="hideNotAttending"
            checked={filters.hideNotAttending}
            onCheckedChange={(checked) => handleFilterChange('hideNotAttending', checked)}
          />
          <label
            htmlFor="hideNotAttending"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Hide People Not Attending
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {renderFilters()}

      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <div className="text-gray-500">Loading...</div>
          </div>
        )}
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Synced at</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Number of pax</TableHead>
              <TableHead>Companion</TableHead>
              <TableHead>Stay Together</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead>Check-out</TableHead>
              {!filters.onlyAvailable && (
                <TableHead>Current Booking</TableHead>
              )}
              <TableHead>Guest Type</TableHead>
              <TableHead className="w-[200px]">Comments</TableHead>
              <TableHead className="w-[200px]">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {people.length === 0 ? (
              <TableRow>
                <TableCell colSpan={filters.onlyAvailable ? 12 : 13} className="text-center py-8 text-gray-500">
                  No people available for accommodation
                </TableCell>
              </TableRow>
            ) : (
              people.map((person) => (
                <TableRow 
                  key={person.person_id}
                  className={`
                    ${person.booking_id ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer hover:bg-gray-100'}
                    ${selectedPerson?.person_id === person.person_id ? 'bg-blue-50' : ''}
                    ${person.will_not_attend ? 'line-through text-gray-500 cursor-not-allowed' : ''}
                  `}
                  onClick={() => handlePersonClick(person)}
                  title={
                    person.booking_id 
                      ? "This person already has a booking and cannot be selected"
                      : person.will_not_attend
                        ? "This person will not attend and cannot be selected"
                        : ""
                  }
                >
                  <TableCell>{formatDateTime(person.synced_at)}</TableCell>
                  <TableCell>
                    {person.first_name} {person.last_name}
                  </TableCell>
                  <TableCell>{person.email}</TableCell>
                  <TableCell>{person.company}</TableCell>
                  <TableCell>{person.room_size || (person.room_type === 'single' ? '1' : person.room_type === 'double' ? '2' : '-')}</TableCell>
                  <TableCell>{person.companion_full_name || '-'}</TableCell>
                  <TableCell>{person.group_id ? `Group ${person.group_id}` : '-'}</TableCell>
                  <TableCell>{formatDate(person.checkin_date) || '-'}</TableCell>
                  <TableCell>{formatDate(person.checkout_date) || '-'}</TableCell>
                  {!filters.onlyAvailable && (
                    <TableCell>
                      {person.booking_id ? (
                        <span className="text-sm">
                          {person.hotel_name} - {person.room_type_name}
                          <br />
                          <span className="text-gray-500">
                            {formatDate(person.check_in_date)} - {formatDate(person.check_out_date)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-500">No current booking</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>{person.guest_type || '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={person.comments}>
                    {person.comments || '-'}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={person.notes}>
                    {person.notes || '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing {people.length > 0 ? ((pagination.currentPage - 1) * pagination.itemsPerPage) + 1 : 0} to {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} people
        </p>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-900 hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-50"
          >
            ←
          </button>
          <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary text-primary-foreground">
            {pagination.currentPage}
          </div>
          <button
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="h-8 w-8 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-900 hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-50"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
} 