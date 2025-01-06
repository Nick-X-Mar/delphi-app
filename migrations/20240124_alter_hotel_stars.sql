-- Alter stars column to support half stars
ALTER TABLE hotels 
  ALTER COLUMN stars TYPE NUMERIC(2,1),
  DROP CONSTRAINT hotels_stars_check,
  ADD CONSTRAINT hotels_stars_check CHECK (stars >= 1.0 AND stars <= 5.0);

-- Update existing data to ensure it's in the correct format
UPDATE hotels SET stars = stars::NUMERIC(2,1); 