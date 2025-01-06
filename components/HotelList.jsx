'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { StarIcon, MapPinIcon, PhoneIcon, EnvelopeIcon, ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';
import Pagination from './Pagination';
import { StarRating } from '@/components/ui/star-rating';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function HotelList({ searchTerm: initialSearchTerm, eventId: initialEventId }) {
  const router = useRouter();
  const [hotels, setHotels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [expandedSections, setExpandedSections] = useState({});
  const [minStars, setMinStars] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');
  const [selectedEventId, setSelectedEventId] = useState(initialEventId || 'all');
  const [events, setEvents] = useState([]);
  const [debouncedStars] = useDebounce(minStars, 300);
  const itemsPerPage = 6;

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'VIP', label: 'VIP' },
    { value: 'Very Good', label: 'Very Good' },
    { value: 'Good', label: 'Good' }
  ];

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

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (selectedEventId && selectedEventId !== 'all') params.append('eventId', selectedEventId);
        if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
        params.append('page', currentPage.toString());
        params.append('limit', itemsPerPage.toString());
        params.append('minStars', debouncedStars.toString());
        
        const response = await fetch(`/api/hotels?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch hotels');
        const data = await response.json();
        setHotels(Array.isArray(data.items) ? data.items : []);
        setTotalItems(data.total || 0);
      } catch (error) {
        console.error('Error fetching hotels:', error);
        toast.error('Failed to load hotels');
        setHotels([]);
        setTotalItems(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHotels();
  }, [selectedEventId, currentPage, itemsPerPage, debouncedStars, selectedCategory]);

  const handleSearch = () => {
    setCurrentPage(1);
    const fetchHotels = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (selectedEventId && selectedEventId !== 'all') params.append('eventId', selectedEventId);
        if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
        params.append('page', '1');
        params.append('limit', itemsPerPage.toString());
        params.append('minStars', debouncedStars.toString());
        
        const response = await fetch(`/api/hotels?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch hotels');
        const data = await response.json();
        setHotels(Array.isArray(data.items) ? data.items : []);
        setTotalItems(data.total || 0);
      } catch (error) {
        console.error('Error fetching hotels:', error);
        toast.error('Failed to load hotels');
        setHotels([]);
        setTotalItems(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHotels();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleManageHotel = (id) => {
    router.push(`/hotels/${id}`);
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

  const toggleSection = (hotelId, section) => {
    setExpandedSections(prev => ({
      ...prev,
      [`${hotelId}-${section}`]: !prev[`${hotelId}-${section}`]
    }));
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md animate-pulse">
            <div className="p-6">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Hotels</h1>
        <button
          onClick={() => router.push('/hotels/new')}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Add New Hotel
        </button>
      </div> */}

      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Hotels</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Search Hotels
              <span className="text-gray-500 text-xs ml-1">(Search by name or location)</span>
            </label>
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Search hotels..."
                  className="pl-10"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              </div>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Search
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Event
              <span className="text-gray-500 text-xs ml-1">(Filter by event)</span>
            </label>
            <Select
              value={selectedEventId}
              onValueChange={setSelectedEventId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select event" />
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
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Minimum Star Rating
              <span className="text-gray-500 text-xs ml-1">(Filter hotels with rating equal or above)</span>
            </label>
            <div className="w-full">
              <StarRating
                value={minStars}
                onChange={(value) => setMinStars(parseFloat(value))}
                allowHalf={true}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Hotel Category
              <span className="text-gray-500 text-xs ml-1">(Filter by hotel classification)</span>
            </label>
            <Select
              value={selectedCategory || 'all'}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hotels.map((hotel) => (
          <div key={hotel.hotel_id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{hotel.name}</h3>
                  <p className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                    <MapPinIcon className="h-4 w-4" />
                    {hotel.area}
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {hotel.category}
                </span>
              </div>
              
              <div className="flex mt-2">{renderStars(hotel.stars)}</div>

              {/* Contact Information Section */}
              <div className="mt-4 border-t pt-4">
                <button
                  onClick={() => toggleSection(hotel.hotel_id, 'contact')}
                  className="flex justify-between items-center w-full text-left text-sm font-medium text-gray-900"
                >
                  Contact Information
                  <ChevronDownIcon
                    className={`h-5 w-5 text-gray-500 transform transition-transform ${
                      expandedSections[`${hotel.hotel_id}-contact`] ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                
                {expandedSections[`${hotel.hotel_id}-contact`] && (
                  <div className="mt-2 space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="h-4 w-4" />
                      {hotel.phone_number}
                    </div>
                    <div className="flex items-center gap-2">
                      <EnvelopeIcon className="h-4 w-4" />
                      {hotel.email}
                    </div>
                    {hotel.contact_name && (
                      <div className="mt-2 pt-2 border-t">
                        <p className="font-medium text-gray-900">Contact Person:</p>
                        <p>{hotel.contact_name}</p>
                        <p>{hotel.contact_phone}</p>
                        <p>{hotel.contact_email}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Room Types Section */}
              <div className="mt-4 border-t pt-4">
                <button
                  onClick={() => toggleSection(hotel.hotel_id, 'rooms')}
                  className="flex justify-between items-center w-full text-left text-sm font-medium text-gray-900"
                >
                  Room Types & Availability
                  <ChevronDownIcon
                    className={`h-5 w-5 text-gray-500 transform transition-transform ${
                      expandedSections[`${hotel.hotel_id}-rooms`] ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                
                {expandedSections[`${hotel.hotel_id}-rooms`] && (
                  <div className="mt-2">
                    <button
                      onClick={() => handleManageHotel(hotel.hotel_id)}
                      className="w-full px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      View Details & Manage Rooms
                    </button>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="mt-6 pt-4 border-t flex justify-between">
                {hotel.agreement_file_link ? (
                  <button
                    onClick={() => window.open(`/api/hotels/${hotel.hotel_id}/agreement`, '_blank')}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    View Agreement
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-gray-50 text-gray-400 cursor-not-allowed"
                  >
                    No Agreement
                  </button>
                )}
                <button
                  onClick={() => handleManageHotel(hotel.hotel_id)}
                  className="px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Manage Hotel
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(totalItems / itemsPerPage)}
        onPageChange={setCurrentPage}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
      />
    </div>
  );
} 