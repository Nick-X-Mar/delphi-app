'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@/utils/dateFormatters';
import { format, parseISO } from 'date-fns';
import Pagination from '@/components/Pagination';

export default function PeopleTable() {
  const [people, setPeople] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [showModal, setShowModal] = useState(false);
  const [editPerson, setEditPerson] = useState(null);
  const [formData, setFormData] = useState({
    department: '',
    position: '',
    start_date: '',
    notes: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const fetchPeople = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/people?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(
          debouncedSearchTerm
        )}`
      );
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setPeople(data.data || []); // Ensure we always set an array
      setTotalItems(data.pagination.total);
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
  }, [currentPage, debouncedSearchTerm]);

  const handleEdit = (person) => {
    setEditPerson(person);
    setFormData({
      department: person.department || '',
      position: person.position || '',
      start_date: person.start_date ? format(parseISO(person.start_date), 'yyyy-MM-dd') : '',
      notes: person.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <input
          type="text"
          placeholder="Search by name, email, or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border rounded-lg max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Edit Modal */}
      {showModal && editPerson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Edit Details</h2>
            
            {/* Source Fields (Read-only) */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Source Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID</label>
                  <div className="mt-1 text-sm text-gray-900">{editPerson.person_id}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {editPerson.first_name} {editPerson.last_name}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <div className="mt-1 text-sm text-gray-900">{editPerson.email}</div>
                </div>
              </div>
            </div>

            {/* Custom Fields (Editable) */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Custom Fields</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Position</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4 mt-6 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center">Loading...</td>
              </tr>
            ) : !people || people.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center">No people found</td>
              </tr>
            ) : (
              people.map((person) => (
                <tr key={person.person_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">{person.person_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {person.first_name} {person.last_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{person.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{person.department || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{person.position || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatDate(person.start_date)}
                  </td>
                  <td className="px-6 py-4">{person.notes || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formatDateTime(person.updated_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(person)}
                      className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
                    >
                      Edit Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(totalItems / itemsPerPage)}
        onPageChange={handlePageChange}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
      />
    </div>
  );
} 