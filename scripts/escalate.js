'use strict';

// Standalone entry point for the escalation sweep — run this directly
// (e.g. `node scripts/escalate.js`) from cron, a scheduled CI job, or by
// hand. Doesn't require the server to be running; it reads/writes the
// same tickets.json the server uses.
//
// NOTE: adjust the require path below ('../src/escalate') if your
// project folder isn't named 'src' — it should point at wherever
// store.js / queue.js / escalate.js live.

const { runEscalation } = require('../server/escalate');

const escalated = runEscalation();

if (escalated.length === 0) {
  console.log('No tickets breached SLA — nothing to escalate.');
} else {
  console.log(`Escalated ${escalated.length} ticket(s):`);
  escalated.forEach((e) => {
    console.log(`  ${e.customerName} (${e.id}): ${e.from} -> ${e.to}`);
  });
}