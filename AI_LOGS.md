# AI Collaboration Log

A running record of where Claude was used during development, and
for what. Written after the fact as a summary, not a raw transcript —
condensed for readability but accurate to what actually happened.

## Frontend bug: ticket list not rendering

The ticket list stopped showing up after a change that made the
frontend load the agent list before rendering tickets:

```js
loadAgents().then(refresh);
```

If the `/api/agents` fetch was slow or failed, `refresh()` — the
function that actually renders tickets — never ran, since it was
chained behind it with no error handling. The list would silently
stay empty with no console error.

Fix: decoupled the two calls so they run independently, and wrapped
`loadAgents()` in a try/catch so a failed agent fetch can't block
ticket rendering at all:

```js
async function loadAgents() {
  try {
    knownAgents = await fetch('/api/agents').then((r) => r.json());
  } catch (err) {
    console.error('Failed to load agents:', err);
    knownAgents = [];
  }
  ...
}
...
loadAgents();
refresh();
setInterval(refresh, 30000);
```

Before landing on this, there was some back-and-forth caused by
commands being pasted into the local Windows PowerShell terminal
instead of the Codespace's Linux terminal — different shell, so
`cat`/heredoc syntax just errored out. No actual bug there, just the
wrong terminal window.

## Building the escalation sweep

The core requirement: any ticket that breaches its agreed response
time should have its priority bumped exactly one level
(`normal → high → urgent`), and never more than one level in a
single run.

The existing schema only had two priority levels (`urgent`,
`normal`), so a `high` tier was added with its own SLA (8 hours,
between urgent's 2h and normal's 24h — this wasn't specified in the
original brief, so it's a judgment call worth flagging if asked).

The sweep itself (`escalate.js`) walks all open tickets, checks
`isOverdue()` against the ticket's *current* priority, and bumps it
one step up the chain if so:

```js
const ESCALATION_ORDER = ['normal', 'high', 'urgent'];

function nextLevel(priority) {
  const idx = ESCALATION_ORDER.indexOf(priority);
  if (idx === -1 || idx === ESCALATION_ORDER.length - 1) return null;
  return ESCALATION_ORDER[idx + 1];
}
```

Exposed two ways: a `POST /api/escalate` endpoint plus a
`setInterval` in `server.js` so it runs automatically without
depending on anyone remembering to trigger it, and a standalone
`scripts/escalate.js` so the same sweep can run outside the server
process (cron, CI, manual testing).

## Deployment issues (case sensitivity, wrong folder name)

Two setup mistakes surfaced once the new files were added:

- `node -c src/escalate.js` failed with `MODULE_NOT_FOUND` — the
  actual folder was `server/`, not `src/`. Confirmed with
  `find . -name "*.js" -not -path "*/node_modules/*"`.
- The new files had been saved as `Escalate.js` (capital E) instead
  of `escalate.js`. Linux filesystems are case-sensitive, so
  `require('./escalate')` in `server.js` couldn't find them. Fixed
  with `mv Escalate.js escalate.js` in both `server/` and `scripts/`,
  plus correcting the require path in `scripts/escalate.js` from
  `../src/escalate` to `../server/escalate`.

## Verifying the "one level per run" rule

Ran `POST /api/escalate` three times in a row against the seeded
demo data (which includes tickets aged 26–48 hours, well past both
the `normal` and `high` SLAs):

- **Run 1:** 7 overdue `normal` tickets escalated to `high`.
- **Run 2:** the same 7, still overdue under `high`'s tighter 8h SLA,
  escalated to `urgent`.
- **Run 3:** `{"escalated":[],"count":0}` — those 7 are now `urgent`
  and correctly excluded, since there's nowhere higher to escalate.

This confirmed the sweep respects both halves of the requirement:
it catches breaches, and it never skips a level in a single run.
