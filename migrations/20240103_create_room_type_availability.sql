-- Create room_type_availability table
CREATE TABLE IF NOT EXISTS room_type_availability (
    id SERIAL PRIMARY KEY,
    room_type_id INTEGER NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    available_rooms INTEGER NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_type_id, date)
); 