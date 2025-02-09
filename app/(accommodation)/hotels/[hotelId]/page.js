'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { DocumentIcon, XCircleIcon, MapPinIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/solid';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';
import hotelConfig from '@/config/hotels.json';
import { StarRating } from '@/components/ui/star-rating';

export default function HotelDetailPage() {
  const router = useRouter();
  const { hotelId } = useParams();
  const [hotel, setHotel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [tempFile, setTempFile] = useState(null);
  const [originalFileUrl, setOriginalFileUrl] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [errors, setErrors] = useState({});
  const [s3Debug, setS3Debug] = useState(null);

  useEffect(() => {
    fetchHotel();
    fetchEvents();
  }, [hotelId]);

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

  const fetchHotel = async () => {
    try {
      setIsLoading(true);
      // Fetch hotel details
      const response = await fetch(`/api/hotels/${hotelId}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setHotel(data);
      setFormData(data);
      setOriginalFileUrl(data.agreement_file_link);

      // Fetch associated event
      const eventResponse = await fetch(`/api/hotels/${hotelId}/event`);
      if (eventResponse.ok) {
        const eventData = await eventResponse.json();
        if (eventData.event_id) {
          setSelectedEventId(eventData.event_id.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching hotel:', error);
      toast.error('Failed to fetch hotel details');
    } finally {
      setIsLoading(false);
    }
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
      setIsSaving(true);

      // If we have a new file to upload
      if (tempFile) {
        const fileFormData = new FormData();
        fileFormData.append('file', tempFile);

        const uploadResponse = await fetch(`/api/hotels/${hotelId}/agreement`, {
          method: 'POST',
          body: fileFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload agreement file');
        }

        const { fileUrl } = await uploadResponse.json();
        formData.agreement_file_link = fileUrl;
      } else if (formData.agreement_file_link !== originalFileUrl) {
        // If file was deleted, remove it from S3
        if (originalFileUrl) {
          await fetch(`/api/hotels/${hotelId}/agreement`, {
            method: 'DELETE',
          });
        }
      }

      // Update hotel details
      const response = await fetch(`/api/hotels/${hotelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Update event association
      const eventAssocResponse = await fetch(`/api/events/${selectedEventId}/hotels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hotelIds: [hotelId] }),
      });

      if (!eventAssocResponse.ok) {
        throw new Error('Failed to update event association');
      }

      setHotel(data);
      setIsEditing(false);
      setTempFile(null);
      setOriginalFileUrl(data.agreement_file_link);
      toast.success('Hotel updated successfully');
    } catch (error) {
      console.error('Error updating hotel:', error);
      toast.error(error.message || 'Failed to update hotel');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e) => {
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

  const handleCancelEdit = () => {
    setFormData({...hotel}); // Reset form data
    setTempFile(null); // Clear any temporary file
    if (hotel.agreement_file_link !== originalFileUrl) {
      setFormData(prev => ({
        ...prev,
        agreement_file_link: originalFileUrl
      }));
    }
    setIsEditing(false);
  };

  const handleAddRoomType = () => {
    router.push(`/hotels/${hotelId}/rooms/new`);
  };

  const handleEditRoomType = (roomTypeId) => {
    router.push(`/hotels/${hotelId}/rooms/${roomTypeId}`);
  };

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

    // Get S3 configuration for debugging
    try {
      const configResponse = await fetch('/api/hotels/s3-config');
      const configData = await configResponse.json();
      setS3Debug(configData);
    } catch (error) {
      console.error('Error fetching S3 config:', error);
      setS3Debug({ error: error.message });
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
    setTempFile(null);
    setFormData(prev => ({
      ...prev,
      agreement_file_link: null
    }));
  };

  const renderStars = (count) => {
    const stars = [];
    const fullStars = Math.floor(count);
    const hasHalfStar = count % 1 !== 0;

    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <StarIcon key={`full-${i}`} className="h-5 w-5 text-yellow-400" />
      );
    }

    // Add half star if needed
    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative" style={{ width: '1.25rem', height: '1.25rem' }}>
          <StarOutline className="absolute h-5 w-5 text-yellow-400" />
          <div className="absolute overflow-hidden" style={{ width: '50%' }}>
            <StarIcon className="h-5 w-5 text-yellow-400" />
          </div>
        </div>
      );
    }

    // Add remaining empty stars
    const remainingStars = 5 - Math.ceil(count);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <StarOutline key={`empty-${i}`} className="h-5 w-5 text-gray-300" />
      );
    }

    return stars;
  };

  const renderS3DebugInfo = () => {
    if (!s3Debug) return null;

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm">
        <h4 className="font-medium text-gray-700 mb-2">S3 Configuration Debug Info:</h4>
        <pre className="whitespace-pre-wrap bg-white p-2 rounded border">
          {JSON.stringify({
            environment: process.env.NODE_ENV,
            ...s3Debug
          }, null, 2)}
        </pre>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-gray-600">Hotel not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Hotel Details</h1>
        <div className="space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/hotels')}
          >
            Back to Hotels
          </Button>
          <Button
            variant={isEditing ? "outline" : "default"}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit Hotel'}
          </Button>
        </div>
      </div>

      {isEditing ? (
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
                    onChange={handleInputChange}
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
                    onChange={handleInputChange}
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
                    onChange={(value) => handleInputChange({
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
                    <SelectTrigger className={errors.event ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select an event" />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map(event => (
                        <SelectItem key={event.event_id} value={event.event_id.toString()}>
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
                    onChange={handleInputChange}
                    required
                    placeholder="Full address"
                    className={errors.address ? 'border-red-500' : ''}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Agreement File (PDF)</label>
                  <div className="mt-1 flex items-center space-x-4">
                    {formData.agreement_file_link ? (
                      <>
                        <a
                          href={`/api/hotels/${hotelId}/agreement`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-600 hover:text-blue-800"
                        >
                          <DocumentIcon className="h-5 w-5 mr-2" />
                          View Agreement
                        </a>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleDeleteFile}
                          disabled={isUploadingFile}
                          className="text-red-600 hover:text-red-800"
                        >
                          <XCircleIcon className="h-5 w-5 mr-2" />
                          Delete
                        </Button>
                      </>
                    ) : (
                      <div className="flex flex-col w-full">
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
                        {renderS3DebugInfo()}
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
                    value={formData.phone_number || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Website Link</label>
                  <Input
                    type="url"
                    name="website_link"
                    value={formData.website_link || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Map Link</label>
                  <Input
                    type="url"
                    name="map_link"
                    value={formData.map_link || ''}
                    onChange={handleInputChange}
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
                    value={formData.contact_name || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <Input
                    name="contact_phone"
                    value={formData.contact_phone || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mobile</label>
                  <Input
                    name="contact_mobile"
                    value={formData.contact_mobile || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <Input
                    type="email"
                    name="contact_email"
                    value={formData.contact_email || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelEdit}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium">Hotel Details</h3>
                  <div className="mt-4 space-y-4">
                    <div>
                      <span className="text-gray-500">Name:</span>
                      <span className="ml-2 font-medium">{hotel.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Area:</span>
                      <span className="ml-2">{hotel.area}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Stars:</span>
                      <div className="ml-2 flex items-center space-x-1">
                        {renderStars(hotel.stars)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Category:</span>
                      <span className="ml-2">{hotel.category}</span>
                    </div>
                    {hotel.address && (
                      <div className="flex items-start">
                        <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                        <span className="ml-2">{hotel.address}</span>
                      </div>
                    )}
                    {hotel.agreement_file_link && (
                      <div className="mt-4">
                        <span className="text-gray-500">Agreement:</span>
                        <a
                          href={`/api/hotels/${hotelId}/agreement`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <DocumentIcon className="h-5 w-5 mr-2" />
                          View Agreement
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium">Contact Information</h3>
                  <div className="mt-4 space-y-4">
                    {hotel.phone_number && (
                      <div className="flex items-center">
                        <PhoneIcon className="h-5 w-5 text-gray-400" />
                        <span className="ml-2">{hotel.phone_number}</span>
                      </div>
                    )}
                    {hotel.email && (
                      <div className="flex items-center">
                        <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                        <span className="ml-2">{hotel.email}</span>
                      </div>
                    )}
                    {hotel.website_link && (
                      <div>
                        <a
                          href={hotel.website_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Visit Website
                        </a>
                      </div>
                    )}
                    {hotel.map_link && (
                      <div>
                        <a
                          href={hotel.map_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          View on Map
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {hotel.contact_name && (
            <Card>
              <CardHeader>
                <CardTitle>Contact Person</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="space-y-4">
                      <div>
                        <span className="text-gray-500">Name:</span>
                        <span className="ml-2">{hotel.contact_name}</span>
                      </div>
                      {hotel.contact_phone && (
                        <div>
                          <span className="text-gray-500">Phone:</span>
                          <span className="ml-2">{hotel.contact_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="space-y-4">
                      {hotel.contact_mobile && (
                        <div>
                          <span className="text-gray-500">Mobile:</span>
                          <span className="ml-2">{hotel.contact_mobile}</span>
                        </div>
                      )}
                      {hotel.contact_email && (
                        <div>
                          <span className="text-gray-500">Email:</span>
                          <span className="ml-2">{hotel.contact_email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Room Types</CardTitle>
              <Button onClick={handleAddRoomType}>Add Room Type</Button>
            </CardHeader>
            <CardContent>
              {hotel.room_types && hotel.room_types.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {hotel.room_types.map((roomType) => (
                    <Card key={roomType.room_type_id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-lg">{roomType.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">{roomType.description}</p>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium">Total Rooms: {roomType.total_rooms}</p>
                              <p className="text-sm font-medium">Base Price: €{roomType.base_price_per_night}</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditRoomType(roomType.room_type_id)}
                            >
                              Manage
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">No room types added yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 