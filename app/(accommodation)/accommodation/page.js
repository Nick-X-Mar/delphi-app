'use client';

import { Card } from '@/components/ui/card';
import AccommodationTable from '@/components/AccommodationTable';

export default function Accommodation() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Accommodation Management</h1>
      
      <Card className="p-6">
        <AccommodationTable />
      </Card>
    </div>
  );
}
