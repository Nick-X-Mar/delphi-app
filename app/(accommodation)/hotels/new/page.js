'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentIcon, XCircleIcon } from '@heroicons/react/24/solid';
import hotelConfig from '@/config/hotels.json';
import { StarRating } from '@/components/ui/star-rating';

export default function NewHotelPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [tempFile, setTempFile] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    area: '',
    stars: '',
    address: '',
    phone_number: '',
    email: '',
    website_link: '',
    map_link: '',
    category: '',
    contact_name: '',
    contact_phone: '',
    contact_mobile: '',
    contact_email: '',
    agreement_file_link: null
  });

  // Fetch events when component mounts
  useEffect(() => {
    async function initializeEvents() {
      try {
        const response = await fetch('/api/events');
        if (!response.ok) throw new Error('Failed to fetch events');
        const data = await response.json();
        
        // Set both states at once if there's only one event
        if (data.length === 1) {
          const eventId = data[0].event_id.toString();
          setEvents(data);
          setSelectedEventId(eventId);
          setErrors(prev => ({ ...prev, event: undefined }));
        } else {
          setEvents(data);
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load events');
      }
    }

    // Call and await the initialization
    initializeEvents();
  }, []);

  // Debug effect to monitor state changes
  useEffect(() => {
    console.log('State updated:', {
      eventsCount: events.length,
      selectedEventId,
      firstEventId: events[0]?.event_id
    });
  }, [events, selectedEventId]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }

    // Store the file temporarily
    setTempFile(file);
    // Create a temporary URL for preview
    const tempUrl = URL.createObjectURL(file);
    setFormData(prev => ({
      ...prev,
      agreement_file_link: tempUrl
    }));
  };

  const handleDeleteFile = () => {
    // Clear the file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.value = '';
    }
    setTempFile(null);
    setFormData(prev => ({
      ...prev,
      agreement_file_link: null
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.area) newErrors.area = 'Area is required';
    if (!formData.address) newErrors.address = 'Address is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!selectedEventId) newErrors.event = 'Event selection is required';

    if (formData.stars) {
      const starsNum = Number(formData.stars);
      if (isNaN(starsNum) || starsNum < 0.0 || starsNum > 5.0) {
        newErrors.stars = 'Stars must be between 0.0 and 5.0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly');
      return;
    }

    try {
      setIsSubmitting(true);

      // Debug logging
      console.log('Submitting form with data:', {
        ...formData,
        eventId: selectedEventId
      });

      // First create the hotel
      const response = await fetch('/api/hotels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          eventId: selectedEventId
        }),
      });

      const data = await response.json();
      console.log('Response from server:', data);
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Associate hotel with event
      const eventAssocResponse = await fetch(`/api/events/${selectedEventId}/hotels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hotelIds: [data.hotel_id] }),
      });

      if (!eventAssocResponse.ok) {
        throw new Error('Failed to associate hotel with event');
      }

      let uploadError = null;

      // If we have a file to upload
      if (tempFile) {
        try {
          const fileFormData = new FormData();
          fileFormData.append('file', tempFile);

          const uploadResponse = await fetch(`/api/hotels/${data.hotel_id}/agreement`, {
            method: 'POST',
            body: fileFormData,
          });

          if (!uploadResponse.ok) {
            uploadError = 'Failed to upload agreement file';
          }
        } catch (error) {
          console.error('File upload error:', error);
          uploadError = error.message || 'Failed to upload agreement file';
        }
      }

      if (uploadError) {
        toast.warning(
          <div>
            <p>Hotel created successfully, but file upload failed.</p>
            <p className="text-sm mt-1">You can upload the agreement file later from the hotel details page.</p>
          </div>
        );
        router.push(`/hotels/${data.hotel_id}`);
      } else {
        toast.success('Hotel created successfully');
        router.push('/hotels');
      }
    } catch (error) {
      console.error('Error creating hotel:', error);
      toast.error(error.message || 'Failed to create hotel');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleCategoryChange = (value) => {
    setFormData(prev => ({
      ...prev,
      category: value
    }));
    // Clear category error
    if (errors.category) {
      setErrors(prev => ({
        ...prev,
        category: undefined
      }));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add New Hotel</h1>
        <Button
          variant="outline"
          onClick={() => router.push('/hotels')}
        >
          Back to Hotels
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name *
                  {errors.name && (
                    <span className="text-red-500 text-xs ml-1">{errors.name}</span>
                  )}
                </label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Hotel name"
                  className={errors.name ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Area *
                  {errors.area && (
                    <span className="text-red-500 text-xs ml-1">{errors.area}</span>
                  )}
                </label>
                <Input
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  required
                  placeholder="Hotel area"
                  className={errors.area ? 'border-red-500' : ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Stars
                  {errors.stars && (
                    <span className="text-red-500 text-xs ml-1">{errors.stars}</span>
                  )}
                </label>
                <StarRating
                  value={Number(formData.stars)}
                  onChange={(value) => handleChange({
                    target: { name: 'stars', value: value.toString() }
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category *
                  {errors.category && (
                    <span className="text-red-500 text-xs ml-1">{errors.category}</span>
                  )}
                </label>
                <Select
                  value={formData.category}
                  onValueChange={handleCategoryChange}
                  required
                >
                  <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {hotelConfig.categories.map(category => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Event *
                  {errors.event && (
                    <span className="text-red-500 text-xs ml-1">{errors.event}</span>
                  )}
                </label>
                <Select
                  value={selectedEventId}
                  onValueChange={(value) => {
                    setSelectedEventId(value);
                    if (errors.event) {
                      setErrors(prev => ({ ...prev, event: undefined }));
                    }
                  }}
                  required
                >
                  <SelectTrigger 
                    className={errors.event ? 'border-red-500' : ''}
                  >
                    <SelectValue>
                      {selectedEventId 
                        ? events.find(e => e.event_id.toString() === selectedEventId)?.name 
                        : "Select an event"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {events.map(event => (
                      <SelectItem 
                        key={event.event_id} 
                        value={event.event_id.toString()}
                      >
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Address *
                  {errors.address && (
                    <span className="text-red-500 text-xs ml-1">{errors.address}</span>
                  )}
                </label>
                <Input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  placeholder="Full address"
                  className={errors.address ? 'border-red-500' : ''}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Agreement File (PDF)</label>
                <div className="mt-1 flex items-center space-x-4">
                  {formData.agreement_file_link ? (
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center text-blue-600">
                        <DocumentIcon className="h-5 w-5 mr-2" />
                        <span className="text-sm">{tempFile?.name || 'Selected file'}</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteFile}
                        disabled={isUploadingFile}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XCircleIcon className="h-5 w-5 mr-2" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        disabled={isUploadingFile}
                        className="max-w-xs"
                      />
                      {isUploadingFile && <span className="ml-2">Uploading...</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <Input
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  placeholder="Hotel phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Hotel email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Website</label>
                <Input
                  name="website_link"
                  value={formData.website_link}
                  onChange={handleChange}
                  placeholder="Hotel website URL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Map Link</label>
                <Input
                  name="map_link"
                  value={formData.map_link}
                  onChange={handleChange}
                  placeholder="Google Maps URL"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Person</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <Input
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                  placeholder="Contact person name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <Input
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  placeholder="Contact person phone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mobile</label>
                <Input
                  name="contact_mobile"
                  value={formData.contact_mobile}
                  onChange={handleChange}
                  placeholder="Contact person mobile"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <Input
                  type="email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  placeholder="Contact person email"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/hotels')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Hotel'}
          </Button>
        </div>
      </form>
    </div>
  );
} 