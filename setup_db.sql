--
-- PostgreSQL database dump
--
-- Dumped from database version 15.17 (Postgres.app)
-- Dumped by pg_dump version 17.2
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;
--
-- Name: handle_event_date_changes(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.handle_event_date_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;
--
-- Name: update_all_events_active_status(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.update_all_events_active_status() RETURNS void
    LANGUAGE plpgsql
    AS $$
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
$$;
--
-- Name: update_event_active_status(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.update_event_active_status() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Set is_active based on accommodation period
    -- An event is active only during its accommodation period
    NEW.is_active = (
        CURRENT_DATE >= NEW.accommodation_start_date AND
        CURRENT_DATE <= NEW.accommodation_end_date
    );
    RETURN NEW;
END;
$$;
--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP AT TIME ZONE 'UTC';
    RETURN NEW;
END;
$$;
--
-- Name: validate_booking_dates(); Type: FUNCTION; Schema: public; Owner: -
--
CREATE FUNCTION public.validate_booking_dates() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;
SET default_tablespace = '';
SET default_table_access_method = heap;
--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.bookings (
    booking_id integer NOT NULL,
    event_id integer NOT NULL,
    person_id bigint NOT NULL,
    room_type_id integer NOT NULL,
    check_in_date date NOT NULL,
    check_out_date date NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    payable boolean DEFAULT true NOT NULL,
    total_cost numeric(10,2) DEFAULT 0.00 NOT NULL,
    modification_type character varying(50),
    modification_date timestamp with time zone,
    CONSTRAINT bookings_modification_type_check CHECK (((modification_type IS NULL) OR ((modification_type)::text = ANY (ARRAY[('date_change'::character varying)::text, ('room_change'::character varying)::text, ('cancelled'::character varying)::text])))),
    CONSTRAINT bookings_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('confirmed'::character varying)::text, ('cancelled'::character varying)::text, ('invalidated'::character varying)::text]))),
    CONSTRAINT valid_dates CHECK ((check_out_date > check_in_date))
);
--
-- Name: bookings_booking_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--
CREATE SEQUENCE public.bookings_booking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: bookings_booking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--
ALTER SEQUENCE public.bookings_booking_id_seq OWNED BY public.bookings.booking_id;
--
-- Name: email_notifications; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.email_notifications (
    id integer NOT NULL,
    guest_id bigint,
    event_id integer NOT NULL,
    sent_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    notification_type character varying(50) NOT NULL,
    booking_id integer,
    recipient_email character varying(255),
    subject character varying(255),
    status character varying(50) DEFAULT 'sent'::character varying,
    status_id character varying(100),
    error_message text,
    CONSTRAINT email_notifications_status_check CHECK (((status)::text = ANY ((ARRAY['sent'::character varying, 'failed'::character varying, 'pending'::character varying])::text[])))
);
--
-- Name: email_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--
CREATE SEQUENCE public.email_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: email_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--
ALTER SEQUENCE public.email_notifications_id_seq OWNED BY public.email_notifications.id;
--
-- Name: event_hotels; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.event_hotels (
    event_id integer NOT NULL,
    hotel_id integer NOT NULL
);
--
-- Name: event_people; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.event_people (
    event_id integer NOT NULL,
    person_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text)
);
--
-- Name: event_room_types; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.event_room_types (
    event_id integer NOT NULL,
    hotel_id integer NOT NULL,
    room_type_id integer NOT NULL
);
--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.events (
    event_id integer NOT NULL,
    name character varying(255) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),
    updated_at timestamp with time zone DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),
    accommodation_start_date date GENERATED ALWAYS AS ((start_date - 3)) STORED,
    accommodation_end_date date GENERATED ALWAYS AS ((end_date + 3)) STORED,
    tag character varying(255),
    preparation_start_date date,
    preparation_end_date date,
    CONSTRAINT valid_dates CHECK ((end_date >= start_date)),
    CONSTRAINT valid_preparation_dates CHECK ((preparation_end_date >= preparation_start_date))
);
--
-- Name: events_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--
CREATE SEQUENCE public.events_event_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: events_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--
ALTER SEQUENCE public.events_event_id_seq OWNED BY public.events.event_id;
--
-- Name: hotels; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.hotels (
    hotel_id integer NOT NULL,
    name character varying(255) NOT NULL,
    area character varying(255) NOT NULL,
    stars numeric(2,1),
    address text,
    phone_number character varying(50),
    email character varying(255),
    website_link text,
    map_link text,
    category character varying(50) NOT NULL,
    contact_name character varying(255),
    contact_phone character varying(50),
    contact_mobile character varying(50),
    contact_email character varying(255),
    agreement_file_link text,
    created_at timestamp with time zone DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),
    updated_at timestamp with time zone DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),
    CONSTRAINT hotels_category_check CHECK (((category)::text = ANY ((ARRAY['VVIP'::character varying, 'VIP'::character varying, 'Decent'::character varying, 'NEB'::character varying])::text[]))),
    CONSTRAINT hotels_stars_check CHECK (((stars IS NULL) OR ((stars >= 0.0) AND (stars <= 5.0))))
);
--
-- Name: hotels_hotel_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--
CREATE SEQUENCE public.hotels_hotel_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: hotels_hotel_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--
ALTER SEQUENCE public.hotels_hotel_id_seq OWNED BY public.hotels.hotel_id;
--
-- Name: people; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.people (
    person_id bigint NOT NULL,
    salutation character varying(10),
    first_name character varying(100),
    last_name character varying(100),
    nationality character varying(50),
    mobile_phone character varying(30),
    email character varying(100),
    room_type character varying(50),
    companion_full_name character varying(200),
    companion_email character varying(100),
    checkin_date date,
    checkout_date date,
    comments text,
    app_synced boolean,
    app_synced_date date,
    guest_type character varying(10),
    synced_at timestamp with time zone DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),
    company character varying(300),
    job_title character varying(500),
    CONSTRAINT people_room_type_check CHECK (((room_type)::text = ANY (ARRAY[('single'::character varying)::text, ('double'::character varying)::text]))),
    CONSTRAINT people_salutation_check CHECK (((salutation)::text = ANY ((ARRAY['Mr.'::character varying, 'Ms.'::character varying, 'Mx.'::character varying, 'Prof.'::character varying, 'Doc.'::character varying, 'Amb.'::character varying])::text[])))
);
--
-- Name: people_details; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.people_details (
    person_id bigint NOT NULL,
    room_size integer,
    notes text,
    updated_at timestamp with time zone DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),
    group_id character varying(100),
    will_not_attend boolean DEFAULT false,
    CONSTRAINT people_details_room_size_check CHECK ((room_size > 0))
);
--
-- Name: room_availability; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.room_availability (
    room_type_id integer NOT NULL,
    date date NOT NULL,
    available_rooms integer NOT NULL,
    price_per_night numeric(10,2) NOT NULL
);
--
-- Name: room_types; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.room_types (
    room_type_id integer NOT NULL,
    hotel_id integer,
    name character varying(255) NOT NULL,
    description text,
    total_rooms integer NOT NULL,
    base_price_per_night numeric(10,2) DEFAULT 0.00 NOT NULL,
    created_at timestamp with time zone DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),
    updated_at timestamp with time zone DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC'::text),
    CONSTRAINT non_negative_base_price CHECK ((base_price_per_night >= (0)::numeric))
);
--
-- Name: room_types_room_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--
CREATE SEQUENCE public.room_types_room_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: room_types_room_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--
ALTER SEQUENCE public.room_types_room_type_id_seq OWNED BY public.room_types.room_type_id;
--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--
CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(255),
    email character varying(255) NOT NULL,
    password character varying(255),
    role character varying(20),
    image character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'level-1'::character varying, 'level-2'::character varying])::text[])))
);
--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--
CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--
ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
--
-- Name: bookings booking_id; Type: DEFAULT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.bookings ALTER COLUMN booking_id SET DEFAULT nextval('public.bookings_booking_id_seq'::regclass);
--
-- Name: email_notifications id; Type: DEFAULT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.email_notifications ALTER COLUMN id SET DEFAULT nextval('public.email_notifications_id_seq'::regclass);
--
-- Name: events event_id; Type: DEFAULT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.events ALTER COLUMN event_id SET DEFAULT nextval('public.events_event_id_seq'::regclass);
--
-- Name: hotels hotel_id; Type: DEFAULT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.hotels ALTER COLUMN hotel_id SET DEFAULT nextval('public.hotels_hotel_id_seq'::regclass);
--
-- Name: room_types room_type_id; Type: DEFAULT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.room_types ALTER COLUMN room_type_id SET DEFAULT nextval('public.room_types_room_type_id_seq'::regclass);
--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (booking_id);
--
-- Name: email_notifications email_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.email_notifications
    ADD CONSTRAINT email_notifications_pkey PRIMARY KEY (id);
--
-- Name: event_hotels event_hotels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.event_hotels
    ADD CONSTRAINT event_hotels_pkey PRIMARY KEY (event_id, hotel_id);
--
-- Name: event_people event_people_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.event_people
    ADD CONSTRAINT event_people_pkey PRIMARY KEY (event_id, person_id);
--
-- Name: event_room_types event_room_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.event_room_types
    ADD CONSTRAINT event_room_types_pkey PRIMARY KEY (event_id, hotel_id, room_type_id);
--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (event_id);
--
-- Name: hotels hotels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.hotels
    ADD CONSTRAINT hotels_pkey PRIMARY KEY (hotel_id);
--
-- Name: people_details people_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.people_details
    ADD CONSTRAINT people_details_pkey PRIMARY KEY (person_id);
--
-- Name: people people_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.people
    ADD CONSTRAINT people_pkey PRIMARY KEY (person_id);
--
-- Name: room_availability room_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.room_availability
    ADD CONSTRAINT room_availability_pkey PRIMARY KEY (room_type_id, date);
--
-- Name: room_types room_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.room_types
    ADD CONSTRAINT room_types_pkey PRIMARY KEY (room_type_id);
--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);
--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
--
-- Name: idx_email_notifications_bulk; Type: INDEX; Schema: public; Owner: -
--
CREATE INDEX idx_email_notifications_bulk ON public.email_notifications USING btree (event_id) WHERE (guest_id IS NULL);
--
-- Name: idx_people_details_group_id; Type: INDEX; Schema: public; Owner: -
--
CREATE INDEX idx_people_details_group_id ON public.people_details USING btree (group_id);
--
-- Name: events handle_event_date_changes; Type: TRIGGER; Schema: public; Owner: -
--
CREATE TRIGGER handle_event_date_changes AFTER UPDATE OF start_date, end_date ON public.events FOR EACH ROW WHEN (((old.start_date <> new.start_date) OR (old.end_date <> new.end_date))) EXECUTE FUNCTION public.handle_event_date_changes();
--
-- Name: bookings update_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
--
-- Name: events update_event_active_status; Type: TRIGGER; Schema: public; Owner: -
--
CREATE TRIGGER update_event_active_status BEFORE INSERT OR UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_event_active_status();
--
-- Name: events update_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
--
-- Name: hotels update_hotels_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
CREATE TRIGGER update_hotels_updated_at BEFORE UPDATE ON public.hotels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
--
-- Name: room_types update_room_types_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
CREATE TRIGGER update_room_types_updated_at BEFORE UPDATE ON public.room_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
--
-- Name: bookings validate_booking_dates; Type: TRIGGER; Schema: public; Owner: -
--
CREATE TRIGGER validate_booking_dates BEFORE INSERT OR UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.validate_booking_dates();
--
-- Name: bookings bookings_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(event_id);
--
-- Name: bookings bookings_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(person_id);
--
-- Name: bookings bookings_room_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_room_type_id_fkey FOREIGN KEY (room_type_id) REFERENCES public.room_types(room_type_id);
--
-- Name: email_notifications email_notifications_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.email_notifications
    ADD CONSTRAINT email_notifications_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(booking_id);
--
-- Name: email_notifications email_notifications_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.email_notifications
    ADD CONSTRAINT email_notifications_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(event_id);
--
-- Name: email_notifications email_notifications_guest_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.email_notifications
    ADD CONSTRAINT email_notifications_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.people(person_id) ON DELETE CASCADE;
--
-- Name: event_hotels event_hotels_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.event_hotels
    ADD CONSTRAINT event_hotels_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(event_id) ON DELETE CASCADE;
--
-- Name: event_hotels event_hotels_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.event_hotels
    ADD CONSTRAINT event_hotels_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(hotel_id) ON DELETE CASCADE;
--
-- Name: event_people event_people_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.event_people
    ADD CONSTRAINT event_people_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(event_id) ON DELETE CASCADE;
--
-- Name: event_people event_people_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.event_people
    ADD CONSTRAINT event_people_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(person_id) ON DELETE CASCADE;
--
-- Name: event_room_types event_room_types_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.event_room_types
    ADD CONSTRAINT event_room_types_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(event_id) ON DELETE CASCADE;
--
-- Name: event_room_types event_room_types_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.event_room_types
    ADD CONSTRAINT event_room_types_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(hotel_id) ON DELETE CASCADE;
--
-- Name: event_room_types event_room_types_room_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.event_room_types
    ADD CONSTRAINT event_room_types_room_type_id_fkey FOREIGN KEY (room_type_id) REFERENCES public.room_types(room_type_id) ON DELETE CASCADE;
--
-- Name: people_details people_details_person_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.people_details
    ADD CONSTRAINT people_details_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.people(person_id) ON DELETE CASCADE;
--
-- Name: people_details people_details_person_id_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.people_details
    ADD CONSTRAINT people_details_person_id_fkey1 FOREIGN KEY (person_id) REFERENCES public.people(person_id) ON DELETE CASCADE;
--
-- Name: room_availability room_availability_room_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.room_availability
    ADD CONSTRAINT room_availability_room_type_id_fkey FOREIGN KEY (room_type_id) REFERENCES public.room_types(room_type_id) ON DELETE CASCADE;
--
-- Name: room_types room_types_hotel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
ALTER TABLE ONLY public.room_types
    ADD CONSTRAINT room_types_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(hotel_id) ON DELETE CASCADE;
--
-- PostgreSQL database dump complete
--
