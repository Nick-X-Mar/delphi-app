import PeopleTable from '@/components/PeopleTable';
import { Toaster } from 'sonner';

export default function People() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">People Management</h1>
      <PeopleTable />
      <Toaster />
    </div>
  );
}
