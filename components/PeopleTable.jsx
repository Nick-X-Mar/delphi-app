'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@/utils/dateFormatters';
import { format, parseISO } from 'date-fns';
import Pagination from '@/components/Pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit, UserPlus, UserMinus } from 'lucide-react';
import PersonForm from './PersonForm';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@radix-ui/react-label";

export default function PeopleTable() {
  const [people, setPeople] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [groupColors, setGroupColors] = useState({});
  const [filters, setFilters] = useState({
    eventId: 'all',
    firstName: '',
    lastName: '',
    email: '',
    category: 'all'
  });
  const [selectedPeople, setSelectedPeople] = useState(new Set());
  const [debouncedFilters] = useDebounce(filters, 500);
  const [showModal, setShowModal] = useState(false);
  const [editPerson, setEditPerson] = useState(null);
  const [formData, setFormData] = useState({
    company: '',
    job_title: '',
    room_size: '',
    checkin_date: '',
    checkout_date: '',
    notes: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (!response.ok) throw new Error('Failed to fetch events');
        const data = await response.json();
        setEvents(data);
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load events');
      }
    };

    fetchEvents();
  }, []);

  const fetchPeople = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (debouncedFilters.eventId && debouncedFilters.eventId !== 'all') params.append('eventId', debouncedFilters.eventId);
      if (debouncedFilters.firstName) params.append('firstName', debouncedFilters.firstName);
      if (debouncedFilters.lastName) params.append('lastName', debouncedFilters.lastName);
      if (debouncedFilters.email) params.append('email', debouncedFilters.email);
      if (debouncedFilters.category && debouncedFilters.category !== 'all') params.append('category', debouncedFilters.category);
      
      const response = await fetch(`/api/people?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch people');
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setPeople(data.data || []); // Ensure we always set an array
      setTotalItems(data.pagination.total);
      setSelectedPeople(new Set()); // Clear selection when data changes
    } catch (error) {
      console.error('Error fetching people:', error);
      toast.error('Failed to fetch people');
      setPeople([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPeople();
  }, [currentPage, debouncedFilters]);

  const handleEdit = (person) => {
    setEditPerson(person);
    setFormData({
      company: person.company || '',
      job_title: person.job_title || '',
      room_size: person.room_size || '',
      group_id: person.group_id || '',
      notes: person.notes || '',
      category: person.category || 'Regular'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/people-details/${editPerson.person_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update details');
      }

      toast.success('Successfully updated details');
      setShowModal(false);
      fetchPeople(); // Refresh the list
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.message || 'Failed to update details');
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedPeople(new Set(people.map(p => p.person_id)));
    } else {
      setSelectedPeople(new Set());
    }
  };

  const handleSelectPerson = (personId) => {
    const newSelected = new Set(selectedPeople);
    if (newSelected.has(personId)) {
      newSelected.delete(personId);
    } else {
      newSelected.add(personId);
    }
    setSelectedPeople(newSelected);
  };

  const handleAssignToEvent = async (eventId) => {
    if (selectedPeople.size === 0) {
      toast.error('Please select at least one person');
      return;
    }

    try {
      const response = await fetch(`/api/events/${eventId}/people`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personIds: Array.from(selectedPeople),
          action: 'add'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to assign people to event');
      }

      toast.success('Successfully assigned people to event');
      setSelectedPeople(new Set());
      fetchPeople();
    } catch (error) {
      console.error('Assignment error:', error);
      toast.error(error.message || 'Failed to assign people to event');
    }
  };

  const handleRemoveFromEvent = async () => {
    if (selectedPeople.size === 0) {
      toast.error('Please select at least one person');
      return;
    }

    if (!filters.eventId || filters.eventId === 'all') {
      toast.error('Please select an event first');
      return;
    }

    try {
      const response = await fetch(`/api/events/${filters.eventId}/people`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personIds: Array.from(selectedPeople),
          action: 'remove'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove people from event');
      }

      toast.success('Successfully removed people from event');
      setSelectedPeople(new Set());
      fetchPeople();
    } catch (error) {
      console.error('Removal error:', error);
      toast.error(error.message || 'Failed to remove people from event');
    }
  };

  const getGroupColor = (groupId) => {
    if (!groupId) return '';
    if (!groupColors[groupId]) {
      const colors = [
        'bg-blue-100 text-blue-800',
        'bg-green-100 text-green-800',
        'bg-purple-100 text-purple-800',
        'bg-yellow-100 text-yellow-800',
        'bg-pink-100 text-pink-800',
        'bg-indigo-100 text-indigo-800',
      ];
      const colorIndex = Object.keys(groupColors).length % colors.length;
      setGroupColors(prev => ({ ...prev, [groupId]: colors[colorIndex] }));
      return colors[colorIndex];
    }
    return groupColors[groupId];
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Filter People</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Event
              </label>
              <Select
                value={filters.eventId}
                onValueChange={(value) => handleFilterChange('eventId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {events.map(event => (
                    <SelectItem key={event.event_id} value={event.event_id.toString()}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <Input
                placeholder="Filter by first name..."
                value={filters.firstName}
                onChange={(e) => handleFilterChange('firstName', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <Input
                placeholder="Filter by last name..."
                value={filters.lastName}
                onChange={(e) => handleFilterChange('lastName', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <Input
                placeholder="Filter by email..."
                value={filters.email}
                onChange={(e) => handleFilterChange('email', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <Select
                value={filters.category}
                onValueChange={(value) => handleFilterChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="VVIP">VVIP</SelectItem>
                  <SelectItem value="VIP">VIP</SelectItem>
                  <SelectItem value="Regular">Regular</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {selectedPeople.size > 0 && (
          <div className="mt-4 flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {selectedPeople.size} people selected
            </span>
            {filters.eventId === 'all' ? (
              <Select
                onValueChange={handleAssignToEvent}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Assign to event..." />
                </SelectTrigger>
                <SelectContent>
                  {events.map(event => (
                    <SelectItem key={event.event_id} value={event.event_id.toString()}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveFromEvent}
                className="flex items-center gap-2"
              >
                <UserMinus className="h-4 w-4" />
                Remove from Event
              </Button>
            )}
          </div>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={selectedPeople.size === people.length && people.length > 0}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead>First Name</TableHead>
            <TableHead>Last Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Job Title</TableHead>
            <TableHead>Room Size</TableHead>
            <TableHead>Stay Together</TableHead>
            <TableHead>Checkin</TableHead>
            <TableHead>Checkout</TableHead>
            <TableHead>Mobile Phone</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.map((person) => (
            <TableRow 
              key={person.person_id}
              className={person.is_in_event ? 'bg-blue-50' : ''}
            >
              <TableCell>
                <Checkbox
                  checked={selectedPeople.has(person.person_id)}
                  onCheckedChange={() => handleSelectPerson(person.person_id)}
                />
              </TableCell>
              <TableCell>{person.first_name}</TableCell>
              <TableCell>{person.last_name}</TableCell>
              <TableCell>{person.email}</TableCell>
              <TableCell>{person.company}</TableCell>
              <TableCell>{person.job_title}</TableCell>
              <TableCell>{person.room_size}</TableCell>
              <TableCell>
                {person.group_id ? (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getGroupColor(person.group_id)}`}>
                    {person.group_id}
                  </span>
                ) : '-'}
              </TableCell>
              <TableCell>
                {person.checkin_date && new Date(person.checkin_date).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {person.checkout_date && new Date(person.checkout_date).toLocaleDateString()}
              </TableCell>
              <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {person.mobile_phone}
              </TableCell>
              <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {person.category || 'Regular'}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(person)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(totalItems / itemsPerPage)}
        onPageChange={handlePageChange}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-[85%] max-h-[90vh] overflow-y-auto border">
            <div className="p-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Edit Person Details</h2>
              <PersonForm
                person={editPerson}
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSubmit}
                onCancel={() => setShowModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 