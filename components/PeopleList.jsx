'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useDebounce } from 'use-debounce';

export default function PeopleList({ eventId, onPersonSelect, selectedPerson }) {
  const [people, setPeople] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
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

  const filteredPeople = people.filter(person => {
    const searchLower = debouncedSearchTerm.toLowerCase();
    return (
      person.first_name?.toLowerCase().includes(searchLower) ||
      person.last_name?.toLowerCase().includes(searchLower) ||
      person.email?.toLowerCase().includes(searchLower) ||
      person.department?.toLowerCase().includes(searchLower)
    );
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
      <Input
        type="text"
        placeholder="Search by name, email, or department..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Checkin</TableHead>
            <TableHead>Checkout</TableHead>
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
              <TableCell>{person.department}</TableCell>
              <TableCell>
                {person.checkin_date && new Date(person.checkin_date).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {person.checkout_date && new Date(person.checkout_date).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {person.booking_id ? (
                  <span className="text-sm">
                    {person.hotel_name} - {person.room_type_name}
                    <br />
                    <span className="text-gray-500">
                      {new Date(person.booking_check_in).toLocaleDateString()} - {new Date(person.booking_check_out).toLocaleDateString()}
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