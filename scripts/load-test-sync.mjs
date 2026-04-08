// Load test for /api/sync/people
//
// Sends N concurrent requests, each containing ONE person, to simulate
// the external system's behavior. Reports per-request status, latency,
// and a final breakdown.
//
// Usage:
//   SYNC_URL="https://your-app.example.com/api/sync/people" \
//   COUNT=300 \
//   CONCURRENCY=300 \
//   PREFIX="loadtest" \
//   node scripts/load-test-sync.mjs
//
// Environment variables:
//   SYNC_URL     Required. Full URL of the sync endpoint.
//   COUNT        Total number of requests to send (default: 300).
//   CONCURRENCY  How many to fire in parallel at once (default: COUNT).
//                Set lower (e.g. 20) if you want to throttle.
//   PREFIX       String prefix used for synthetic person_ids and emails
//                so the test data is easy to identify and clean up.
//                Default: "loadtest".
//
// Notes:
//   - Each generated person_id is `${PREFIX}-${timestamp}-${i}` so reruns
//     don't collide.
//   - The script does NOT clean up created rows. Delete them with:
//       DELETE FROM people WHERE person_id LIKE '%loadtest-%';
//     (after first removing FK references in event_people / people_details)

const SYNC_URL = process.env.SYNC_URL;
const COUNT = parseInt(process.env.COUNT || '300', 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || String(COUNT), 10);
const PREFIX = process.env.PREFIX || 'loadtest';
const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10);

if (!SYNC_URL) {
  console.error('ERROR: SYNC_URL environment variable is required.');
  console.error('Example:');
  console.error('  SYNC_URL="https://your-app/api/sync/people" node scripts/load-test-sync.mjs');
  process.exit(1);
}

const RUN_ID = Date.now();

function makePerson(i) {
  const id = `${PREFIX}-${RUN_ID}-${i}`;
  return {
    person_id: id,
    first_name: `Load${i}`,
    last_name: `Test${i}`,
    email: `${id}@loadtest.invalid`,
    salutation: 'Mr.',
    mobile_phone: '+300000000000',
    company: 'LoadTest Co',
    companion_full_name: null,
    companion_email: null,
    job_title: 'Tester',
    room_type: i % 2 === 0 ? 'single' : 'double',
    nationality: 'GR',
    checkin_date: null,
    checkout_date: null,
    comments: `load test run ${RUN_ID}`,
    guest_type: 'guest',
    accommodation_funding_type: 'forum_covered',
  };
}

async function sendOne(person, idx) {
  const start = Date.now();
  let status = 0;
  let bodySnippet = '';
  let errorMsg = null;

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(person),
      signal: controller.signal,
    });
    status = res.status;
    try {
      const text = await res.text();
      bodySnippet = text.slice(0, 200);
    } catch (_) {
      bodySnippet = '<failed to read body>';
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      errorMsg = `timeout after ${REQUEST_TIMEOUT_MS}ms`;
    } else {
      errorMsg = `${err.name}: ${err.message}`;
    }
  } finally {
    clearTimeout(timeoutHandle);
  }

  const ms = Date.now() - start;
  return { idx, person_id: person.person_id, status, ms, errorMsg, bodySnippet };
}

// Process in chunks of CONCURRENCY (a chunk fires fully in parallel,
// next chunk starts when previous completes).
async function runChunked(items, concurrency, worker) {
  const results = new Array(items.length);
  for (let start = 0; start < items.length; start += concurrency) {
    const slice = items.slice(start, start + concurrency);
    const sliceResults = await Promise.all(
      slice.map((item, i) => worker(item, start + i))
    );
    for (let j = 0; j < sliceResults.length; j++) {
      results[start + j] = sliceResults[j];
    }
    process.stderr.write(
      `... fired ${Math.min(start + concurrency, items.length)}/${items.length}\n`
    );
  }
  return results;
}

(async () => {
  console.log(`Load test → ${SYNC_URL}`);
  console.log(`COUNT=${COUNT}  CONCURRENCY=${CONCURRENCY}  PREFIX=${PREFIX}  RUN_ID=${RUN_ID}`);
  console.log('');

  const people = Array.from({ length: COUNT }, (_, i) => makePerson(i));
  const overallStart = Date.now();

  const results = await runChunked(people, CONCURRENCY, sendOne);

  const overallMs = Date.now() - overallStart;

  // Aggregate
  const byStatus = new Map();
  let networkErrors = 0;
  const latencies = [];
  for (const r of results) {
    if (r.errorMsg) {
      networkErrors++;
      const key = `network:${r.errorMsg.split(':')[0]}`;
      byStatus.set(key, (byStatus.get(key) || 0) + 1);
    } else {
      byStatus.set(r.status, (byStatus.get(r.status) || 0) + 1);
    }
    latencies.push(r.ms);
  }
  latencies.sort((a, b) => a - b);
  const pct = (p) => latencies[Math.min(latencies.length - 1, Math.floor(p * latencies.length))];

  console.log('');
  console.log('=== SUMMARY ===');
  console.log(`Total requests:   ${results.length}`);
  console.log(`Wall time:        ${overallMs} ms (${(overallMs / 1000).toFixed(1)}s)`);
  console.log(`Network errors:   ${networkErrors}`);
  console.log('Status breakdown:');
  for (const [k, v] of [...byStatus.entries()].sort()) {
    console.log(`  ${k}: ${v}`);
  }
  console.log('Latency (ms):');
  console.log(`  min  ${latencies[0]}`);
  console.log(`  p50  ${pct(0.5)}`);
  console.log(`  p90  ${pct(0.9)}`);
  console.log(`  p99  ${pct(0.99)}`);
  console.log(`  max  ${latencies[latencies.length - 1]}`);

  // Show first 10 non-200s for inspection
  const failures = results.filter((r) => r.errorMsg || (r.status && r.status >= 400));
  if (failures.length > 0) {
    console.log('');
    console.log(`First failures (showing up to 10 of ${failures.length}):`);
    for (const f of failures.slice(0, 10)) {
      console.log(
        `  #${f.idx} ${f.person_id} → ${f.errorMsg ? `ERR ${f.errorMsg}` : `HTTP ${f.status}`} (${f.ms}ms) ${f.bodySnippet ? '| ' + f.bodySnippet : ''}`
      );
    }
  }

  // Exit non-zero if anything failed, useful for CI
  process.exit(failures.length > 0 ? 1 : 0);
})();
