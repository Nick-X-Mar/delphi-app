-- Make email optional on people table
ALTER TABLE people ALTER COLUMN email DROP NOT NULL;
