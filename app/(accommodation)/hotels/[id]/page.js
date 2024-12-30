'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StarIcon, MapPinIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';

export default function HotelDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [hotel, setHotel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchHotel();
  }, [id]);

  const fetchHotel = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/hotels/${id}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setHotel(data);
      setFormData(data);
    } catch (error) {
      console.error('Error fetching hotel:', error);
      toast.error('Failed to fetch hotel details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);

      // Validate required fields
      if (!formData.name || !formData.area || !formData.stars || !formData.category) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Validate stars range
      if (formData.stars < 1 || formData.stars > 5) {
        toast.error('Stars must be between 1 and 5');
        return;
      }

      // Validate category
      if (!['VIP', 'Very Good', 'Good'].includes(formData.category)) {
        toast.error('Invalid category selected');
        return;
      }

      const response = await fetch(`/api/hotels/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          area: formData.area,
          stars: parseInt(formData.stars),
          category: formData.category,
          address: formData.address || null,
          phone_number: formData.phone_number || null,
          email: formData.email || null,
          website_link: formData.website_link || null,
          map_link: formData.map_link || null,
          contact_name: formData.contact_name || null,
          contact_phone: formData.contact_phone || null,
          contact_mobile: formData.contact_mobile || null,
          contact_email: formData.contact_email || null
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setHotel(data);
      setIsEditing(false);
      toast.success('Hotel updated successfully');
    } catch (error) {
      console.error('Error updating hotel:', error);
      toast.error(error.message || 'Failed to update hotel');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRoomType = () => {
    router.push(`/hotels/${id}/rooms/new`);
  };

  const handleEditRoomType = (roomTypeId) => {
    router.push(`/hotels/${id}/rooms/${roomTypeId}`);
  };

  const renderStars = (count) => {
    return [...Array(5)].map((_, index) => (
      index < count ? (
        <StarIcon key={index} className="h-5 w-5 text-yellow-400" />
      ) : (
        <StarOutline key={index} className="h-5 w-5 text-gray-300" />
      )
    ));
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
                  <label className="block text-sm font-medium text-gray-700">Name *</label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Area *</label>
                  <Input
                    name="area"
                    value={formData.area}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stars *</label>
                  <Input
                    type="number"
                    name="stars"
                    value={formData.stars}
                    onChange={handleInputChange}
                    min="1"
                    max="5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    required
                  >
                    <option value="">Select a category</option>
                    <option value="VIP">VIP</option>
                    <option value="Very Good">Very Good</option>
                    <option value="Good">Good</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <Input
                    name="address"
                    value={formData.address || ''}
                    onChange={handleInputChange}
                  />
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
                  <label className="block text-sm font-medium text-gray-700">Website</label>
                  <Input
                    name="website_link"
                    value={formData.website_link || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Map Link</label>
                  <Input
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
            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
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
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{hotel.name}</h3>
                    <p className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                      <MapPinIcon className="h-4 w-4" />
                      {hotel.area}
                    </p>
                    {hotel.address && (
                      <p className="text-sm text-gray-600 mt-1">{hotel.address}</p>
                    )}
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {hotel.category}
                  </span>
                </div>
                <div className="flex">{renderStars(hotel.stars)}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {hotel.phone_number && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <PhoneIcon className="h-4 w-4" />
                    {hotel.phone_number}
                  </div>
                )}
                {hotel.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <EnvelopeIcon className="h-4 w-4" />
                    {hotel.email}
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
            </CardContent>
          </Card>

          {hotel.contact_name && (
            <Card>
              <CardHeader>
                <CardTitle>Contact Person</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><span className="font-medium">Name:</span> {hotel.contact_name}</p>
                  {hotel.contact_phone && <p><span className="font-medium">Phone:</span> {hotel.contact_phone}</p>}
                  {hotel.contact_mobile && <p><span className="font-medium">Mobile:</span> {hotel.contact_mobile}</p>}
                  {hotel.contact_email && <p><span className="font-medium">Email:</span> {hotel.contact_email}</p>}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Room Types</CardTitle>
                <Button onClick={handleAddRoomType}>
                  Add Room Type
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {hotel.room_types && hotel.room_types.length > 0 ? (
                <div className="space-y-4">
                  {hotel.room_types.map((room) => (
                    <div
                      key={room.room_type_id}
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleEditRoomType(room.room_type_id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{room.name}</h4>
                          <p className="text-sm text-gray-600">{room.description}</p>
                        </div>
                        <p className="text-sm font-medium">
                          {room.total_rooms} rooms
                        </p>
                      </div>
                    </div>
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