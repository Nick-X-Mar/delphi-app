-- First drop the existing constraint
ALTER TABLE bookings 
  DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Add the new constraint with basic status values
ALTER TABLE bookings 
  ADD CONSTRAINT bookings_status_check 
  CHECK (status::text = ANY (ARRAY[
    'pending'::character varying, 
    'confirmed'::character varying, 
    'cancelled'::character varying,
    'invalidated'::character varying
  ]::text[]));

-- Add new modification columns
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS modification_type varchar(50),
  ADD COLUMN IF NOT EXISTS modification_date TIMESTAMP WITH TIME ZONE;

-- Add constraint for modification_type
ALTER TABLE bookings
  ADD CONSTRAINT bookings_modification_type_check
  CHECK (modification_type IS NULL OR modification_type::text = ANY (ARRAY[
    'date_change'::character varying,
    'room_change'::character varying,
    'cancelled'::character varying
  ]::text[]));

-- Update any existing bookings that might have null status to 'confirmed'
UPDATE bookings 
SET status = 'confirmed' 
WHERE status IS NULL;

-- Set modification_date for any existing cancelled bookings
UPDATE bookings
SET 
  modification_type = 'cancelled',
  modification_date = updated_at
WHERE status = 'cancelled'; 