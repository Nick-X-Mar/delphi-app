-- ============================================================
-- Migration: person_id BIGINT/INTEGER -> VARCHAR(100)
-- Run this on existing databases before deploying the updated app code.
-- ============================================================

BEGIN;

-- 1. Drop the primary key on people CASCADE — this automatically drops
--    ALL foreign keys referencing people.person_id, regardless of their names
ALTER TABLE people DROP CONSTRAINT people_pkey CASCADE;

-- 2. Also drop primary keys on tables whose PK includes person_id
ALTER TABLE people_details DROP CONSTRAINT IF EXISTS people_details_pkey;
ALTER TABLE event_people DROP CONSTRAINT IF EXISTS event_people_pkey;

-- 3. Alter all person_id / guest_id columns to VARCHAR(100)
ALTER TABLE people ALTER COLUMN person_id TYPE VARCHAR(100) USING person_id::VARCHAR(100);
ALTER TABLE people_details ALTER COLUMN person_id TYPE VARCHAR(100) USING person_id::VARCHAR(100);
ALTER TABLE bookings ALTER COLUMN person_id TYPE VARCHAR(100) USING person_id::VARCHAR(100);
ALTER TABLE event_people ALTER COLUMN person_id TYPE VARCHAR(100) USING person_id::VARCHAR(100);
ALTER TABLE email_notifications ALTER COLUMN guest_id TYPE VARCHAR(100) USING guest_id::VARCHAR(100);

-- 4. Re-add primary keys
ALTER TABLE people ADD CONSTRAINT people_pkey PRIMARY KEY (person_id);
ALTER TABLE people_details ADD CONSTRAINT people_details_pkey PRIMARY KEY (person_id);
ALTER TABLE event_people ADD CONSTRAINT event_people_pkey PRIMARY KEY (event_id, person_id);

-- 5. Re-add all foreign key constraints
ALTER TABLE people_details ADD CONSTRAINT people_details_person_id_fkey
  FOREIGN KEY (person_id) REFERENCES people(person_id) ON DELETE CASCADE;

ALTER TABLE bookings ADD CONSTRAINT bookings_person_id_fkey
  FOREIGN KEY (person_id) REFERENCES people(person_id) ON UPDATE NO ACTION ON DELETE NO ACTION;

ALTER TABLE event_people ADD CONSTRAINT event_people_person_id_fkey
  FOREIGN KEY (person_id) REFERENCES people(person_id) ON DELETE CASCADE;

ALTER TABLE email_notifications ADD CONSTRAINT email_notifications_guest_id_fkey
  FOREIGN KEY (guest_id) REFERENCES people(person_id);

COMMIT;
