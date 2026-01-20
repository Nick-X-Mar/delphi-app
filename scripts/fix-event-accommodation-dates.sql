-- Fix generated accommodation dates to be +/- 2 days from event dates.
-- This will drop and recreate the generated columns with the correct formula.

ALTER TABLE events
  DROP COLUMN IF EXISTS accommodation_start_date,
  DROP COLUMN IF EXISTS accommodation_end_date;

ALTER TABLE events
  ADD COLUMN accommodation_start_date DATE GENERATED ALWAYS AS (start_date - INTERVAL '2 days') STORED,
  ADD COLUMN accommodation_end_date DATE GENERATED ALWAYS AS (end_date + INTERVAL '2 days') STORED;
