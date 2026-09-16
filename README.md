<<<<<<< HEAD
# Support Queue

A prioritized ticket queue for a small helpdesk team. Built for the "helpdesk is drowning" brief:
whatever ticket is most pressing — including anything that's blown past its promised response
time — is always at the top.

## What it does

- **The queue, ordered correctly.** Every ticket has a priority (`urgent` → 2h response SLA,
  `normal` → 24h) and a due time computed from when it was opened. Tickets that have passed their
  due time jump to the very front of the queue, ordered by *how* overdue they are (longest-broken
  first). Everything else is ordered by priority, then by how soon it's due.
- **Filters**: "overdue only", "assigned to \<agent\>" / "unassigned", and open/closed/all status.
- **Search** by customer name (case-insensitive, substring match).
- **Pagination**, since the list is meant to be huge.
- **Basic ticket lifecycle**: create a ticket, assign it to an agent, close/reopen it.

The ordering logic is the heart of the app and lives in one small, dependency-free, fully unit
tested module: [`server/queue.js`](server/queue.js). Everything else (Express routes, the plain
HTML/JS frontend) is a thin shell around it.

## Tech stack

- **Backend:** Node.js + Express. No database — tickets are stored in a JSON file
  (`data/tickets.json`) via a tiny storage module, so there's nothing to install or configure
  beyond `npm install`.
- **Frontend:** Plain HTML/CSS/JS (no build step), served as static files by the same Express
  server and talking to it over a small JSON API.
- **Tests:** Node's built-in test runner (`node --test`), no extra test framework dependency.

This was a deliberate choice for a take-home-sized project: it runs anywhere Node runs (including
a fresh GitHub Codespace) with a single `npm install`, no native modules to compile, and no DB
server to stand up.

## Setup & running (e.g. in GitHub Codespaces)

```bash
npm install
npm run seed     # populate data/tickets.json with realistic demo tickets
npm start        # starts the server on http://localhost:3000
```

Open the forwarded port 3000 (Codespaces will prompt you, or use the "Ports" tab) — you'll land on
the queue UI. If you don't seed first, the app still works, just starts empty.

To run without demo data (a clean slate):

```bash
rm -f data/tickets.json
npm start
```

## Running the tests

```bash
npm test
```

This runs the ordering/filtering/pagination test suite in `tests/ordering.test.js` — 11 tests
covering the SLA math and every ranking rule described above.

## API reference

| Method | Path                | Description                                                       |
|--------|---------------------|--------------------------------------------------------------------|
| GET    | `/api/tickets`      | The queue. Query params: `search`, `assignedTo` (`unassigned` or an agent name), `overdueOnly` (`true`/`false`), `status` (`open`\|`closed`\|`all`, default `open`), `page`, `pageSize`. |
| GET    | `/api/tickets/:id`  | A single ticket.                                                   |
| POST   | `/api/tickets`      | Create a ticket. Body: `customerName`, `subject`, `description?`, `priority?` (`urgent`\|`normal`, default `normal`), `assignedTo?`. |
| PATCH  | `/api/tickets/:id`  | Update a ticket (e.g. `{ "assignedTo": "Priya" }`, `{ "status": "closed" }`). |
| DELETE | `/api/tickets/:id`  | Remove a ticket.                                                    |
| GET    | `/api/agents`       | List of known agent names (for the assignee dropdowns).            |

## Project layout

```
server/
  queue.js     ordering + filtering + pagination logic (pure functions, unit tested)
  store.js     JSON-file storage (create/read/update/delete)
  server.js    Express app and routes
  seed.js      generates realistic demo tickets
public/
  index.html   UI shell
  app.js       fetches the queue, renders rows, handles filters/pagination/new-ticket modal
  styles.css   styling
tests/
  ordering.test.js   unit tests for server/queue.js
data/
  tickets.json       JSON "database" (created by seed or by using the app)
```

## Debugging notes

- **Server won't start / port in use:** something else is on port 3000. Run
  `PORT=4000 npm start` and use that port instead.
- **Queue looks empty:** you probably haven't run `npm run seed` and haven't created any tickets
  yet via the "+ New Ticket" button — this is expected on a clean checkout.
- **Ordering looks "wrong":** remember overdue always beats priority. A normal ticket opened
  yesterday will out-rank a brand-new urgent ticket, on purpose — see `server/queue.js` for the
  comment explaining why, and `tests/ordering.test.js` for the cases this is checked against.
- **Data got messy while testing:** just re-run `npm run seed` to reset `data/tickets.json` to a
  clean demo state, or delete the file to start empty.
- **Changes to `public/` not showing up:** the frontend has no build step or cache-busting; a hard
  refresh (Ctrl/Cmd+Shift+R) is usually enough if the browser cached an old `app.js`.

## Known limitations / things a real product would add next

- Single JSON file as storage — fine for a take-home, not for concurrent multi-agent writes at
  scale (a real version would use SQLite/Postgres).
- No authentication — "assigned to me" is simulated by filtering on an agent name from a dropdown
  rather than a logged-in user.
- No editing of an existing ticket's subject/description from the UI (the API supports it via
  `PATCH`, the UI only exposes assign/close for now) — left out to keep the surface area focused
  on the ordering/filtering/search/pagination behaviors the brief calls out.
=======
# AURIGA_ASSESS
>>>>>>> fa46adbf446458c9d26ab2a51a8471995454411c
