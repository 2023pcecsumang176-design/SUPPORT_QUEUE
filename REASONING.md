# Reasoning

## Reading the brief for the actual spec

The problem statement is deliberately just a story about Priya, not a spec — the instructions say
as much ("the way Priya talks about her queue tells you what it needs"). So the first job was to
extract requirements from her specific complaints:

| Priya says...                                                              | Requirement                                                    |
|-------------------------------------------------------------------------------|------------------------------------------------------------------|
| "always pick the most pressing ticket next"                                   | The list has one canonical order; there's no manual re-sorting.  |
| "urgent within 2 hours, normal within a day"                                  | Two priority tiers, each with an SLA / response-time promise.    |
| "anything past its promised time jumping to the front"                        | Overdue status **overrides** priority in the ordering.           |
| "what's overdue?"                                                             | A filter for tickets currently past SLA.                         |
| "what's assigned to me?"                                                      | Tickets have an assignee; filter by assignee.                    |
| "looking up a specific customer's ticket by name"                             | Search by customer name.                                         |
| "the list is huge, so she pages through it"                                   | Pagination, not an infinite unpaginated list.                    |
| "two-person IT helpdesk"                                                      | At least two agents to assign between (kept it open-ended: any agent name works, not hardcoded to exactly two). |
| "Build it for any helpdesk, not just Priya's"                                 | Don't hardcode her name/company; keep the domain generic (customers, agents, tickets). |

The parenthetical hint — "get tickets and the queue order right first, then filters and
assignment" — set the build order and where to spend the most care: the ordering rule is graded as
the core of the exercise, so it needed to be correct, explicit, and testable, not just "roughly
right in the UI."

## The ordering rule, precisely

The phrase "anything past its promised time jumping to the front" is unambiguous once you take it
literally: overdue-ness is a **higher-order sort key than priority**. A `normal` ticket that
breached its 24h SLA outranks a fresh `urgent` ticket that still has 90 minutes left. This is a
two-tier comparator:

1. **Tier 1 — overdue vs. not.** Overdue tickets always sort before non-overdue tickets.
2. **Tier 2a — among overdue tickets:** most overdue first (earliest due-time first), since the
   ticket that's been broken the longest is presumably the angriest customer / biggest fire.
2. **Tier 2b — among non-overdue tickets:** urgent before normal, then soonest-due first — this is
   the "who's about to breach next" ordering, so Priya is naturally warned before something tips
   into tier 1.

"Due time" itself is derived, not stored: `createdAt + SLA hours for that priority`. Overdue-ness
is computed live from `Date.now()` rather than cached, because a ticket's overdue status changes
purely with the passage of time — storing it would mean it silently goes stale.

Closed tickets are excluded from "overdue" entirely (a resolved ticket isn't pressing, no matter
how late it was resolved) and excluded from the default queue view — but they're not deleted, so
history and the "closed" filter both still work.

This logic is isolated in one pure, dependency-free file (`server/queue.js`) with no framework code
mixed in, specifically so it could be unit tested in isolation and read on its own as "the rule."
That felt more important than which web framework or database sat around it.

## Why this tech stack

The instructions say any stack is fine, and grading online in a fresh Codespace, so I optimized
for **zero friction to run**, not for showing off framework breadth:

- **Express + a JSON file, not a database.** A real product would use Postgres/SQLite, but that's
  setup overhead for a take-home reviewer with no payoff — the interesting logic (ordering,
  filtering) is identical either way. The storage module (`server/store.js`) is a thin,
  swappable layer for exactly this reason.
- **Plain HTML/CSS/JS frontend, no build step.** No bundler, no framework version drift, no
  `npm run build` step to forget. `npm install && npm start` is the entire setup.
- **Node's built-in test runner** instead of Jest/Mocha, again to minimize dependencies while still
  having real, runnable, CI-friendly tests for the one piece of logic that most needed to be
  demonstrably correct.

## What I deliberately left out

Per the brief's own priority order ("tickets and queue order right first, then filters and
assignment"), I didn't spend time on:
- Authentication / real user accounts (the "assigned to me" filter is a dropdown of agent names
  rather than a login system).
- Editing ticket text after creation from the UI (the API supports it; the UI doesn't expose it) —
  it's not something Priya asked for.
- Real-time push updates (the UI polls every 30s so overdue status/countdowns stay fresh, which is
  proportionate to a 2-person helpdesk, not a chat app).

These are called out again in the README's "known limitations" section rather than silently
omitted.
