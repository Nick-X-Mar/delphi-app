'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { StarIcon, MapPinIcon, PhoneIcon, EnvelopeIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';
import Pagination from './Pagination';
import { StarRating } from '@/components/ui/star-rating';

export default function HotelList({ searchTerm }) {
  const router = useRouter();
  const [hotels, setHotels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [expandedSections, setExpandedSections] = useState({});
  const [minStars, setMinStars] = useState(0);
  const [debouncedStars] = useDebounce(minStars, 300);
  const itemsPerPage = 6;

  useEffect(() => {
    fetchHotels();
  }, [currentPage, searchTerm, debouncedStars]);

  const fetchHotels = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/hotels?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(
          searchTerm || ''
        )}&minStars=${debouncedStars.toFixed(1)}`
      );
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setHotels(data.data);
      setTotalItems(data.pagination.total);
    } catch (error) {
      console.error('Error fetching hotels:', error);
      toast.error('Failed to fetch hotels');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageHotel = (id) => {
    router.push(`/hotels/${id}`);
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
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Minimum Stars:</span>
        <div className="w-48">
          <StarRating
            value={minStars}
            onChange={(value) => setMinStars(parseFloat(value))}
            allowHalf={true}
          />
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