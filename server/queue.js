'use strict';

/**
 * Core domain logic for the support queue.
 *
 * The single rule that matters most, per the problem statement:
 *   "always pick the most pressing ticket next, with anything past its
 *    promised time jumping to the front."
 *
 * That gives us a strict two-tier ordering:
 *   1. OVERDUE tickets always come before non-overdue tickets, no matter
 *      their priority. A normal ticket that's overdue outranks an urgent
 *      ticket that still has time left.
 *   2. Within each tier, order by urgency:
 *        - Overdue tier: most overdue first (earliest due date first) —
 *          the ticket that's been broken longest is the most on fire.
 *        - Not-yet-due tier: urgent priority first, then soonest due date
 *          first (i.e. effectively time-to-breach ascending).
 *
 * Closed/resolved tickets never show up in the "queue" ordering (there's
 * nothing pressing about a ticket that's done) but are kept in storage
 * and are reachable via search/filters.
 */

const SLA_HOURS = {
  urgent: 2,
  normal: 24,
};

function dueAt(ticket) {
  return new Date(ticket.createdAt).getTime() + SLA_HOURS[ticket.priority] * 3600 * 1000;
}

function isOverdue(ticket, now = Date.now()) {
  if (ticket.status === 'closed') return false;
  return now > dueAt(ticket);
}

const PRIORITY_WEIGHT = { urgent: 0, normal: 1 };

/**
 * Comparator implementing the two-tier rule above.
 */
function compareTickets(a, b, now = Date.now()) {
  const aOverdue = isOverdue(a, now);
  const bOverdue = isOverdue(b, now);

  if (aOverdue !== bOverdue) {
    // Overdue always jumps ahead of not-overdue.
    return aOverdue ? -1 : 1;
  }

  if (aOverdue && bOverdue) {
    // Most overdue (earliest due date) first.
    return dueAt(a) - dueAt(b);
  }

  // Neither overdue: priority first, then soonest due date.
  const pw = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
  if (pw !== 0) return pw;
  return dueAt(a) - dueAt(b);
}

/**
 * Applies filters, sorts by the queue rule, and paginates.
 *
 * options:
 *   search      - substring match on customer name (case-insensitive)
 *   assignedTo  - exact match on assignee, or 'unassigned'
 *   overdueOnly - boolean, only overdue tickets
 *   status      - 'open' (default: excludes closed) | 'closed' | 'all'
 *   page        - 1-based page number (default 1)
 *   pageSize    - items per page (default 20)
 */
function queryTickets(tickets, options = {}) {
  const now = options.now || Date.now();
  const {
    search = '',
    assignedTo = '',
    overdueOnly = false,
    status = 'open',
    page = 1,
    pageSize = 20,
  } = options;

  let result = tickets.slice();

  if (status === 'closed') {
    result = result.filter((t) => t.status === 'closed');
  } else if (status !== 'all') {
    // default 'open' view: hide closed tickets from the working queue
    result = result.filter((t) => t.status !== 'closed');
  }

  if (search.trim()) {
    const needle = search.trim().toLowerCase();
    result = result.filter((t) => t.customerName.toLowerCase().includes(needle));
  }

  if (assignedTo === 'unassigned') {
    result = result.filter((t) => !t.assignedTo);
  } else if (assignedTo) {
    result = result.filter((t) => t.assignedTo === assignedTo);
  }

  if (overdueOnly) {
    result = result.filter((t) => isOverdue(t, now));
  }

  result.sort((a, b) => compareTickets(a, b, now));

  const total = result.length;
  const start = (Math.max(1, page) - 1) * pageSize;
  const pageItems = result.slice(start, start + pageSize);

  // Attach computed fields the UI needs without storing derived state.
  const enriched = pageItems.map((t) => ({
    ...t,
    dueAt: new Date(dueAt(t)).toISOString(),
    overdue: isOverdue(t, now),
  }));

  return {
    tickets: enriched,
    total,
    page: Math.max(1, page),
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

module.exports = { SLA_HOURS, dueAt, isOverdue, compareTickets, queryTickets };
