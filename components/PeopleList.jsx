'use client';

import { useState, useEffect } from 'react';
import { 
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function PeopleList({ onPersonSelect, selectedPerson }) {
  const [people, setPeople] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    try {
      const res = await fetch('/api/accommodation/people');
      if (!res.ok) throw new Error('Failed to fetch people');
      const data = await res.json();
      setPeople(data);
    } catch (error) {
      console.error('Error fetching people:', error);
      toast.error('Failed to load people');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPeople = people.filter(person => 
    person.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Input
        type="text"
        placeholder="Search people..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm"
      />

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan="6" className="text-center">Loading...</TableCell>
              </TableRow>
            ) : filteredPeople.length === 0 ? (
              <TableRow>
                <TableCell colSpan="6" className="text-center">No people found</TableCell>
              </TableRow>
            ) : (
              filteredPeople.map((person) => (
                <TableRow 
                  key={person.person_id}
                  onClick={() => onPersonSelect(person)}
                  className={`cursor-pointer hover:bg-gray-50 ${
                    selectedPerson?.person_id === person.person_id ? 'bg-blue-50' : ''
                  }`}
                >
                  <TableCell>
                    {person.first_name} {person.last_name}
                  </TableCell>
                  <TableCell>{person.email}</TableCell>
                  <TableCell>{person.department || '-'}</TableCell>
                  <TableCell>{person.position || '-'}</TableCell>
                  <TableCell>
                    {person.start_date ? new Date(person.start_date).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    {person.end_date ? new Date(person.end_date).toLocaleDateString() : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 