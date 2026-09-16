'use strict';

/**
 * The "twist": an automated sweep that escalates any ticket which has
 * breached its agreed response time, bumping its priority up exactly
 * one level (normal -> high -> urgent).
 *
 * Rules, straight from the spec:
 *   - Only OPEN tickets are considered — a closed ticket is done, there's
 *     nothing pressing about it anymore.
 *   - A ticket escalates only if it is currently overdue under its
 *     CURRENT priority's SLA (see queue.js's isOverdue()).
 *   - Urgent tickets have nowhere higher to go, so they're left alone.
 *   - At most ONE level per run, even for a ticket that's wildly
 *     overdue. If it's still overdue after bumping (because the new,
 *     tighter SLA for the higher priority has also already passed), the
 *     *next* run will bump it again — but never two levels in a single
 *     sweep.
 *
 * Exposed two ways so it's genuinely automated rather than a button
 * someone has to remember to press:
 *   - server.js runs it on an interval while the server is up.
 *   - scripts/escalate.js runs it once, standalone, for cron / a
 *     scheduled CI job / manual invocation.
 */

const store = require('./store');
const { isOverdue } = require('./queue');

const ESCALATION_ORDER = ['normal', 'high', 'urgent'];

function nextLevel(priority) {
  const idx = ESCALATION_ORDER.indexOf(priority);
  if (idx === -1 || idx === ESCALATION_ORDER.length - 1) return null; // unknown, or already top
  return ESCALATION_ORDER[idx + 1];
}

/**
 * Runs one escalation sweep over all stored tickets.
 * Returns the list of tickets that got bumped, for logging/inspection.
 */
function runEscalation(now = Date.now()) {
  const tickets = store.all();
  const escalated = [];

  for (const ticket of tickets) {
    if (ticket.status === 'closed') continue;
    if (!isOverdue(ticket, now)) continue;

    const next = nextLevel(ticket.priority);
    if (!next) continue; // already urgent — nothing higher to escalate to

    store.update(ticket.id, { priority: next });
    escalated.push({
      id: ticket.id,
      customerName: ticket.customerName,
      from: ticket.priority,
      to: next,
    });
  }

  return escalated;
}

module.exports = { runEscalation, ESCALATION_ORDER, nextLevel };