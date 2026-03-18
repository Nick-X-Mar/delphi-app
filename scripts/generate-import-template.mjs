import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const headers = [
  'person_id',
  'salutation',
  'first_name',
  'last_name',
  'email',
  'mobile_phone',
  'nationality',
  'company',
  'job_title',
  'guest_type',
  'room_type',
  'room_size',
  'companion_full_name',
  'companion_email',
  'checkin_date',
  'checkout_date',
  'comments',
  'notes',
  'group_id',
  'accommodation_funding_type',
];

const exampleRows = [
  {
    person_id: 'EXT-001',
    salutation: 'Mr.',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@example.com',
    mobile_phone: '+30 6912345678',
    nationality: 'Greek',
    company: 'Acme Corp',
    job_title: 'CEO',
    guest_type: 'speaker',
    room_type: 'double',
    room_size: 2,
    companion_full_name: 'Jane Smith',
    companion_email: 'jane.smith@example.com',
    checkin_date: '2026-04-08',
    checkout_date: '2026-04-12',
    comments: 'VIP guest - early check-in requested',
    notes: 'Needs ground floor room',
    group_id: 'Smith Family',
    accommodation_funding_type: 'forum_covered',
  },
  {
    person_id: 'EXT-002',
    salutation: 'Ms.',
    first_name: 'Maria',
    last_name: 'Papadopoulos',
    email: 'maria.p@example.com',
    mobile_phone: '+30 6987654321',
    nationality: 'Greek',
    company: 'DEF Foundation',
    job_title: 'Director',
    guest_type: 'guest',
    room_type: 'single',
    room_size: 1,
    companion_full_name: '',
    companion_email: '',
    checkin_date: '2026-04-09',
    checkout_date: '2026-04-11',
    comments: '',
    notes: 'Vegetarian meals',
    group_id: '',
    accommodation_funding_type: 'self_funded',
  },
  // Row with errors: missing email, invalid phone
  {
    person_id: 'EXT-003',
    salutation: 'Prof.',
    first_name: 'Alex',
    last_name: '',
    email: '',
    mobile_phone: 'not-a-phone!',
    nationality: 'Italian',
    company: 'University of Rome',
    job_title: 'Professor',
    guest_type: 'speaker',
    room_type: 'single',
    room_size: 1,
    companion_full_name: '',
    companion_email: '',
    checkin_date: '2026-04-09',
    checkout_date: '2026-04-11',
    comments: 'ERROR EXAMPLE: missing last_name, email, and invalid phone',
    notes: '',
    group_id: '',
    accommodation_funding_type: '',
  },
  // Row with errors: missing person_id, invalid salutation
  {
    person_id: '',
    salutation: 'King',
    first_name: 'Test',
    last_name: 'User',
    email: 'invalid-email-no-at',
    mobile_phone: '+1 555 0100',
    nationality: 'American',
    company: 'Test Inc',
    job_title: 'Tester',
    guest_type: 'press',
    room_type: 'triple',
    room_size: 3,
    companion_full_name: '',
    companion_email: '',
    checkin_date: '2026-04-11',
    checkout_date: '2026-04-09',
    comments: 'ERROR EXAMPLE: missing person_id, invalid salutation, invalid email, invalid room_type, checkout before checkin',
    notes: '',
    group_id: '',
    accommodation_funding_type: '',
  },
];

// Create main data sheet
const ws = XLSX.utils.json_to_sheet(exampleRows, { header: headers });

// Set column widths
ws['!cols'] = headers.map((h) => ({
  wch: Math.max(h.length + 2, 18),
}));

// Create instructions sheet
const instructions = [
  ['Field', 'Required', 'Description', 'Valid Values'],
  ['person_id', 'Yes', 'Unique identifier for the person. Can be any text or number.', 'Any non-empty string'],
  ['salutation', 'No', 'Title/salutation', 'Mr., Ms., Mx., Prof., Doc., Amb.'],
  ['first_name', 'Yes', 'First name of the person', 'Any text'],
  ['last_name', 'Yes', 'Last name of the person', 'Any text'],
  ['email', 'Yes', 'Email address (must contain @)', 'Valid email format'],
  ['mobile_phone', 'No', 'Phone number', 'Digits, spaces, +, -, () only'],
  ['nationality', 'No', 'Nationality', 'Any text'],
  ['company', 'No', 'Company name', 'Any text'],
  ['job_title', 'No', 'Job title', 'Any text'],
  ['guest_type', 'No', 'Type of guest', 'speaker, press, guest, or custom text'],
  ['room_type', 'No', 'Room type preference', 'single or double'],
  ['room_size', 'No', 'Number of pax (auto-filled from room_type if empty)', 'Positive integer'],
  ['companion_full_name', 'No', 'Full name of companion (for double rooms)', 'Any text'],
  ['companion_email', 'No', 'Email of companion', 'Valid email format'],
  ['checkin_date', 'No', 'Check-in date (must be within event accommodation period)', 'YYYY-MM-DD'],
  ['checkout_date', 'No', 'Check-out date (must be after check-in, within accommodation period)', 'YYYY-MM-DD'],
  ['comments', 'No', 'Internal comments (not shared with hotels)', 'Any text'],
  ['notes', 'No', 'Notes sent to hotels', 'Any text'],
  ['group_id', 'No', 'Stay Together group name', 'Any text'],
  ['accommodation_funding_type', 'No', 'Who funds the accommodation', 'self_funded or forum_covered'],
  [],
  ['NOTES:'],
  ['- Rows 3 and 4 in the People sheet contain intentional errors as examples.'],
  ['- Remove all example rows before importing your data.'],
  ['- If a person_id already exists in the database, the row will UPDATE the existing record.'],
  ['- Dates must be in YYYY-MM-DD format (e.g. 2026-04-10).'],
];
const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
wsInstructions['!cols'] = [{ wch: 22 }, { wch: 10 }, { wch: 60 }, { wch: 40 }];

// Build workbook
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'People');
XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

// Write file
const outputPath = path.join(__dirname, '..', 'public', 'templates', 'people-import-template.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`Template generated at: ${outputPath}`);
