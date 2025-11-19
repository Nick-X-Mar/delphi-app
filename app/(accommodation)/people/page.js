'use client';

import PeopleTable from '@/components/PeopleTable';
import { Toaster } from 'sonner';
import { useViewOnlyMode } from '@/lib/viewOnlyMode';

export default function People() {
  const { isViewOnly } = useViewOnlyMode();

  return (
    <div className="container mx-auto px-4 py-8">
      {isViewOnly && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>View-Only Mode:</strong> This event has passed. All modifications are disabled.
          </p>
        </div>
      )}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">People Management</h1>
      </div>
      <PeopleTable isViewOnly={isViewOnly} />
      <Toaster />
    </div>
  );
}
