-- Remove category column from people_details
ALTER TABLE people_details 
  DROP COLUMN IF EXISTS category;

-- Remove guest_type check constraint from people
ALTER TABLE people 
  DROP CONSTRAINT IF EXISTS people_guest_type_check; 