'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useDebounce } from 'use-debounce';
import { Checkbox } from "@/components/ui/checkbox";

export default function PeopleList({ eventId, onPersonSelect, selectedPerson }) {
  const [people, setPeople] = useState([]);
  const [filters, setFilters] = useState({
    firstName: '',
    lastName: '',
    email: '',
    onlyAvailable: true
  });
  const [debouncedFilters] = useDebounce(filters, 300);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPeople = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/events/${eventId}/people`);
        if (!response.ok) {
          throw new Error('Failed to fetch people');
        }
        const data = await response.json();
        setPeople(data);
      } catch (error) {
        console.error('Error fetching people:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId) {
      fetchPeople();
    }
  }, [eventId]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const filteredPeople = people.filter(person => {
    const matchesFirstName = person.first_name?.toLowerCase().includes(filters.firstName.toLowerCase());
    const matchesLastName = person.last_name?.toLowerCase().includes(filters.lastName.toLowerCase());
    const matchesEmail = person.email?.toLowerCase().includes(filters.email.toLowerCase());
    const isAvailable = !filters.onlyAvailable || !person.booking_id;

    return matchesFirstName && matchesLastName && matchesEmail && isAvailable;
  });

  if (isLoading) {
    return <div className="text-center py-4">Loading people...</div>;
  }

  if (people.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500">
        No people assigned to this event. Please assign people to the event first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
        <div className="flex items-end">
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
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Room Size</TableHead>
            <TableHead>Stay Together</TableHead>
            <TableHead>Current Booking</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPeople.map((person) => (
            <TableRow 
              key={person.person_id}
              className={`cursor-pointer hover:bg-gray-100 ${
                selectedPerson?.person_id === person.person_id ? 'bg-blue-50' : ''
              }`}
              onClick={() => onPersonSelect(person)}
            >
              <TableCell>
                {person.first_name} {person.last_name}
              </TableCell>
              <TableCell>{person.email}</TableCell>
              <TableCell>{person.company}</TableCell>
              <TableCell>{person.room_size || '-'}</TableCell>
              <TableCell>{person.group_id ? `Group ${person.group_id}` : '-'}</TableCell>
              <TableCell>
                {person.booking_id ? (
                  <span className="text-sm">
                    {person.hotel_name} - {person.room_type_name}
                    <br />
                    <span className="text-gray-500">
                      {new Date(person.check_in_date).toLocaleDateString()} - {new Date(person.check_out_date).toLocaleDateString()}
                    </span>
                  </span>
                ) : (
                  <span className="text-gray-500">No current booking</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 