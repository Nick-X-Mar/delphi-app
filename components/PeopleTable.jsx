'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { toast } from 'sonner';
import { formatDate, formatDateTime } from '@/utils/dateFormatters';
import { format, parseISO } from 'date-fns';
import Pagination from '@/components/Pagination';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import PersonForm from './PersonForm';

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
    checkin_date: '',
    checkout_date: '',
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
      
      if (!response.ok) {
        throw new Error('Failed to fetch people');
      }
      
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
      checkin_date: person.checkin_date ? format(parseISO(person.checkin_date), 'yyyy-MM-dd') : '',
      checkout_date: person.checkout_date ? format(parseISO(person.checkout_date), 'yyyy-MM-dd') : '',
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

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>First Name</TableHead>
            <TableHead>Last Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Checkin</TableHead>
            <TableHead>Checkout</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.map((person) => (
            <TableRow key={person.person_id}>
              <TableCell>{person.first_name}</TableCell>
              <TableCell>{person.last_name}</TableCell>
              <TableCell>{person.email}</TableCell>
              <TableCell>{person.department}</TableCell>
              <TableCell>{person.position}</TableCell>
              <TableCell>
                {person.checkin_date && new Date(person.checkin_date).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {person.checkout_date && new Date(person.checkout_date).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(person)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(totalItems / itemsPerPage)}
        onPageChange={handlePageChange}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
      />

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-[85%] max-h-[90vh] overflow-y-auto border">
            <div className="p-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Edit Person Details</h2>
              <PersonForm
                person={editPerson}
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSubmit}
                onCancel={() => setShowModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 