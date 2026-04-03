'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { FileDown, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const loadFont = async (pdf) => {
  const toBase64 = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch font: ${url}`);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  try {
    const [normalFont, boldFont] = await Promise.all([
      toBase64('/fonts/Roboto-Regular.ttf'),
      toBase64('/fonts/Roboto-Bold.ttf')
    ]);
    
    pdf.addFileToVFS('Roboto-Regular.ttf', normalFont);
    pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    pdf.addFileToVFS('Roboto-Bold.ttf', boldFont);
    pdf.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
    
    return true;
  } catch (error) {
    console.error('Failed to load Greek font:', error);
    return false;
  }
};

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
      return 'text-green-600';
  }
};

const getStatusPdfColor = (booking) => {
  switch (booking.modification_type) {
    case 'date_change':
      return [37, 99, 235]; // blue-600
    case 'room_change':
      return [147, 51, 234]; // purple-600
    case 'cancelled':
      return [220, 38, 38]; // red-600
    default:
      return [22, 163, 74]; // green-600
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

  const handlePermanentDelete = async (booking, roomTypeName) => {
    const confirmMessage = `Are you sure you want to permanently delete this cancelled booking?\n\n` +
      `Guest: ${booking.first_name} ${booking.last_name}\n` +
      `Hotel: ${hotelData.name}\n` +
      `Room: ${roomTypeName}\n\n` +
      `This action cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`/api/bookings/${booking.booking_id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete booking');
      }

      toast.success('Booking deleted successfully');
      // Refresh data
      const res = await fetch(`/api/hotels/${params.hotelId}/room-list-data`);
      if (res.ok) {
        setHotelData(await res.json());
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error('Failed to delete booking');
    }
  };

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
    if (!hotelData) return;
    
    setIsGeneratingPdf(true);
    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      
      // Load Greek-supporting font
      const fontLoaded = await loadFont(pdf);
      const fontFamily = fontLoaded ? 'Roboto' : 'helvetica';
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 14;
      let yPosition = margin;

      pdf.setFontSize(18);
      pdf.setFont(fontFamily, 'bold');
      pdf.text('Hotel Room List', margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont(fontFamily, 'normal');
      pdf.setTextColor(100);
      pdf.text(`Generated: ${format(new Date(), 'PPpp')}`, margin, yPosition);
      yPosition += 12;

      pdf.setFontSize(14);
      pdf.setFont(fontFamily, 'bold');
      pdf.setTextColor(0);
      pdf.text('Hotel Details', margin, yPosition);
      yPosition += 8;

      const totalDays = calculateTotalDays();
      const detailsData = [
        ['Name', hotelData.name, 'Event', hotelData.event_name],
        ['Total Active Bookings', String(hotelData.total_bookings), 'Total Days Booked', String(totalDays)],
        ['DEF Amount', `€${Number(hotelData.def_amount ?? 0).toFixed(2)}`, 'Guest Amount', `€${Number(hotelData.guest_amount ?? 0).toFixed(2)}`],
      ];

      autoTable(pdf, {
        startY: yPosition,
        body: detailsData,
        theme: 'plain',
        styles: {
          fontSize: 9,
          cellPadding: 3,
          font: fontFamily,
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 40, textColor: [100, 100, 100] },
          1: { cellWidth: 80 },
          2: { fontStyle: 'bold', cellWidth: 40, textColor: [100, 100, 100] },
          3: { cellWidth: 80 },
        },
        margin: { left: margin, right: margin },
      });

      yPosition = (pdf).lastAutoTable.finalY + 12;

      const tableHeaders = [
        'Full Name',
        'Position',
        'Company',
        'Companion',
        'Pax',
        'Check In',
        'Check Out',
        'Room Type',
        'Total',
        'DEF',
        'Guest',
        'Guest Days',
        'Status',
        'Notes',
        'Updated'
      ];

      for (const roomType of hotelData.room_types) {
        if (roomType.bookings.length === 0) continue;

        if (yPosition > pdf.internal.pageSize.getHeight() - 40) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setFontSize(12);
        pdf.setFont(fontFamily, 'bold');
        pdf.setTextColor(0);
        pdf.text(roomType.name, margin, yPosition);
        yPosition += 6;

        const tableData = roomType.bookings.map((booking) => [
          `${booking.first_name} ${booking.last_name}`,
          booking.job_title || '-',
          booking.company || '-',
          booking.companion_full_name || '-',
          booking.num_pax ?? '-',
          format(new Date(booking.check_in_date), 'dd/MM/yy'),
          format(new Date(booking.check_out_date), 'dd/MM/yy'),
          booking.room_type_name ?? '-',
          booking.total_cost != null ? `€${Number(booking.total_cost).toFixed(2)}` : '-',
          booking.def_cost != null ? `€${Number(booking.def_cost).toFixed(2)}` : '-',
          booking.guest_cost != null ? `€${Number(booking.guest_cost).toFixed(2)}` : '-',
          booking.days_paid_by_guest ?? 0,
          getStatusText(booking),
          booking.notes || '-',
          getModificationText(booking),
        ]);

        autoTable(pdf, {
          startY: yPosition,
          head: [tableHeaders],
          body: tableData,
          theme: 'striped',
          styles: {
            font: fontFamily,
          },
          headStyles: {
            fillColor: [59, 130, 246],
            textColor: 255,
            fontSize: 7,
            fontStyle: 'bold',
            cellPadding: 2,
          },
          bodyStyles: {
            fontSize: 7,
            cellPadding: 2,
          },
          columnStyles: {
            0: { cellWidth: 26 },  // Full Name
            1: { cellWidth: 22 },  // Position
            2: { cellWidth: 22 },  // Company
            3: { cellWidth: 22 },  // Companion
            4: { cellWidth: 10, halign: 'center' },  // Pax
            5: { cellWidth: 16 },  // Check In
            6: { cellWidth: 16 },  // Check Out
            7: { cellWidth: 20 },  // Room Type
            8: { cellWidth: 16, halign: 'right' },  // Total
            9: { cellWidth: 16, halign: 'right' },  // DEF
            10: { cellWidth: 16, halign: 'right' },  // Guest
            11: { cellWidth: 13, halign: 'center' },  // Guest Days
            12: { cellWidth: 18 },  // Status
            13: { cellWidth: 22 },  // Notes
            14: { cellWidth: 18 },  // Updated
          },
          margin: { left: margin, right: margin },
          didParseCell: function(data) {
            if (data.section === 'body' && data.column.index === 12) {
              const booking = roomType.bookings[data.row.index];
              if (booking) {
                data.cell.styles.textColor = getStatusPdfColor(booking);
                data.cell.styles.fontStyle = 'bold';
              }
            }
          },
        });

        yPosition = (pdf).lastAutoTable.finalY + 10;
      }

      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFont(fontFamily, 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pageWidth - margin,
          pdf.internal.pageSize.getHeight() - 10,
          { align: 'right' }
        );
        pdf.text(
          hotelData.name,
          margin,
          pdf.internal.pageSize.getHeight() - 10
        );
      }

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
            <div>
              <p className="text-gray-600">DEF amount</p>
              <p className="font-medium">€{Number(hotelData.def_amount ?? 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600">Guest amount</p>
              <p className="font-medium">€{Number(hotelData.guest_amount ?? 0).toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Bookings</h2>
          {hotelData.room_types.map((roomType) => (
            <div key={roomType.room_type_id} className="mb-8">
              <h3 className="text-xl font-semibold mb-4">{roomType.name}</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Companion Full Name</TableHead>
                    <TableHead>Number of pax</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Room type</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>DEF Cost</TableHead>
                    <TableHead>Guest Cost</TableHead>
                    <TableHead>Days paid by guest</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Updated At</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roomType.bookings.map((booking) => (
                    <TableRow key={booking.booking_id}>
                      <TableCell>
                        {booking.first_name} {booking.last_name}
                      </TableCell>
                      <TableCell>{booking.job_title || '-'}</TableCell>
                      <TableCell>{booking.company || '-'}</TableCell>
                      <TableCell>{booking.companion_full_name || '-'}</TableCell>
                      <TableCell>{booking.num_pax ?? '-'}</TableCell>
                      <TableCell>
                        {format(new Date(booking.check_in_date), 'PP')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(booking.check_out_date), 'PP')}
                      </TableCell>
                      <TableCell>{booking.room_type_name ?? '-'}</TableCell>
                      <TableCell>
                        {booking.total_cost != null ? `€${Number(booking.total_cost).toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        {booking.def_cost != null ? `€${Number(booking.def_cost).toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        {booking.guest_cost != null ? `€${Number(booking.guest_cost).toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        {booking.days_paid_by_guest ?? 0}
                      </TableCell>
                      <TableCell>
                        <span className={`capitalize ${getStatusColor(booking)}`}>
                          {getStatusText(booking)}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-pre-wrap">
                        {booking.notes || '-'}
                      </TableCell>
                      <TableCell>
                        {getModificationText(booking)}
                      </TableCell>
                      <TableCell>
                        {(booking.status === 'cancelled' || booking.status === 'invalidated') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePermanentDelete(booking, roomType.name)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ))}
        </Card>
      </div>

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
