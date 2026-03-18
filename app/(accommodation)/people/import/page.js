'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { validatePerson } from '@/lib/peopleValidation';
import { formatDate } from '@/utils/dateFormatters';
import { CheckCircleIcon, XCircleIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/solid';

const FIELD_COLUMNS = [
  'person_id', 'salutation', 'first_name', 'last_name', 'email',
  'mobile_phone', 'nationality', 'company', 'job_title', 'guest_type',
  'room_type', 'room_size', 'companion_full_name', 'companion_email',
  'checkin_date', 'checkout_date', 'comments', 'notes', 'group_id',
];

function normalizeDate(value) {
  if (!value) return '';
  // If it's already a string in YYYY-MM-DD format
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  // Excel serial number (e.g. 46133) — timezone-safe conversion
  if (typeof value === 'number' && value > 0) {
    const utcMs = (value - 25569) * 86400000; // 25569 = days from Excel epoch to Unix epoch
    const d = new Date(utcMs);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  // If it's a JS Date object (from SheetJS cellDates) — use UTC getters to avoid timezone shift
  if (value instanceof Date && !isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // Handle DD/MM/YYYY or D/M/YYYY string format (common in European Excel locales)
  if (typeof value === 'string') {
    const ddmmyyyy = value.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }
  return String(value);
}

export default function ImportPeoplePage() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [existingIds, setExistingIds] = useState(new Set());
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [fileLoaded, setFileLoaded] = useState(false);

  // Fetch events
  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await fetch('/api/events');
        if (!response.ok) throw new Error('Failed to fetch events');
        const data = await response.json();

        const today = new Date();
        const filtered = data.filter(event => {
          if (!event.end_date) return true;
          const endDate = new Date(event.end_date);
          endDate.setDate(endDate.getDate() + 5);
          return endDate >= today;
        });

        setEvents(filtered);

        const workingEventId = localStorage.getItem('workingEventId');
        if (workingEventId) {
          const found = filtered.find(e => e.event_id.toString() === workingEventId);
          if (found) {
            setSelectedEventId(workingEventId);
            return;
          }
        }
        if (filtered.length > 0) {
          setSelectedEventId(filtered[0].event_id.toString());
        }
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load events');
      }
    }
    fetchEvents();
  }, []);

  // Get selected event object
  const selectedEvent = useMemo(
    () => events.find(e => e.event_id.toString() === selectedEventId),
    [events, selectedEventId]
  );
  const accommStart = selectedEvent?.accommodation_start_date || null;
  const accommEnd = selectedEvent?.accommodation_end_date || null;

  // Validate all rows
  const validationResults = useMemo(() => {
    if (rows.length === 0) return [];

    // Check for duplicate person_ids within the file
    const idCounts = {};
    rows.forEach(row => {
      const id = String(row.person_id || '').trim();
      if (id) idCounts[id] = (idCounts[id] || 0) + 1;
    });

    return rows.map(row => {
      const result = validatePerson(row, {
        accommodationStartDate: accommStart,
        accommodationEndDate: accommEnd,
      });

      const id = String(row.person_id || '').trim();
      if (id && idCounts[id] > 1) {
        result.errors.push('Duplicate person_id in file');
        result.valid = false;
      }

      return result;
    });
  }, [rows, accommStart, accommEnd]);

  // Summary counts
  const validCount = validationResults.filter(r => r.valid).length;
  const invalidCount = validationResults.filter(r => !r.valid).length;
  const updateCount = rows.filter(r => existingIds.has(String(r.person_id || '').trim())).length;

  // Check which IDs exist in DB
  const checkExistingIds = useCallback(async (parsedRows) => {
    const ids = parsedRows
      .map(r => String(r.person_id || '').trim())
      .filter(id => id !== '');

    if (ids.length === 0) return;

    try {
      const response = await fetch('/api/people/check-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personIds: ids }),
      });
      if (response.ok) {
        const data = await response.json();
        setExistingIds(new Set(data.existing));
      }
    } catch (error) {
      console.error('Error checking IDs:', error);
    }
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (data.length === 0) {
        toast.error('No data found in the file');
        return;
      }

      // Normalize rows: trim keys, normalize dates
      const normalized = data.map(row => {
        const clean = {};
        for (const col of FIELD_COLUMNS) {
          // Try to find the column (case-insensitive match)
          const key = Object.keys(row).find(k => k.trim().toLowerCase() === col.toLowerCase());
          let val = key !== undefined ? row[key] : '';
          if (col === 'checkin_date' || col === 'checkout_date') {
            val = normalizeDate(val);
          }
          if (col === 'room_type' && val) {
            val = String(val).toLowerCase();
          }
          clean[col] = val !== undefined && val !== null ? val : '';
        }
        return clean;
      });

      setRows(normalized);
      setSelectedRows(new Set(normalized.map((_, i) => i)));
      setFileLoaded(true);
      await checkExistingIds(normalized);

      toast.success(`Loaded ${normalized.length} rows from ${file.name}`);
    } catch (error) {
      console.error('Error parsing file:', error);
      toast.error('Failed to parse file. Make sure it is a valid Excel or CSV file.');
    }

    // Reset file input
    e.target.value = '';
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRows(new Set(rows.map((_, i) => i)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleRowToggle = (index) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleImport = async () => {
    if (!selectedEventId) {
      toast.error('Please select an event');
      return;
    }

    // Collect only checked + valid rows
    const toImport = rows.filter((_, i) =>
      selectedRows.has(i) && validationResults[i]?.valid
    );

    if (toImport.length === 0) {
      toast.error('No valid rows selected for import');
      return;
    }

    try {
      setIsImporting(true);
      const response = await fetch('/api/people/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: parseInt(selectedEventId),
          people: toImport,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      const parts = [];
      if (data.inserted > 0) parts.push(`${data.inserted} new`);
      if (data.updated > 0) parts.push(`${data.updated} updated`);
      if (data.errors?.length > 0) parts.push(`${data.errors.length} errors`);

      toast.success(`Import complete: ${parts.join(', ')}`);
      router.push('/people');
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error.message || 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const selectedValidCount = rows.filter((_, i) =>
    selectedRows.has(i) && validationResults[i]?.valid
  ).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import People</h1>
        <div className="flex gap-3">
          <a
            href="/templates/people-import-template.xlsx"
            download
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Download Template
          </a>
          <Button variant="outline" onClick={() => router.push('/people')}>
            Back to People
          </Button>
        </div>
      </div>

      {/* File upload + Event selector */}
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Upload Excel / CSV</label>
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors text-sm font-medium">
            <ArrowUpTrayIcon className="h-4 w-4" />
            Choose File
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        <div className="min-w-[300px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Event *</label>
          <Select
            value={selectedEventId}
            onValueChange={setSelectedEventId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent>
              {events.map(event => {
                const displayName = event.tag || event.name;
                const eventDates = event.start_date && event.end_date
                  ? ` (${formatDate(event.start_date)} - ${formatDate(event.end_date)})`
                  : '';
                return (
                  <SelectItem key={event.event_id} value={event.event_id.toString()}>
                    {displayName}{eventDates}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {accommStart && accommEnd && (
            <p className="text-xs text-gray-500 mt-1">
              Accommodation period: {formatDate(accommStart)} – {formatDate(accommEnd)}
            </p>
          )}
        </div>
      </div>

      {/* Review table */}
      {fileLoaded && rows.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="flex gap-4 mb-4 text-sm">
            <span className="px-3 py-1 bg-gray-100 rounded-full font-medium">
              {rows.length} total rows
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">
              {validCount} valid
            </span>
            {invalidCount > 0 && (
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full font-medium">
                {invalidCount} invalid
              </span>
            )}
            {updateCount > 0 && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                {updateCount} updates
              </span>
            )}
            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full font-medium">
              {selectedValidCount} selected for import
            </span>
          </div>

          <div className="border rounded-lg overflow-auto max-h-[60vh]">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left w-10">
                    <Checkbox
                      checked={selectedRows.size === rows.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-3 py-2 text-left w-16">Status</th>
                  <th className="px-3 py-2 text-left w-20">Type</th>
                  {FIELD_COLUMNS.map(col => (
                    <th key={col} className="px-3 py-2 text-left whitespace-nowrap font-medium text-gray-700">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const validation = validationResults[i];
                  const isValid = validation?.valid;
                  const isExisting = existingIds.has(String(row.person_id || '').trim());

                  return (
                    <tr
                      key={i}
                      className={
                        !isValid
                          ? 'bg-red-50 hover:bg-red-100'
                          : isExisting
                          ? 'bg-blue-50 hover:bg-blue-100'
                          : 'hover:bg-gray-50'
                      }
                    >
                      <td className="px-3 py-2">
                        <Checkbox
                          checked={selectedRows.has(i)}
                          onCheckedChange={() => handleRowToggle(i)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        {isValid ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        ) : (
                          <div className="relative group">
                            <XCircleIcon className="h-5 w-5 text-red-500 cursor-help" />
                            <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-20 shadow-lg max-w-xs">
                              <ul className="list-disc list-inside space-y-0.5">
                                {validation?.errors.map((err, j) => (
                                  <li key={j}>{err}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {isExisting ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-200 text-blue-800">
                            UPDATE
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-200 text-green-800">
                            NEW
                          </span>
                        )}
                      </td>
                      {FIELD_COLUMNS.map(col => (
                        <td key={col} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate" title={String(row[col] || '')}>
                          {String(row[col] || '')}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Import button */}
          <div className="flex justify-end mt-6 gap-3">
            <Button variant="outline" onClick={() => router.push('/people')}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || selectedValidCount === 0 || !selectedEventId}
            >
              {isImporting
                ? 'Importing...'
                : `Import ${selectedValidCount} ${selectedValidCount === 1 ? 'Person' : 'People'}`}
            </Button>
          </div>
        </>
      )}

      {!fileLoaded && (
        <div className="text-center py-16 text-gray-500">
          <ArrowUpTrayIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">Upload an Excel or CSV file to get started</p>
          <p className="text-sm mt-1">
            Download the <a href="/templates/people-import-template.xlsx" download className="text-blue-600 hover:underline">template</a> for the correct format
          </p>
        </div>
      )}

      <Toaster />
    </div>
  );
}
