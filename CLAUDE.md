# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Accommodation management system for the Delphi Economic Forum. Manages hotel rooms, guest allocations, and bookings across multiple hotels for large-scale events. Built with Next.js 14 (App Router), PostgreSQL, and deployed on AWS.

## Commands

```bash
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run seed:people  # Seed people data
```

## Architecture

**Stack:** Next.js 14.2 (App Router) | React 18 | PostgreSQL (pg driver) | Tailwind CSS | Radix UI | AWS (S3, RDS)

**Path alias:** `@/*` maps to project root (configured in `jsconfig.json`)

### Key directories
- `app/(accommodation)/` — Route group for main features: hotels, people, events, accommodation, allocation
- `app/api/` — RESTful API routes (people, hotels, bookings, events, room-types, email-notifications, hubspot)
- `components/ui/` — Radix UI primitives (shadcn/ui pattern)
- `lib/` — Core utilities: `db.js` (pg Pool), `auth.js` (NextAuth), `s3.js`, `emailService.js`, `viewOnlyMode.js`

### Database
- Schema defined in `setup_db.sql`. Key tables: `people`, `people_details`, `hotels`, `room_types`, `room_availability`, `events`, `bookings`
- Junction tables: `event_hotels`, `event_people`, `event_room_types`
- `people.person_id` is a BIGINT from an external system (not auto-increment)
- `events.accommodation_start_date/end_date` are generated columns (event date +/- 2 days)
- Booking dates validated by database trigger against event accommodation period
- Event date changes auto-invalidate out-of-range bookings via trigger
- All queries use parameterized `pool.query('...WHERE id = $1', [id])` pattern

### Authentication
- NextAuth with credentials provider, JWT sessions (1-hour max age)
- Roles: `admin`, `level-1`, `level-2`
- Middleware protects all routes except `/api`, static files, and `/auth/login`
- `/admin` requires admin role; `/users` requires admin or level-1

### Key patterns
- **Event-scoped filtering**: Most features filter by a "working event" stored in localStorage. APIs accept `eventId` param.
- **View-only mode**: Events become read-only after end_date (`lib/viewOnlyMode.js`, 1-minute cache TTL)
- **Hotel categories**: VVIP, VIP, Decent, NEB — sorted by category then star rating
- **Booking statuses**: pending, confirmed, cancelled, invalidated, date_change, room_change
- **Guest types**: speaker, press, guest
- **Email**: HubSpot integration for notifications, tracked in `email_notifications` table
- **Client-side**: Debounced filters via `useDebounce`, Sonner toasts for feedback, modal-based forms
- **S3**: Hotel agreement PDFs stored in S3 with presigned URLs
- **DB dates**: DATE type parser overridden to return raw strings (no timezone conversion) — see `lib/db.js` line 3
