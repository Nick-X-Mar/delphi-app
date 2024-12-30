-- Create people table (managed by external system)
CREATE TABLE IF NOT EXISTS people (
    person_id INTEGER PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE
);

-- Create the people_details table (managed by our system)
CREATE TABLE IF NOT EXISTS people_details (
    person_id INTEGER PRIMARY KEY REFERENCES people(person_id),
    department VARCHAR(100),
    position VARCHAR(100),
    start_date DATE,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    FOREIGN KEY (person_id) REFERENCES people(person_id) ON DELETE CASCADE
);

-- Create hotels table (managed by our system)
CREATE TABLE IF NOT EXISTS hotels (
    hotel_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    area VARCHAR(255) NOT NULL,
    stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
    address TEXT,
    phone_number VARCHAR(50),
    email VARCHAR(255),
    website_link TEXT,
    map_link TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('VIP', 'Very Good', 'Good')),
    contact_name VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_mobile VARCHAR(50),
    contact_email VARCHAR(255),
    agreement_file_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
);

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    event_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    accommodation_start_date DATE GENERATED ALWAYS AS (start_date - INTERVAL '2 days')::date STORED,
    accommodation_end_date DATE GENERATED ALWAYS AS (end_date + INTERVAL '2 days')::date STORED,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

-- Create room_types table (managed by our system)
CREATE TABLE IF NOT EXISTS room_types (
    room_type_id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    total_rooms INTEGER NOT NULL,
    base_price_per_night DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    CONSTRAINT positive_base_price CHECK (base_price_per_night > 0)
);

-- Create room_availability table (managed by our system)
CREATE TABLE IF NOT EXISTS room_availability (
    room_type_id INTEGER REFERENCES room_types(room_type_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    available_rooms INTEGER NOT NULL,
    price_per_night DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (room_type_id, date)
);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'UTC';
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for hotels table
DROP TRIGGER IF EXISTS update_hotels_updated_at ON hotels;
CREATE TRIGGER update_hotels_updated_at
    BEFORE UPDATE ON hotels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create triggers for room_types table
DROP TRIGGER IF EXISTS update_room_types_updated_at ON room_types;
CREATE TRIGGER update_room_types_updated_at
    BEFORE UPDATE ON room_types
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create triggers for events table
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert example people (simulating external system data)
INSERT INTO people (person_id, first_name, last_name, email) VALUES
    (1, 'John', 'Doe', 'john.doe@example.com'),
    (2, 'Jane', 'Smith', 'jane.smith@example.com'),
    (3, 'Michael', 'Johnson', 'michael.johnson@example.com')
ON CONFLICT (email) DO NOTHING;

-- Insert example people details
INSERT INTO people_details (person_id, department, position, start_date, notes) VALUES
    (1, 'Engineering', 'Software Engineer', '2023-01-15', 'Full stack developer'),
    (2, 'Marketing', 'Marketing Manager', '2023-02-01', 'Digital marketing specialist'),
    (3, 'Sales', 'Sales Representative', '2023-03-01', 'Enterprise accounts')
ON CONFLICT (person_id) DO NOTHING;

-- Insert example hotels
INSERT INTO hotels (
    name, area, stars, address, phone_number, email, website_link, map_link, 
    category, agreement_file_link, contact_name, contact_phone, contact_mobile, contact_email
) VALUES
    (
        'Grand Resort & Spa', 
        'Seaside', 
        5, 
        '123 Beach Road, Coastal City', 
        '+30 2310 123456', 
        'info@grandresort.com',
        'https://www.grandresort.com',
        'https://maps.google.com/grandresort',
        'VIP',
        'https://agreements.com/grand-resort-2024.pdf',
        'George Papadopoulos',
        '+30 2310 123457',
        '+30 694 5555555',
        'g.papadopoulos@grandresort.com'
    ),
    (
        'City Center Hotel', 
        'Downtown', 
        4, 
        '45 Main Street, City Center', 
        '+30 2310 654321', 
        'info@citycenterhotel.com',
        'https://www.citycenterhotel.com',
        'https://maps.google.com/citycenter',
        'Very Good',
        'https://agreements.com/city-center-2024.pdf',
        'Maria Nikolaou',
        '+30 2310 654322',
        '+30 697 7777777',
        'm.nikolaou@citycenterhotel.com'
    );

-- Insert example room types
INSERT INTO room_types (hotel_id, name, description, total_rooms) VALUES
    (1, 'Standard Double', 'Comfortable room with double bed and city view', 20),
    (1, 'Deluxe Sea View', 'Luxurious room with king-size bed and sea view', 15),
    (1, 'Executive Suite', 'Spacious suite with separate living area', 5),
    (2, 'Standard Single', 'Cozy room with single bed', 10),
    (2, 'Business Double', 'Modern room with work desk and double bed', 25);

-- Insert example room availability (for the next 10 days)
WITH RECURSIVE dates AS (
    SELECT CURRENT_DATE as date
    UNION ALL
    SELECT date + 1
    FROM dates
    WHERE date < CURRENT_DATE + 9
)
INSERT INTO room_availability (room_type_id, date, available_rooms, price_per_night)
SELECT 
    rt.room_type_id,
    d.date,
    rt.total_rooms, -- Initially all rooms are available
    CASE 
        WHEN rt.name LIKE '%Suite%' THEN 300.00
        WHEN rt.name LIKE '%Deluxe%' THEN 200.00
        WHEN rt.name LIKE '%Business%' THEN 150.00
        ELSE 100.00
    END as price_per_night
FROM room_types rt
CROSS JOIN dates d
ON CONFLICT (room_type_id, date) DO NOTHING; 