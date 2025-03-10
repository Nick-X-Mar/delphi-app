-- Create people table (managed by external system)
CREATE TABLE IF NOT EXISTS people (
    person_id INTEGER PRIMARY KEY,
    salutation VARCHAR(10) CHECK (salutation IN ('Mr.', 'Ms.', 'Mx.', 'Prof.', 'Doc.', 'Amb.')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    nationality VARCHAR(50),
    mobile_phone VARCHAR(30),
    email VARCHAR(100),
    room_type VARCHAR(10) CHECK (room_type IN ('single', 'double')),
    companion_full_name VARCHAR(200),
    companion_email VARCHAR(100),
    checkin_date DATE,
    checkout_date DATE,
    comments TEXT,
    app_synced BOOLEAN,
    app_synced_date DATE,
    guest_type VARCHAR(10) CHECK (guest_type IN ('speaker', 'press', 'guest')),
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the people_details table (managed by our system)
CREATE TABLE IF NOT EXISTS people_details (
    person_id INTEGER PRIMARY KEY,
    company VARCHAR(100),
    job_title VARCHAR(100),
    room_size INTEGER CHECK (room_size > 0),
    group_id VARCHAR(100),
    notes TEXT,
    category VARCHAR(10) CHECK (category IN ('VVIP', 'VIP', 'Regular', 'Other')) DEFAULT 'Regular',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    FOREIGN KEY (person_id) REFERENCES people(person_id) ON DELETE CASCADE
);

-- Create hotels table (managed by our system)
CREATE TABLE IF NOT EXISTS hotels (
    hotel_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    area VARCHAR(255) NOT NULL,
    stars NUMERIC(2,1) CHECK (stars IS NULL OR (stars >= 0.0 AND stars <= 5.0)),
    address TEXT,
    phone_number VARCHAR(50),
    email VARCHAR(255),
    website_link TEXT,
    map_link TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('VVIP', 'VIP', 'Decent', 'NEB')),
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
    CONSTRAINT positive_base_price CHECK (base_price_per_night >= 0)
);

-- Create room_availability table
DROP TABLE IF EXISTS public.room_availability;

CREATE TABLE IF NOT EXISTS public.room_availability
(
    room_type_id integer NOT NULL,
    date date NOT NULL,
    available_rooms integer NOT NULL,
    price_per_night numeric(10,2) NOT NULL,
    CONSTRAINT room_availability_pkey PRIMARY KEY (room_type_id, date),
    CONSTRAINT room_availability_room_type_id_fkey FOREIGN KEY (room_type_id)
        REFERENCES public.room_types (room_type_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)
TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.room_availability
    OWNER to delphiapp;

-- Create bookings table (managed by our system)
CREATE TABLE IF NOT EXISTS bookings
(
    booking_id integer NOT NULL DEFAULT nextval('bookings_booking_id_seq'::regclass),
    event_id integer NOT NULL,
    person_id integer NOT NULL,
    room_type_id integer NOT NULL,
    check_in_date date NOT NULL,
    check_out_date date NOT NULL,
    status character varying(50) COLLATE pg_catalog."default" NOT NULL DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    payable boolean NOT NULL DEFAULT true,
    total_cost numeric(10,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT bookings_pkey PRIMARY KEY (booking_id),
    CONSTRAINT bookings_event_id_fkey FOREIGN KEY (event_id)
        REFERENCES events (event_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT bookings_person_id_fkey FOREIGN KEY (person_id)
        REFERENCES people (person_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT bookings_room_type_id_fkey FOREIGN KEY (room_type_id)
        REFERENCES room_types (room_type_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT bookings_status_check CHECK (status::text = ANY (ARRAY[
        'pending'::character varying, 
        'confirmed'::character varying, 
        'cancelled'::character varying, 
        'invalidated'::character varying,
        'date_change'::character varying,
        'room_change'::character varying
    ]::text[])),
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

CREATE TABLE IF NOT EXISTS event_hotels (
    event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    hotel_id INTEGER NOT NULL REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, hotel_id)
);

-- Create event_people table
CREATE TABLE IF NOT EXISTS event_people (
    event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES people(person_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'),
    PRIMARY KEY (event_id, person_id)
);

-- Create event_room_types table
CREATE TABLE IF NOT EXISTS event_room_types (
    event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    hotel_id INTEGER NOT NULL REFERENCES hotels(hotel_id) ON DELETE CASCADE,
    room_type_id INTEGER NOT NULL REFERENCES room_types(room_type_id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, hotel_id, room_type_id)
);

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

-- Create trigger function to update event active status
CREATE OR REPLACE FUNCTION update_event_active_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Set is_active based on accommodation period
    -- An event is active only during its accommodation period
    NEW.is_active = (
        CURRENT_DATE >= NEW.accommodation_start_date AND 
        CURRENT_DATE <= NEW.accommodation_end_date
    );
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for events table to update active status
DROP TRIGGER IF EXISTS update_event_active_status ON events;
CREATE TRIGGER update_event_active_status
    BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_event_active_status();

-- Create function to update all events' active status
CREATE OR REPLACE FUNCTION update_all_events_active_status()
RETURNS void AS $$
BEGIN
    UPDATE events
    SET is_active = (
        CURRENT_DATE >= accommodation_start_date AND 
        CURRENT_DATE <= accommodation_end_date
    )
    WHERE is_active != (
        CURRENT_DATE >= accommodation_start_date AND 
        CURRENT_DATE <= accommodation_end_date
    );
END;
$$ language 'plpgsql';

-- Modify group_id column in people_details
ALTER TABLE people_details 
  DROP COLUMN IF EXISTS group_id,
  ADD COLUMN group_id VARCHAR(100);

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    role VARCHAR(20) CHECK (role IN ('admin', 'level-1', 'level-2')),
    google_id VARCHAR(255) UNIQUE,
    image VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert initial admin user (password will be 'admin123' - should be changed immediately)
INSERT INTO users (name, email, password, role) 
VALUES (
    'Admin User', 
    'admin@example.com',
    '$2b$10$nD1MyB0K8xqka/9x5yyMau.xhLhi29Pmhuv3qYE2FkIhg1ksqI2oK',
    'admin'
) ON CONFLICT (email) DO NOTHING;


CREATE TABLE email_notifications (
    id SERIAL PRIMARY KEY,
    guest_id INTEGER,
    event_id INTEGER NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notification_type VARCHAR(50) NOT NULL, 
    booking_id INTEGER REFERENCES bookings(booking_id),
    recipient_email VARCHAR(255),
    subject VARCHAR(255),
    status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
    status_id VARCHAR(100),
    error_message TEXT,
    FOREIGN KEY (guest_id) REFERENCES people(person_id),
    FOREIGN KEY (event_id) REFERENCES events(event_id)
);