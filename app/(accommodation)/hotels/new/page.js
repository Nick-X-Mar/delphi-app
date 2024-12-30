'use client';

import { useState } from 'react';
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
import hotelConfig from '@/config/hotels.json';
import { StarRating } from '@/components/ui/star-rating';

export default function NewHotelPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    contact_email: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);

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
      const validCategories = hotelConfig.categories.map(cat => cat.value);
      if (!validCategories.includes(formData.category)) {
        toast.error('Invalid category selected');
        return;
      }

      const response = await fetch('/api/hotels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      toast.success('Hotel created successfully');
      router.push(`/hotels/${data.hotel_id}`);
    } catch (error) {
      console.error('Submit error:', error);
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
  };

  const handleCategoryChange = (value) => {
    setFormData(prev => ({
      ...prev,
      category: value
    }));
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
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Hotel name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Area *</label>
                <Input
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  required
                  placeholder="Hotel area"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Stars *</label>
                <StarRating
                  value={Number(formData.stars)}
                  onChange={(value) => handleChange({
                    target: { name: 'stars', value: value.toString() }
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category *</label>
                <Select
                  value={formData.category}
                  onValueChange={handleCategoryChange}
                  required
                >
                  <SelectTrigger>
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
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <Input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Full address"
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