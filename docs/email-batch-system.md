# Email Batch System — Design & Implementation Plan

**Status:** In Progress
**Last updated:** 2026-04-21
**Owner:** Nick

## 1. Context & Motivation

The accommodation app sends booking confirmation emails to guests. Today, the whole flow runs **client-side in the browser**:

- The `EmailQueue` class (`lib/emailQueue.js`) iterates through bookings one-by-one using `await sendEmail(...)` inside the user's browser tab.
- If the user closes the tab, refreshes, or navigates away, the loop dies and remaining emails are never sent.
- There is no progress persistence, no pause/resume, no cancel, no rate limiting.

### Problems observed

1. **Silent data loss**: A user tried to send ~2000 emails and only a fraction were delivered because of tab/network interruptions mid-way.
2. **Inconsistent booking state**: The per-row *individual* send button sends an email but does **not** flip the booking status from `pending` to `confirmed` — so a guest can be contacted and still appear as pending forever.
3. **Delta send ignores individual contacts**: "Send Updates Since Last Bulk Email" only compares against the last *bulk* timestamp. Individual sends are invisible to it, which causes both false negatives (guest already contacted still listed) and the reverse (never sent because not in the delta window).
4. **Mock reference fallback**: When no real bulk notification exists for an event, `/api/email-notifications/last` returns a mock record using `event.start_date`. This makes the "Send Updates" button behave unpredictably on new events (silently does nothing, or sends to a confusing subset).
5. **No safeguards against double sends**: Pressing "Send Emails to All Guests" twice will resend to everyone, no matter what was sent before.

## 2. Goals

| # | Goal |
|---|---|
| G1 | Email sending runs server-side. Closing the browser does not interrupt it. |
| G2 | Users see live progress (counts, percentages) with Pause, Resume, Cancel controls. |
| G3 | After Cancel, already-sent emails are recorded so subsequent sends do not duplicate. |
| G4 | Individual send button updates booking status and records per-booking so the delta logic respects it. |
| G5 | "Send Updates" uses **per-booking** comparison (last successful email vs `booking.updated_at`), not a single global timestamp. |
| G6 | "Send Updates" is disabled until a real "Send to All" has run for the event. No more mock fallback. |
| G7 | Only one active batch can run per app (across events). Individual sends are blocked while a batch is running. |
| G8 | Existing 606 INDIVIDUAL records retroactively count as "contacted" so the first Updates run respects them. |

### Explicitly out of scope for this iteration

- Retry on failure (G: direct fail, user sees it in UI)
- HubSpot rate-limit throttling (keep current behaviour, fail fast)
- Force-send / "skip already contacted" toggle on "Send to All" (All = everyone, always)
- Global app-wide progress banner (progress UI only on accommodation page, under the buttons)
- AWS EventBridge watchdog cron (stay within Next.js API routes only)

## 3. Architecture Overview

Deployment constraint: the app runs on **AWS Amplify**, which executes Next.js API routes as **Lambda functions**. Lambdas cannot host long-running background processes. Each invocation has a max ~15 min execution time.

We use the **self-invoking Lambda chain** pattern: when a batch starts, one Lambda processes a small chunk of emails, then triggers the next Lambda via an internal HTTP call (fire-and-forget) before returning. This chains indefinitely until the batch is complete.

```
[Client]
   │ POST /api/email-batches               (start)
   ▼
[Next.js API Lambda #1]
   │  - insert batch + all jobs in DB
   │  - fire-and-forget fetch to /process
   │  - return batchId to client
   ▼
[Next.js API Lambda #2]  (worker, chunk 1)
   │  - claim N pending jobs
   │  - send them via HubSpot
   │  - update job rows + batch counters
   │  - fire-and-forget fetch to /process
   │  - return
   ▼
[Next.js API Lambda #3]  (worker, chunk 2)
   │  ...
   ▼
[Client polls GET /api/email-batches/:id every 2s for UI updates]
```

### Stall detection & recovery

Each worker invocation writes `last_activity_at = NOW()` on the batch row before processing its chunk. If the chain ever breaks (cold-start failure, network hiccup, HubSpot timeout kills the Lambda), the batch row stays `status = 'processing'` but `last_activity_at` goes stale.

Recovery is two-layered:

1. **Auto-resume on page load** — any component that mounts the batch status hook checks for stalled batches (`status='processing'` AND `last_activity_at < NOW() - 2 min`) and silently re-kicks the worker.
2. **Manual Resume button** — if the UI detects a stalled batch while the user is actively watching, it surfaces a red "Resume" button as a visible escape hatch.

This covers the realistic operational scenarios without requiring new AWS infra.

## 4. Database Schema

New migration: `migrations/004_email_batches.sql`.

### `email_batches` (parent job)

| Column | Type | Notes |
|---|---|---|
| `batch_id` | SERIAL PK | |
| `event_id` | INT FK → events | |
| `batch_type` | VARCHAR | `'BULK_ALL'` or `'BULK_CHANGES'` |
| `status` | VARCHAR | `'queued' \| 'processing' \| 'paused' \| 'completed' \| 'cancelled' \| 'failed'` |
| `total_count` | INT | |
| `sent_count` | INT | |
| `failed_count` | INT | |
| `skipped_count` | INT | |
| `created_by` | VARCHAR | user email/id |
| `created_at` | TIMESTAMP | |
| `started_at` | TIMESTAMP | |
| `completed_at` | TIMESTAMP | |
| `last_activity_at` | TIMESTAMP | heartbeat, updated before each chunk |
| `pause_requested` | BOOLEAN | worker checks before each chunk |
| `cancel_requested` | BOOLEAN | worker checks before each chunk |

**Constraint:** at most one batch with `status IN ('queued', 'processing', 'paused')` at any time, globally. Enforced via a partial unique index.

### `email_batch_jobs` (child — one per recipient)

| Column | Type | Notes |
|---|---|---|
| `job_id` | SERIAL PK | |
| `batch_id` | INT FK → email_batches | ON DELETE CASCADE |
| `booking_id` | INT FK → bookings | |
| `person_id` | VARCHAR FK → people | |
| `email_payload` | JSONB | all template fields frozen at batch creation |
| `status` | VARCHAR | `'pending' \| 'sending' \| 'sent' \| 'failed' \| 'skipped'` |
| `error_message` | TEXT | |
| `attempts` | INT | always 1 in v1 (no retry) |
| `sent_at` | TIMESTAMP | |

Indexes:
- `(batch_id, status)` — fast chunk claiming
- `(booking_id)` — fast lookup for delta logic

### Changes to `email_notifications` (existing table)

No schema change. We keep writing one row per successful send with the `booking_id`. This is the table the delta logic queries against, so it stays the source of truth. The new batch tables reference it by duplication — each successful job also writes an `email_notifications` row, preserving retroactive compatibility with the existing 606 INDIVIDUAL and 38 CHANGES records.

## 5. API Endpoints

All under `/app/api/email-batches/`.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/email-batches` | Create a new batch. Body: `{ eventId, type: 'BULK_ALL' \| 'BULK_CHANGES' }`. Returns `{ batchId }`. Validates no other batch is active, computes the recipient list server-side, inserts batch + jobs, fires the worker. |
| GET | `/api/email-batches/active` | Returns the currently running batch (if any) across the app, with counts. Used by UI to display progress on mount. |
| GET | `/api/email-batches/:id` | Returns batch row + aggregated counts. Used for polling. |
| POST | `/api/email-batches/:id/pause` | Sets `pause_requested = true`. Worker will transition to `paused` before its next chunk. |
| POST | `/api/email-batches/:id/resume` | Clears `pause_requested`, sets status to `processing`, fires worker. |
| POST | `/api/email-batches/:id/cancel` | Sets `cancel_requested = true`. Worker transitions to `cancelled`, drops pending jobs. Already-sent jobs remain recorded. |
| POST | `/api/email-batches/:id/process` | **Internal worker endpoint.** Not meant for direct client use. Auth: verify the caller is the server itself (shared secret header). |

### `/process` worker logic (single invocation)

```text
1. Load batch by id.
2. If status != 'processing' → exit.
3. Update batch.last_activity_at = NOW().
4. If cancel_requested → mark status='cancelled', delete pending jobs, exit.
5. If pause_requested → mark status='paused', exit.
6. Claim next N pending jobs:
   SELECT ... FROM email_batch_jobs
   WHERE batch_id = :id AND status = 'pending'
   ORDER BY job_id
   LIMIT N
   FOR UPDATE SKIP LOCKED
   → mark them 'sending'
7. For each claimed job: call HubSpot send-email.
   - On success: status='sent', sent_at=NOW(), insert email_notifications row, increment batch.sent_count.
     Also: UPDATE bookings SET status='confirmed' WHERE status='pending' AND booking_id = job.booking_id.
   - On failure: status='failed', error_message set, increment batch.failed_count. No retry.
8. If any pending jobs remain:
   - Fire-and-forget fetch to /process (chain continues).
9. Else:
   - Mark batch status='completed', completed_at=NOW().
10. Return 200.
```

Chunk size: **10 jobs per invocation** in v1 (≈ conservative for HubSpot latency, keeps each Lambda well under timeout, ≈ 200 invocations for 2000 emails).

## 6. UI Changes

File: `components/AccommodationTable.jsx`.

### Replace client-side `emailQueue` with server-side calls

- `handleSendBulkEmails` → `POST /api/email-batches` with `type: 'BULK_ALL'`.
- `handleSendEmailsForChanges` → `POST /api/email-batches` with `type: 'BULK_CHANGES'`.
- Both return immediately with a `batchId`; the UI starts polling.

### Progress panel (new section under the buttons)

Appears whenever there is an active batch for the app (discovered via `GET /api/email-batches/active` on mount or after starting).

```
┌──────────────────────────────────────────────┐
│  Sending emails · 1247 / 2000  (62%)         │
│  ████████████████████░░░░░░░░░░░             │
│  ✅ 1240 sent   ❌ 7 failed   ⏸ 753 pending  │
│  [ Pause ]   [ Cancel ]                      │
└──────────────────────────────────────────────┘
```

- While `status = 'paused'`: swap Pause for Resume.
- While `status = 'processing'` but `last_activity_at` > 2 min old: show a red banner "Batch appears stalled" + manual Resume button.
- On `completed` / `cancelled` / `failed`: show a final summary toast + leave the panel visible for ~1 minute before hiding (so user can read the outcome).

### Auto-resume hook

On mount of the accommodation page (and any other page that shows the panel), call `GET /api/email-batches/active`. If the returned batch is stalled, silently POST `/resume` before rendering.

### Button gating

| Button | Condition to be enabled |
|---|---|
| **Send Emails to All Guests** | No active batch. |
| **Send Updates Since Last Bulk** | No active batch **AND** at least one `email_batches` row with `batch_type = 'BULK_ALL'` and `status = 'completed'` exists for this event. |
| Individual send (per row) | No active batch. |

The current `lastBulkEmailTime` state and the `mock-from-event.start_date` fallback in `/api/email-notifications/last` are **removed**. Gating is computed from the real presence of a completed BULK_ALL batch.

## 7. Behaviour Rules

### Send Emails to All Guests

- Recipient list = all bookings for the event with `status IN ('confirmed', 'pending')` and a non-empty email.
- No filtering based on prior email history. "All" means all.
- Creates a batch with `type = 'BULK_ALL'`.
- On `completed`, the batch itself serves as the reference point for future "Send Updates" gating (see G6).

### Send Updates Since Last Bulk

- **Disabled** until at least one completed `BULK_ALL` batch exists for the event.
- Recipient list = bookings where:
  1. The booking has `status IN ('confirmed', 'pending')` and a non-empty email, AND
  2. Either the booking has never successfully received an email (per `email_notifications`), OR `booking.updated_at > MAX(email_notifications.sent_at)` for that booking.
- This automatically incorporates the 606 existing INDIVIDUAL records (G8): if a guest was contacted individually, their last notification timestamp exists in `email_notifications` and the check passes correctly.

### Individual send (per-row button)

- Sends one email.
- On success: writes to `email_notifications` with the `booking_id`, and updates `bookings.status` from `'pending'` to `'confirmed'` if applicable.
- **Disabled while a batch is active.**

### Cancel semantics

- Pending jobs are deleted from `email_batch_jobs`.
- Already-sent jobs keep their rows (and their `email_notifications` entries).
- Batch moves to `status = 'cancelled'`.
- Effect on future sends: the cancelled batch is **not** recognized as a "completed BULK_ALL" for the purposes of gating the Updates button. A subsequent full Send-to-All run is still required.
- However, guests who received an email during the cancelled batch are recorded in `email_notifications` with their `booking_id`, so the delta logic will skip them on Updates (once a proper BULK_ALL completes and the Updates button becomes available).

### Pause semantics

- Worker stops after its current chunk, batch moves to `status = 'paused'`.
- In-flight jobs (status='sending') are allowed to complete and persist their outcome.
- Resume re-enables the worker. Batch picks up exactly where it left off.

## 8. Migration & Rollout

1. Apply `004_email_batches.sql` on dev → staging → prod.
2. Deploy API routes and UI changes together. Old `lib/emailQueue.js` is no longer called but left in place (marked deprecated in a code comment). It can be deleted in a follow-up PR after a stable release cycle.
3. The old `handleSendEmail` client logic in AccommodationTable is rewritten in place; there is no behaviour gap for users.
4. No data migration is needed for existing `email_notifications` — the new delta logic reads them directly.
5. Remove the mock-record fallback from `/api/email-notifications/last` (or retire the endpoint entirely; it is replaced by batch existence checks).

## 9. Testing Checklist

- [ ] Start a Send-to-All batch, refresh the browser mid-way → progress panel reappears with the correct state.
- [ ] Start a batch, close the tab completely, reopen 5 minutes later → batch has continued and possibly completed.
- [ ] Pause mid-batch → counts freeze. Resume → continues from where it stopped.
- [ ] Cancel mid-batch → already-sent rows persist, pending rows are gone, batch shows "cancelled".
- [ ] Send an individual email → that booking flips to `confirmed` and appears in `email_notifications` with a `booking_id`.
- [ ] Run Send-to-All on a new event → Updates button becomes enabled only after the batch completes.
- [ ] Run Updates after the above → only touches bookings modified since their last email (or never contacted).
- [ ] Try to start a second batch while one is running → UI blocks, API returns conflict.
- [ ] Try to send an individual email while a batch is running → button is disabled.
- [ ] Simulate a stalled batch (manually set `last_activity_at` back 5 minutes) → auto-resume on page load continues it, and the manual Resume button is available as fallback.
- [ ] 2000-email dry run on a test event (using a test HubSpot account or mocked endpoint) to verify throughput and Lambda chain stability.

## 10. Future Improvements

These are deliberately **not** part of the current scope but are documented here so future contributors (or future me) can pick them up without re-discovering the trade-offs.

### Reliability

- **AWS EventBridge watchdog cron** — a scheduled rule every 5 minutes hits a `/api/email-batches/watchdog` endpoint that re-kicks any stalled batch. Truly autonomous recovery even when nobody is in the app. Requires new Terraform + IAM.
- **Retry with exponential backoff** — wrap HubSpot calls with 3-attempt retry and jittered backoff. Distinguish transient (5xx, network) from permanent (400, invalid email) failures. Record retry attempts on the job row.
- **Dead-letter surfacing** — a dashboard page listing failed jobs across all batches, with a one-click "retry selected".

### Rate limiting & performance

- **HubSpot rate-limit throttling** — add a configurable delay (e.g. 200 ms) between sends, or a token-bucket limiter shared across Lambda invocations (Redis / DynamoDB).
- **Parallel chunk processing** — run 2-3 worker chains concurrently with job locking via `FOR UPDATE SKIP LOCKED`. Halves wall-clock time for large batches.

### UX

- **Global app-wide banner** — show a thin progress strip in the top navbar while any batch is running, clickable to jump back to the accommodation page.
- **Skip-already-contacted toggle on Send-to-All** — optional checkbox to filter out already-contacted guests, making Send-to-All a softer operation when needed.
- **Scheduled sends** — queue a batch to start at a future time (e.g. "send tomorrow at 9am").
- **Per-guest preview** — show the rendered email body for a sample guest before triggering a large batch.
- **Batch history page** — list past batches per event with counts, who triggered them, and outcome; export as CSV.

### Delivery visibility

- **HubSpot delivery webhooks** — listen for `sent`, `delivered`, `opened`, `bounced`, `complained` events from HubSpot and update a new `email_delivery_status` column on `email_notifications`. Currently the app only knows "HubSpot accepted the request", not whether it actually reached the inbox.
- **Bounce handling** — mark guest email as invalid after repeated bounces, skip them automatically.

### Data & analytics

- **Analytics dashboard** — open-rate, send volume per day, top failure reasons.
- **Template versioning** — track which email template version each batch used, for audit.

### Operational

- **Multi-batch per event** — currently only one batch runs at a time app-wide. Relax to one-per-event if the team ever needs parallel sends across concurrent events.
- **RBAC on batch controls** — restrict Cancel/Pause to admins or the user who started the batch (currently anyone can).
- **Idempotency tokens on POST /api/email-batches** — prevent accidental duplicate batches from rapid double-clicks.

## 11. Known Limitations (v1)

- No retry on HubSpot failures. A transient HubSpot outage during a 2000-email batch will result in some failed jobs that need to be identified and re-sent manually.
- No rate-limit awareness. If HubSpot throttles us, those requests fail silently into the `failed` bucket.
- Progress is visible only on the accommodation page. Users on other pages do not see that a batch is running.
- The `last_activity_at` heartbeat has a 2-minute staleness window. A very slow HubSpot response could theoretically look stalled. Chunk size is tuned to keep this unlikely.
- Deleting an event cascades to its batches and jobs (by FK). If a batch is running when an event is deleted, the worker errors out on the next chunk. Not a realistic flow, but worth noting.
