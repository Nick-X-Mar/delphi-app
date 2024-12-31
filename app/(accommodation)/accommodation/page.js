'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function Accommodation() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Accommodation Management</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>No Accommodations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            There are currently no accommodations to display.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
