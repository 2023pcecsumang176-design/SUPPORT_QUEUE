# Design Reasoning

## Why a two-tier sort, not a single weighted score

The brief is explicit: "always pick the most pressing ticket next,
with anything past its promised time jumping to the front." That's
not a single continuous score (like "priority weight minus hours
remaining") — it's a hard rule: breach status beats priority, always.
A `normal` ticket that's overdue must outrank an `urgent` ticket that
still has time, no matter how much time the urgent ticket has left.

A single weighted formula can accidentally let a high-priority,
barely-not-overdue ticket outscore a low-priority, badly-overdue one,
depending on how the weights are tuned. A strict two-tier comparator
avoids that: overdue status is checked first and decides the
comparison outright; priority and due-date only matter for breaking
ties *within* a tier. That directly encodes the stated rule instead
of approximating it.

## Why "most overdue first" within the overdue tier

Once a ticket is late, priority stops being the most useful signal —
duration of breach is. A ticket that breached its SLA 10 hours ago is
more urgent to clear than one that breached it 10 minutes ago,
independent of whether either was originally `normal` or `urgent`.
Sorting the overdue tier by earliest due date (i.e., longest overdue
first) reflects that directly.

## Why priority, then soonest-due, in the not-yet-overdue tier

Among tickets that are still on time, priority is the only signal
the helpdesk agent has expressed a preference about explicitly
("urgent" vs "normal" tickets). Soonest-due-date is the tiebreaker
within a priority level, so two `normal` tickets are ordered by
which one is closer to breaching — giving the agent a natural
early-warning ordering before anything actually goes overdue.

## Why priority needs a third level for escalation

The original schema only had `urgent`/`normal`. The escalation
requirement ("normal → high → urgent") needs an intermediate step, so
a `high` tier was added with its own SLA (8 hours — chosen as a
rough midpoint between urgent's 2h and normal's 24h; this number
isn't specified in the brief and can be adjusted if a specific value
is expected). Without a middle tier, "escalate one level" for a
`normal` ticket would have nowhere to go except straight to
`urgent`, which contradicts "at most one level per run."

## Why escalation checks the *current* SLA, not the original one

Recomputing `isOverdue()` against whatever priority a ticket
currently holds means a ticket that just got bumped from `normal` to
`high` is re-evaluated against `high`'s tighter 8-hour SLA on the
next sweep — not against `normal`'s original 24-hour window. That's
intentional: if a ticket has been open long enough to breach even
the tighter `high` SLA, it should be eligible to escalate again on
the *next* run. This is also what keeps "one level per run" honest —
a ticket can only move one step per sweep, but a badly overdue
ticket will naturally climb through multiple sweeps rather than
getting silently stuck at `high` forever.

## Why the sweep is exposed both as a timer and a standalone script

An "automated check" implies it shouldn't depend on a person
remembering to click something. Running it on a `setInterval` while
the server is up covers the common case. The standalone
`scripts/escalate.js` entry point exists so the same logic can run
independently of the server process — via cron, a scheduled CI job,
or a manual invocation for testing — without needing the whole app
running just to check for breaches.

## Why closed tickets are excluded from escalation and from the queue

A closed ticket has no agreed response time left to breach in any
meaningful sense — escalating its priority would just be noise. It's
excluded from both the ordering (nothing pressing about a resolved
ticket) and the escalation sweep, but stays fully queryable through
filters/search for historical lookup.
