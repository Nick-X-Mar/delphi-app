'use client';

import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Helper functions
const getStatusText = (booking) => {
  if (!booking.modification_type) {
    return 'Confirmed';
  }
  return booking.modification_type;
};

const getModificationText = (booking) => {
  if (!booking.modification_date) return '-';
  return format(new Date(booking.modification_date), 'PP');
};

const getStatusColor = (booking) => {
  switch (booking.modification_type) {
    case 'date_change':
      return 'text-blue-600';
    case 'room_change':
      return 'text-purple-600';
    case 'cancelled':
      return 'text-red-600';
    default:
      return 'text-green-600'; // for Confirmed
  }
};

export default function HotelPdfView({ params }) {
  const [hotelData, setHotelData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    const fetchHotelData = async () => {
      try {
        const response = await fetch(`/api/hotels/${params.hotelId}/room-list-data`);
        if (!response.ok) throw new Error('Failed to fetch hotel data');
        const data = await response.json();
        setHotelData(data);
      } catch (error) {
        console.error('Error fetching hotel data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHotelData();
  }, [params.hotelId]);

  const calculateTotalDays = () => {
    return hotelData.room_types.reduce((total, roomType) => {
      return total + roomType.bookings.reduce((roomTotal, booking) => {
        if (booking.status === 'cancelled' || booking.status === 'invalidated') return roomTotal;
        const checkIn = new Date(booking.check_in_date);
        const checkOut = new Date(booking.check_out_date);
        const days = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        return roomTotal + days;
      }, 0);
    }, 0);
  };

  const generatePDF = async () => {
    if (!contentRef.current) return;
    
    setIsGeneratingPdf(true);
    try {
      // Create canvas from the content
      const canvas = await html2canvas(contentRef.current, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false,
        windowWidth: contentRef.current.scrollWidth,
        windowHeight: contentRef.current.scrollHeight
      });

      // Calculate dimensions
      const imgWidth = 297; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Create PDF
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');

      // Add image to PDF
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // Save the PDF
      pdf.save(`${hotelData.name}-room-list.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!hotelData) {
    return <div className="container mx-auto px-4 py-8">Hotel not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div ref={contentRef}>
        {/* Hotel Details Section */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Hotel Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">Name</p>
              <p className="font-medium">{hotelData.name}</p>
            </div>
            <div>
              <p className="text-gray-600">Event</p>
              <p className="font-medium">{hotelData.event_name}</p>
            </div>
            <div>
              <p className="text-gray-600">Total Active Bookings</p>
              <p className="font-medium">{hotelData.total_bookings}</p>
            </div>
            <div>
              <p className="text-gray-600">Total Days Booked</p>
              <p className="font-medium">{calculateTotalDays()}</p>
            </div>
          </div>
        </Card>

        {/* Bookings Section */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Bookings</h2>
          {hotelData.room_types.map((roomType) => (
            <div key={roomType.room_type_id} className="mb-8">
              <h3 className="text-xl font-semibold mb-4">{roomType.name}</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Companion Full Name</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roomType.bookings.map((booking) => (
                    <TableRow key={booking.booking_id}>
                      <TableCell>
                        {booking.first_name} {booking.last_name}
                      </TableCell>
                      <TableCell>{booking.companion_full_name || '-'}</TableCell>
                      <TableCell className="whitespace-pre-wrap">
                        {booking.notes || '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(booking.check_in_date), 'PP')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(booking.check_out_date), 'PP')}
                      </TableCell>
                      <TableCell>
                        <span className={`capitalize ${getStatusColor(booking)}`}>
                          {getStatusText(booking)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getModificationText(booking)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </Card>
      </div>

      {/* Download PDF Button */}
      <div className="flex justify-end mt-6">
        <Button 
          onClick={generatePDF}
          disabled={isGeneratingPdf}
          className="flex items-center gap-2"
        >
          <FileDown className="h-4 w-4" />
          {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}
        </Button>
      </div>
    </div>
  );
} 