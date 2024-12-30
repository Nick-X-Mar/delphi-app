'use client';

import { useState } from 'react';
import { useDebounce } from 'use-debounce';
import { useRouter } from 'next/navigation';
import HotelList from '@/components/HotelList';
import { Button } from '@/components/ui/button';

export default function HotelsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 300);

  const handleAddHotel = () => {
    router.push('/hotels/new');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Hotels</h1>
        <Button onClick={handleAddHotel}>
          Add New Hotel
        </Button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search hotels by name, area..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <HotelList searchTerm={debouncedSearch} />
    </div>
  );
}
