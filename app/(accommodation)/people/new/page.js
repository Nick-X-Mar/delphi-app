'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { useViewOnlyMode } from '@/lib/viewOnlyMode';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { ArrowUpTrayIcon } from '@heroicons/react/24/solid';
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/dateFormatters';

export default function NewPersonPage() {
  const router = useRouter();
  const { isViewOnly, isLoading: isLoadingViewOnly } = useViewOnlyMode();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [errors, setErrors] = useState({});
  const [isClient, setIsClient] = useState(false);
  const [showCustomGuestType, setShowCustomGuestType] = useState(false);
  const [guestTypes, setGuestTypes] = useState([]);

  // Stay Together Group state
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [existingGroups, setExistingGroups] = useState([]);
  const [isNewGroup, setIsNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const [formData, setFormData] = useState({
    salutation: '',
    first_name: '',
    last_name: '',
    email: '',
    mobile_phone: '',
    nationality: '',
    company: '',
    job_title: '',
    guest_type: '',
    custom_guest_type: '',
    room_type: '',
    room_size: '',
    companion_full_name: '',
    companion_email: '',
    checkin_date: '',
    checkout_date: '',
    comments: '',
    notes: '',
    group_id: '',
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Redirect if in view-only mode
  useEffect(() => {
    if (!isLoadingViewOnly && isViewOnly) {
      toast.error('Cannot create person: Event has passed. All modifications are disabled.');
      router.push('/people');
    }
  }, [isViewOnly, isLoadingViewOnly, router]);

  // Fetch guest types
  useEffect(() => {
    async function fetchGuestTypes() {
      try {
        const response = await fetch('/api/people/categories');
        if (!response.ok) throw new Error('Failed to fetch guest types');
        const data = await response.json();
        setGuestTypes(data);
      } catch (error) {
        console.error('Error fetching guest types:', error);
      }
    }
    fetchGuestTypes();
  }, []);

  // Fetch events
  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await fetch('/api/events');
        if (!response.ok) throw new Error('Failed to fetch events');
        const data = await response.json();

        // Filter: only show events where end_date + 5 days >= today
        const today = new Date();
        const filtered = data.filter(event => {
          if (!event.end_date) return true;
          const endDate = new Date(event.end_date);
          endDate.setDate(endDate.getDate() + 5);
          return endDate >= today;
        });

        setEvents(filtered);

        if (isClient) {
          const workingEventId = localStorage.getItem('workingEventId');
          if (workingEventId) {
            const workingEvent = filtered.find(e => e.event_id.toString() === workingEventId);
            if (workingEvent) {
              setSelectedEventId(workingEventId);
              setErrors(prev => ({ ...prev, event: undefined }));
              return;
            }
          }
          // Auto-select first event if no working event
          if (filtered.length > 0) {
            setSelectedEventId(filtered[0].event_id.toString());
            setErrors(prev => ({ ...prev, event: undefined }));
          }
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load events');
      }
    }
    fetchEvents();
  }, [isClient]);

  // Fetch existing groups
  useEffect(() => {
    async function fetchGroups() {
      try {
        const response = await fetch('/api/people/groups');
        if (!response.ok) throw new Error('Failed to fetch groups');
        const data = await response.json();
        setExistingGroups(data.map(g => g.group_id));
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    }
    fetchGroups();
  }, []);

  // Listen for working event changes
  useEffect(() => {
    const handleWorkingEventChange = () => {
      if (typeof window !== 'undefined') {
        const workingEventId = localStorage.getItem('workingEventId');
        if (workingEventId) {
          const workingEvent = events.find(e => e.event_id.toString() === workingEventId);
          if (workingEvent) {
            setSelectedEventId(workingEventId);
            setErrors(prev => ({ ...prev, event: undefined }));
          }
        }
      }
    };
    window.addEventListener('workingEventChanged', handleWorkingEventChange);
    return () => window.removeEventListener('workingEventChanged', handleWorkingEventChange);
  }, [events]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSelectChange = (name, value) => {
    if (name === 'guest_type' && value === '__other__') {
      setShowCustomGuestType(true);
      setFormData(prev => ({ ...prev, guest_type: '', custom_guest_type: '' }));
      return;
    }
    if (name === 'room_type') {
      const roomSize = value === 'single' ? '1' : value === 'double' ? '2' : '';
      setFormData(prev => ({ ...prev, [name]: value, room_size: roomSize }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleGroupSelect = (group) => {
    if (group === 'new') {
      setIsNewGroup(true);
      setGroupOpen(false);
      return;
    }
    setFormData(prev => ({ ...prev, group_id: group }));
    setGroupOpen(false);
    setIsNewGroup(false);
  };

  const handleNewGroupSubmit = () => {
    if (newGroupName.trim()) {
      setFormData(prev => ({ ...prev, group_id: newGroupName.trim() }));
      setExistingGroups(prev => [...prev, newGroupName.trim()]);
      setNewGroupName('');
      setIsNewGroup(false);
    }
  };

  const handleRemoveGroup = () => {
    setFormData(prev => ({ ...prev, group_id: '' }));
    setIsNewGroup(false);
    setNewGroupName('');
  };

  // Get selected event object and its accommodation period
  const selectedEvent = events.find(e => e.event_id.toString() === selectedEventId);
  const accommStart = selectedEvent?.accommodation_start_date || null;
  const accommEnd = selectedEvent?.accommodation_end_date || null;

  const validateForm = () => {
    const newErrors = {};
    if (!formData.first_name) newErrors.first_name = 'First name is required';
    if (!formData.last_name) newErrors.last_name = 'Last name is required';
    if (formData.email && !formData.email.includes('@')) {
      newErrors.email = 'Invalid email format';
    }
    if (formData.mobile_phone && !/^[\d\s+\-()]+$/.test(formData.mobile_phone)) {
      newErrors.mobile_phone = 'Only digits, spaces, +, -, () allowed';
    }
    const guestType = showCustomGuestType ? formData.custom_guest_type : formData.guest_type;
    if (!guestType) newErrors.guest_type = 'Guest type is required';
    if (!selectedEventId) newErrors.event = 'Event selection is required';

    // Date validation
    if (formData.checkin_date && formData.checkout_date) {
      if (formData.checkout_date <= formData.checkin_date) {
        newErrors.checkout_date = 'Check-out must be after check-in';
      }
    }
    if (accommStart && accommEnd) {
      if (formData.checkin_date && (formData.checkin_date < accommStart || formData.checkin_date > accommEnd)) {
        newErrors.checkin_date = 'Must be within accommodation period';
      }
      if (formData.checkout_date && (formData.checkout_date < accommStart || formData.checkout_date > accommEnd)) {
        newErrors.checkout_date = 'Must be within accommodation period';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);

      // Generate person_id: 9 + Date.now()
      const personId = '9' + Date.now().toString();

      const guestType = showCustomGuestType ? formData.custom_guest_type : formData.guest_type;

      const payload = {
        person_id: personId,
        salutation: formData.salutation || null,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        mobile_phone: formData.mobile_phone || null,
        nationality: formData.nationality || null,
        company: formData.company || null,
        job_title: formData.job_title || null,
        guest_type: guestType || null,
        room_type: formData.room_type || null,
        room_size: formData.room_size ? parseInt(formData.room_size) : null,
        companion_full_name: formData.companion_full_name || null,
        companion_email: formData.companion_email || null,
        checkin_date: formData.checkin_date || null,
        checkout_date: formData.checkout_date || null,
        comments: formData.comments || null,
        notes: formData.notes || null,
        group_id: formData.group_id || null,
        event_id: parseInt(selectedEventId),
        app_synced: false,
      };

      const response = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create person');
      }

      toast.success('Person created successfully');
      router.push('/people');
    } catch (error) {
      console.error('Error creating person:', error);
      toast.error(error.message || 'Failed to create person');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add New Person</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/people/import"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            Import
          </Link>
          <Button variant="outline" onClick={() => router.push('/people')}>
            Back to People
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1 — Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Salutation</label>
                <Select value={formData.salutation} onValueChange={(v) => handleSelectChange('salutation', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select salutation" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Mr.', 'Ms.', 'Mx.', 'Prof.', 'Doc.', 'Amb.'].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  First Name *
                  {errors.first_name && <span className="text-red-500 text-xs ml-1">{errors.first_name}</span>}
                </label>
                <Input
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  placeholder="First name"
                  className={errors.first_name ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Last Name *
                  {errors.last_name && <span className="text-red-500 text-xs ml-1">{errors.last_name}</span>}
                </label>
                <Input
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  placeholder="Last name"
                  className={errors.last_name ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                  {errors.email && <span className="text-red-500 text-xs ml-1">{errors.email}</span>}
                </label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email address (optional)"
                  className={errors.email ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mobile Phone
                  {errors.mobile_phone && <span className="text-red-500 text-xs ml-1">{errors.mobile_phone}</span>}
                </label>
                <Input
                  name="mobile_phone"
                  value={formData.mobile_phone}
                  onChange={handleChange}
                  placeholder="Mobile phone"
                  className={errors.mobile_phone ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nationality</label>
                <Input
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleChange}
                  placeholder="Nationality"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Company</label>
                <Input
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Company"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Job Title</label>
                <Input
                  name="job_title"
                  value={formData.job_title}
                  onChange={handleChange}
                  placeholder="Job title"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2 — Accommodation Details */}
        <Card>
          <CardHeader>
            <CardTitle>Accommodation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Guest Type *
                  {errors.guest_type && <span className="text-red-500 text-xs ml-1">{errors.guest_type}</span>}
                </label>
                {showCustomGuestType ? (
                  <div className="flex gap-2">
                    <Input
                      name="custom_guest_type"
                      value={formData.custom_guest_type}
                      onChange={handleChange}
                      placeholder="Enter custom guest type"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowCustomGuestType(false);
                        setFormData(prev => ({ ...prev, guest_type: '', custom_guest_type: '' }));
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Select value={formData.guest_type} onValueChange={(v) => handleSelectChange('guest_type', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select guest type" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...new Set(['speaker', 'press', 'guest', ...guestTypes])].map(type => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                      <SelectItem value="__other__">Other...</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Room Type</label>
                <Select value={formData.room_type} onValueChange={(v) => handleSelectChange('room_type', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select room type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="double">Double</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Number of Pax / Room Size</label>
                <Input
                  type="number"
                  name="room_size"
                  value={formData.room_size}
                  onChange={handleChange}
                  min="1"
                  placeholder="Auto-filled from room type"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Companion Full Name</label>
                <Input
                  name="companion_full_name"
                  value={formData.companion_full_name}
                  onChange={handleChange}
                  placeholder="Companion full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Companion Email</label>
                <Input
                  type="email"
                  name="companion_email"
                  value={formData.companion_email}
                  onChange={handleChange}
                  placeholder="Companion email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Check-in Date
                  {errors.checkin_date && <span className="text-red-500 text-xs ml-1">{errors.checkin_date}</span>}
                </label>
                <Input
                  type="date"
                  name="checkin_date"
                  value={formData.checkin_date}
                  onChange={handleChange}
                  min={accommStart || undefined}
                  max={accommEnd || undefined}
                  className={errors.checkin_date ? 'border-red-500' : ''}
                />
                {accommStart && accommEnd && (
                  <p className="text-xs text-gray-500 mt-1">
                    Accommodation period: {formatDate(accommStart)} – {formatDate(accommEnd)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Check-out Date
                  {errors.checkout_date && <span className="text-red-500 text-xs ml-1">{errors.checkout_date}</span>}
                </label>
                <Input
                  type="date"
                  name="checkout_date"
                  value={formData.checkout_date}
                  onChange={handleChange}
                  min={formData.checkin_date || accommStart || undefined}
                  max={accommEnd || undefined}
                  className={errors.checkout_date ? 'border-red-500' : ''}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3 — Event Assignment */}
        <Card>
          <CardHeader>
            <CardTitle>Event Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Event *
                {errors.event && <span className="text-red-500 text-xs ml-1">{errors.event}</span>}
              </label>
              <Select
                value={selectedEventId}
                onValueChange={(value) => {
                  setSelectedEventId(value);
                  setFormData(prev => ({ ...prev, checkin_date: '', checkout_date: '' }));
                  setErrors(prev => ({ ...prev, event: undefined, checkin_date: undefined, checkout_date: undefined }));
                }}
                required
              >
                <SelectTrigger className={errors.event ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select an event" suppressHydrationWarning />
                </SelectTrigger>
                <SelectContent>
                  {events.map(event => {
                    const displayName = event.tag || event.name;
                    const eventDates = event.start_date && event.end_date
                      ? ` (${formatDate(event.start_date)} - ${formatDate(event.end_date)})`
                      : '';
                    return (
                      <SelectItem key={event.event_id} value={event.event_id.toString()}>
                        {displayName}{eventDates}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Card 4 — Notes & Comments */}
        <Card>
          <CardHeader>
            <CardTitle>Notes & Comments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                Comments
                <span className="relative group">
                  <InformationCircleIcon className="h-4 w-4 text-gray-400 cursor-help" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    This is only for internal use
                  </span>
                </span>
              </label>
              <textarea
                name="comments"
                value={formData.comments}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Internal comments..."
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1">
                Notes
                <span className="relative group">
                  <InformationCircleIcon className="h-4 w-4 text-gray-400 cursor-help" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    This information reaches the hotels
                  </span>
                </span>
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Notes for hotels..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stay Together Group</label>
              <div className="flex gap-3">
                <Popover open={groupOpen} onOpenChange={setGroupOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={groupOpen}
                      className="flex-1 justify-between"
                      type="button"
                    >
                      {formData.group_id || 'Select existing group'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search groups..."
                        value={groupSearchTerm}
                        onChange={(e) => setGroupSearchTerm(e.target.value)}
                      />
                      <CommandList>
                        {existingGroups
                          .filter(group => group.toLowerCase().includes(groupSearchTerm.toLowerCase()))
                          .length === 0 ? (
                          <CommandEmpty>No groups found.</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {existingGroups
                              .filter(group => group.toLowerCase().includes(groupSearchTerm.toLowerCase()))
                              .map((group) => (
                                <CommandItem key={group} onSelect={() => handleGroupSelect(group)}>
                                  <Check className={cn('mr-2 h-4 w-4', formData.group_id === group ? 'opacity-100' : 'opacity-0')} />
                                  {group}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                {formData.group_id ? (
                  <Button type="button" onClick={handleRemoveGroup} className="bg-red-600 hover:bg-red-700">
                    <X className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="button" onClick={() => handleGroupSelect('new')} className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {isNewGroup && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Enter new group name..."
                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Button type="button" onClick={handleNewGroupSubmit} disabled={!newGroupName.trim()}>
                    Add Group
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/people')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Person'}
          </Button>
        </div>
      </form>

      <Toaster />
    </div>
  );
}
