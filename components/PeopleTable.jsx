'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { toast } from 'sonner';
import { formatDate, formatDateTime, calculateNights } from '@/utils/dateFormatters';
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

export default function PeopleTable({ isViewOnly = false, selectedEvent = null, onEventChange = null }) {
  const [people, setPeople] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [groupColors, setGroupColors] = useState({});
  const [filters, setFilters] = useState({
    eventId: selectedEvent || 'all',
    firstName: '',
    lastName: '',
    email: '',
    guestType: 'all',
    allocationStatus: 'all',
    minNights: ''
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
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  // Initialize event filter with selectedEvent or working event when events are loaded
  useEffect(() => {
    if (events.length === 0) return;
    
    if (selectedEvent && events.find(e => e.event_id.toString() === selectedEvent)) {
      // Use selectedEvent from parent if it exists in events
      setFilters(prev => {
        if (prev.eventId !== selectedEvent) {
          return { ...prev, eventId: selectedEvent };
        }
        return prev;
      });
    } else if (!selectedEvent && filters.eventId === 'all') {
      // If no selectedEvent and filter is still 'all', use working event or first event
      const workingEventId = typeof window !== 'undefined' 
        ? localStorage.getItem('workingEventId') 
        : null;
      const eventToUse = workingEventId && events.find(e => e.event_id.toString() === workingEventId)
        ? workingEventId
        : events[0].event_id.toString();
      setFilters(prev => ({ ...prev, eventId: eventToUse }));
      if (onEventChange) {
        onEventChange(eventToUse);
      }
    }
  }, [events, selectedEvent, onEventChange, filters.eventId]);

  // Update filters when selectedEvent changes from parent
  useEffect(() => {
    if (selectedEvent && selectedEvent !== filters.eventId && events.length > 0 && events.find(e => e.event_id.toString() === selectedEvent)) {
      setFilters(prev => ({ ...prev, eventId: selectedEvent }));
    }
  }, [selectedEvent, filters.eventId, events]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/people/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data);
      // Reset filter if selected guest type no longer exists
      setFilters(prev => {
        if (prev.guestType !== 'all' && !data.includes(prev.guestType)) {
          return { ...prev, guestType: 'all' };
        }
        return prev;
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  useEffect(() => {
    fetchCategories();
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
      if (debouncedFilters.guestType && debouncedFilters.guestType !== 'all') params.append('guestType', debouncedFilters.guestType);
      if (debouncedFilters.allocationStatus && debouncedFilters.allocationStatus !== 'all') params.append('allocationStatus', debouncedFilters.allocationStatus);
      
      const response = await fetch(`/api/people?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch people');
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      let filteredPeople = data.data || [];
      
      // Client-side filtering by nights
      if (debouncedFilters.minNights && debouncedFilters.minNights !== '') {
        const minNights = parseInt(debouncedFilters.minNights);
        if (!isNaN(minNights)) {
          filteredPeople = filteredPeople.filter(person => {
            const nights = calculateNights(person.checkin_date, person.checkout_date);
            return nights !== null && nights >= minNights;
          });
        }
      }
      
      setPeople(filteredPeople); // Ensure we always set an array
      // Note: totalItems keeps the original total for pagination, filtering applies to current page only
      setTotalItems(data.pagination.total);
      setSelectedPeople(new Set()); // Clear selection when data changes
      fetchCategories(); // Refresh guest type filter options
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
  }, [currentPage, itemsPerPage, debouncedFilters]);

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when page size changes
  };

  const handleEdit = (person) => {
    setEditPerson(person);
    setFormData({
      company: person.company || '',
      job_title: person.job_title || '',
      room_size: person.room_size || '',
      group_id: person.group_id || '',
      notes: person.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Event
              </label>
              <Select
                value={filters.eventId}
                onValueChange={(value) => {
                  handleFilterChange('eventId', value);
                  if (onEventChange && value !== 'all') {
                    onEventChange(value);
                  }
                }}
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
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
                  {categories.map(guestType => (
                    <SelectItem key={guestType} value={guestType}>
                      {guestType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Allocation Status
              </label>
              <Select
                value={filters.allocationStatus}
                onValueChange={(value) => handleFilterChange('allocationStatus', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="allocated">Allocated</SelectItem>
                  <SelectItem value="not_allocated">Not Allocated</SelectItem>
                  <SelectItem value="will_not_attend">Will Not Attend</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Min Nights
              </label>
              <Input
                type="number"
                placeholder="Minimum nights..."
                value={filters.minNights}
                onChange={(e) => handleFilterChange('minNights', e.target.value)}
                min="0"
              />
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
            <TableHead className="w-[80px]">Allocated</TableHead>
            <TableHead>Synced at</TableHead>
            <TableHead>First Name</TableHead>
            <TableHead>Last Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Job Title</TableHead>
            <TableHead>Number of pax</TableHead>
            <TableHead>Stay Together</TableHead>
            <TableHead>Checkin</TableHead>
            <TableHead>Checkout</TableHead>
            <TableHead>Nights</TableHead>
            <TableHead>Mobile Phone</TableHead>
            <TableHead>Guest Type</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.map((person) => (
            <TableRow 
              key={person.person_id}
              className={`${
                person.will_not_attend ? 'line-through text-gray-500' : ''
              } hover:bg-gray-50 cursor-pointer`}
              onClick={isViewOnly ? undefined : () => handleEdit(person)}
            >
              <TableCell>
                <Checkbox
                  checked={!!person.booking_id}
                  disabled={true}
                  className={person.will_not_attend ? 'opacity-30' : ''}
                />
              </TableCell>
              <TableCell>{formatDateTime(person.synced_at)}</TableCell>
              <TableCell>{person.first_name}</TableCell>
              <TableCell>{person.last_name}</TableCell>
              <TableCell>{person.email}</TableCell>
              <TableCell>{person.company}</TableCell>
              <TableCell>{person.job_title}</TableCell>
              <TableCell>{person.room_size || (person.room_type === 'single' ? '1' : person.room_type === 'double' ? '2' : '-')}</TableCell>
              <TableCell>
                {person.group_id ? (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${getGroupColor(person.group_id)}`}>
                    {person.group_id}
                  </span>
                ) : '-'}
              </TableCell>
              <TableCell>
                {person.checkin_date && formatDate(person.checkin_date)}
              </TableCell>
              <TableCell>
                {person.checkout_date && formatDate(person.checkout_date)}
              </TableCell>
              <TableCell>
                {(() => {
                  const nights = calculateNights(person.checkin_date, person.checkout_date);
                  return nights !== null ? nights : '-';
                })()}
              </TableCell>
              <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {person.mobile_phone}
              </TableCell>
              <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {person.guest_type}
              </TableCell>
              <TableCell className="px-6 py-4 text-sm text-gray-500">
                {person.notes}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(person)}
                  disabled={isViewOnly}
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
        onItemsPerPageChange={handleItemsPerPageChange}
      />

      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
          onKeyDown={(e) => { if (e.key === 'Escape') setShowModal(false); }}
          tabIndex={-1}
          ref={(el) => el?.focus()}
        >
          <div className="bg-white rounded-xl shadow-2xl w-[85%] max-h-[90vh] flex flex-col border">
            <div className="p-8 pb-4">
              <h2 className="text-2xl font-semibold text-gray-800">Edit Person Details</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-8 pb-4">
              <PersonForm
                person={editPerson}
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSubmit}
                onCancel={() => setShowModal(false)}
                onDelete={() => { setShowModal(false); fetchPeople(); }}
                isViewOnly={isViewOnly}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 