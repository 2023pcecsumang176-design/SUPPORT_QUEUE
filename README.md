# Helpdesk Ticket Queue

A queue management system for a small IT helpdesk. Built so the most
pressing ticket is always on top, with overdue tickets automatically
jumping the line — and a background sweep that escalates any ticket
that breaches its agreed response time.

## The problem

A two-person helpdesk with a constant stream of tickets, ranging from
"my laptop won't boot before a client demo" to "can I get a bigger
monitor." Each ticket has a priority and an agreed response time.
The person running the queue needs:

- The single most pressing ticket always at the top
- Anything past its promised response time to jump to the front,
  regardless of its original priority
- Quick answers to "what's overdue?" and "what's assigned to me?"
- Lookup by customer name
- Pagination, since the list is large

## Ordering rule

Two-tier sort, applied in this order:

1. **Overdue tickets always outrank non-overdue tickets.** A `normal`
   ticket that's overdue outranks an `urgent` ticket that still has
   time left.
2. Within each tier:
   - **Overdue tier:** sorted by most overdue first (earliest due
     date first).
   - **Not-yet-due tier:** sorted by priority first (`urgent` >
     `high` > `normal`), then soonest due date first.

Closed tickets never appear in the working queue but remain
searchable via filters.

## Priority levels and SLA

| Priority | Agreed response time |
|----------|----------------------|
| `urgent` | 2 hours |
| `high`   | 8 hours |
| `normal` | 24 hours |

New tickets are created as `urgent` or `normal`. `high` is reached
only through escalation (see below) — it's not a priority a ticket
starts at.

## The escalation sweep (the twist)

An automated check scans all open tickets and escalates any that
have breached their agreed response time, raising priority by
**exactly one level** per run: `normal → high → urgent`.

Rules:

- Only open tickets are considered.
- A ticket escalates only if it's currently overdue under its
  *current* priority's SLA.
- `urgent` tickets are left alone — nothing higher to escalate to.
- At most one level per run. A severely overdue ticket needs a
  separate run for each step up, rather than jumping straight to
  `urgent`.

This runs two ways:

- **Automatically**, on a timer, while the server is running
  (`server.js`, every 5 minutes by default — see
  `ESCALATION_INTERVAL_MS`).
- **On demand**, via `POST /api/escalate`, or standalone with
  `node scripts/escalate.js` (useful for cron / CI, without the
  server needing to be up).

## API

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/tickets` | Queue, filtered/searched/paginated |
| GET | `/api/tickets/:id` | Single ticket |
| POST | `/api/tickets` | Create a ticket |
| PATCH | `/api/tickets/:id` | Update assignment/status/priority/text |
| DELETE | `/api/tickets/:id` | Remove a ticket |
| GET | `/api/agents` | Known assignees |
| GET | `/api/sla` | Current SLA hours per priority |
| POST | `/api/escalate` | Run one escalation sweep, returns tickets bumped |

Query params on `GET /api/tickets`: `search`, `assignedTo`,
`overdueOnly`, `status` (`open` default / `closed` / `all`), `page`,
`pageSize`.

## Running it

```
npm install
node server/seed.js   # populate demo data
npm start
```

Then open the forwarded port in the browser.

## Project structure

```
server/
  server.js     - Express app and routes
  store.js      - JSON-file ticket storage
  queue.js      - Ordering rule, SLA, filtering/pagination
  escalate.js   - The escalation sweep
  seed.js       - Demo data generator
scripts/
  escalate.js   - Standalone entry point for the sweep
public/
  app.js        - Frontend
data/
  tickets.json  - Ticket storage (generated)
```
