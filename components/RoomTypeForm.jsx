'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export default function RoomTypeForm({ hotelId, roomType, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: roomType?.name || '',
    description: roomType?.description || '',
    total_rooms: roomType?.total_rooms || '',
    base_price_per_night: roomType?.base_price_per_night || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const errors = [];
    if (!formData.name.trim()) {
      errors.push('Name is required');
    }

    if (!formData.total_rooms || parseInt(formData.total_rooms) <= 0) {
      errors.push('Total rooms must be greater than 0');
    }
    
    const price = Number(formData.base_price_per_night);
    if (isNaN(price) || price <= 0) {
      errors.push('Base price per night must be a valid number greater than 0');
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }

    setIsSubmitting(true);

    try {
      const url = roomType
        ? `/api/hotels/${hotelId}/room-types/${roomType.room_type_id}`
        : `/api/hotels/${hotelId}/room-types`;

      const method = roomType ? 'PUT' : 'POST';

      // Format the price before sending
      const formattedData = {
        ...formData,
        total_rooms: parseInt(formData.total_rooms),
        base_price_per_night: Number(formData.base_price_per_night).toFixed(2)
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      toast.success(
        roomType
          ? 'Room type updated successfully'
          : 'Room type created successfully'
      );

      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.message || 'Failed to save room type');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Name *
          </label>
          <Input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Deluxe Double Room"
            className="mt-1"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Total Rooms *
          </label>
          <Input
            type="number"
            name="total_rooms"
            value={formData.total_rooms}
            onChange={handleChange}
            min="1"
            placeholder="e.g., 10"
            className="mt-1"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Base Price per Night (€) *
          </label>
          <Input
            type="number"
            name="base_price_per_night"
            value={formData.base_price_per_night}
            onChange={handleChange}
            min="0.01"
            step="0.01"
            placeholder="e.g., 100.00"
            className="mt-1"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <Input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="e.g., Spacious room with sea view"
            className="mt-1"
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? (roomType ? 'Updating...' : 'Creating...')
            : (roomType ? 'Update Room Type' : 'Create Room Type')
          }
        </Button>
      </div>
    </form>
  );
} 