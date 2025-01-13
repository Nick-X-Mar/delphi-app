import PeopleTable from '@/components/PeopleTable';
import { Toaster } from 'sonner';

export default function People() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">People Management</h1>
      </div>
      <PeopleTable />
      <Toaster />
    </div>
  );
}
