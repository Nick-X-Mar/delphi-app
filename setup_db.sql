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
    checkin_date DATE,
    checkout_date DATE,
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

-- Create bookings table (managed by our system)
CREATE TABLE IF NOT EXISTS bookings (
    booking_id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(event_id),
    person_id INTEGER NOT NULL REFERENCES people(person_id),
    room_type_id INTEGER NOT NULL REFERENCES room_types(room_type_id),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_dates CHECK (check_out_date > check_in_date)
);

-- Create trigger function to validate booking dates against event dates
CREATE OR REPLACE FUNCTION validate_booking_dates()
RETURNS TRIGGER AS $$
DECLARE
    acc_start_date DATE;
    acc_end_date DATE;
BEGIN
    -- Get event's accommodation dates
    SELECT accommodation_start_date, accommodation_end_date 
    INTO acc_start_date, acc_end_date
    FROM events 
    WHERE event_id = NEW.event_id;

    -- Check if booking dates are within event's accommodation period
    IF NEW.check_in_date < acc_start_date OR NEW.check_out_date > acc_end_date THEN
        RAISE EXCEPTION 'Booking dates must be within event accommodation period (% to %)', 
            acc_start_date, acc_end_date;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for bookings table to validate dates
DROP TRIGGER IF EXISTS validate_booking_dates ON bookings;
CREATE TRIGGER validate_booking_dates
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION validate_booking_dates();

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

-- Create triggers for bookings table
DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger function to handle event date changes
CREATE OR REPLACE FUNCTION handle_event_date_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Update status of bookings that are now outside the event's accommodation dates
    UPDATE bookings
    SET status = 'invalidated',
        updated_at = CURRENT_TIMESTAMP
    WHERE event_id = NEW.event_id
    AND (
        check_in_date < NEW.accommodation_start_date OR
        check_out_date > NEW.accommodation_end_date
    );
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for events table to handle date changes
DROP TRIGGER IF EXISTS handle_event_date_changes ON events;
CREATE TRIGGER handle_event_date_changes
    AFTER UPDATE OF start_date, end_date ON events
    FOR EACH ROW
    WHEN (
        OLD.start_date != NEW.start_date OR 
        OLD.end_date != NEW.end_date
    )
    EXECUTE FUNCTION handle_event_date_changes();
