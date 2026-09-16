'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { queryTickets, isOverdue, dueAt } = require('../server/queue');

const NOW = Date.parse('2026-01-10T12:00:00.000Z');

function hoursAgo(h) {
  return new Date(NOW - h * 3600 * 1000).toISOString();
}

function ticket(overrides) {
  return {
    id: Math.random().toString(36).slice(2),
    customerName: 'Test Customer',
    subject: 'Test subject',
    description: '',
    priority: 'normal',
    status: 'open',
    assignedTo: null,
    createdAt: hoursAgo(0),
    ...overrides,
  };
}

test('overdue tickets always rank above non-overdue tickets, regardless of priority', () => {
  const overdueNormal = ticket({ id: 'a', priority: 'normal', createdAt: hoursAgo(25) }); // >24h old normal => overdue
  const freshUrgent = ticket({ id: 'b', priority: 'urgent', createdAt: hoursAgo(0.5) }); // <2h old urgent => not overdue

  const { tickets } = queryTickets([freshUrgent, overdueNormal], { now: NOW, pageSize: 10 });
  assert.equal(tickets[0].id, 'a', 'overdue ticket should jump to the front even though the other is urgent');
  assert.equal(tickets[1].id, 'b');
});

test('within overdue tickets, most overdue (earliest due date) comes first', () => {
  const barelyOverdue = ticket({ id: 'a', priority: 'urgent', createdAt: hoursAgo(2.1) }); // due 2h, 0.1h overdue
  const veryOverdue = ticket({ id: 'b', priority: 'normal', createdAt: hoursAgo(30) }); // due 24h, 6h overdue

  const { tickets } = queryTickets([barelyOverdue, veryOverdue], { now: NOW, pageSize: 10 });
  assert.equal(tickets[0].id, 'b', 'the ticket that breached its SLA longer ago should come first');
  assert.equal(tickets[1].id, 'a');
});

test('within non-overdue tickets, urgent priority outranks normal', () => {
  const normal = ticket({ id: 'a', priority: 'normal', createdAt: hoursAgo(1) });
  const urgent = ticket({ id: 'b', priority: 'urgent', createdAt: hoursAgo(1) });

  const { tickets } = queryTickets([normal, urgent], { now: NOW, pageSize: 10 });
  assert.equal(tickets[0].id, 'b');
  assert.equal(tickets[1].id, 'a');
});

test('within same priority and not overdue, soonest due date comes first', () => {
  const dueSoon = ticket({ id: 'a', priority: 'urgent', createdAt: hoursAgo(1.5) }); // 0.5h left
  const dueLater = ticket({ id: 'b', priority: 'urgent', createdAt: hoursAgo(0.2) }); // 1.8h left

  const { tickets } = queryTickets([dueLater, dueSoon], { now: NOW, pageSize: 10 });
  assert.equal(tickets[0].id, 'a');
  assert.equal(tickets[1].id, 'b');
});

test('closed tickets are excluded from the default open queue', () => {
  const open = ticket({ id: 'a', status: 'open' });
  const closed = ticket({ id: 'b', status: 'closed' });

  const { tickets, total } = queryTickets([open, closed], { now: NOW, status: 'open', pageSize: 10 });
  assert.equal(total, 1);
  assert.equal(tickets[0].id, 'a');
});

test('closed tickets are never treated as overdue', () => {
  const closedOld = ticket({ id: 'a', status: 'closed', priority: 'urgent', createdAt: hoursAgo(100) });
  assert.equal(isOverdue(closedOld, NOW), false);
});

test('search filters by customer name, case-insensitively, substring match', () => {
  const a = ticket({ id: 'a', customerName: 'Sara Khan' });
  const b = ticket({ id: 'b', customerName: 'Rohan Mehta' });

  const { tickets } = queryTickets([a, b], { now: NOW, search: 'khan', pageSize: 10 });
  assert.equal(tickets.length, 1);
  assert.equal(tickets[0].id, 'a');
});

test('assignedTo filter supports exact match and "unassigned"', () => {
  const mine = ticket({ id: 'a', assignedTo: 'Priya' });
  const theirs = ticket({ id: 'b', assignedTo: 'Alex' });
  const nobody = ticket({ id: 'c', assignedTo: null });

  const mineResult = queryTickets([mine, theirs, nobody], { now: NOW, assignedTo: 'Priya', pageSize: 10 });
  assert.deepEqual(mineResult.tickets.map((t) => t.id), ['a']);

  const unassignedResult = queryTickets([mine, theirs, nobody], { now: NOW, assignedTo: 'unassigned', pageSize: 10 });
  assert.deepEqual(unassignedResult.tickets.map((t) => t.id), ['c']);
});

test('overdueOnly filter returns only breached tickets', () => {
  const overdue = ticket({ id: 'a', priority: 'normal', createdAt: hoursAgo(25) });
  const fine = ticket({ id: 'b', priority: 'normal', createdAt: hoursAgo(1) });

  const { tickets } = queryTickets([overdue, fine], { now: NOW, overdueOnly: true, pageSize: 10 });
  assert.deepEqual(tickets.map((t) => t.id), ['a']);
});

test('pagination slices results and reports correct totals/pages', () => {
  const many = Array.from({ length: 25 }, (_, i) => ticket({ id: `t${i}`, createdAt: hoursAgo(i) }));
  const page1 = queryTickets(many, { now: NOW, page: 1, pageSize: 10 });
  const page3 = queryTickets(many, { now: NOW, page: 3, pageSize: 10 });

  assert.equal(page1.tickets.length, 10);
  assert.equal(page1.total, 25);
  assert.equal(page1.totalPages, 3);
  assert.equal(page3.tickets.length, 5);
});

test('dueAt reflects SLA hours: 2h for urgent, 24h for normal', () => {
  const urgent = ticket({ priority: 'urgent', createdAt: new Date(NOW).toISOString() });
  const normal = ticket({ priority: 'normal', createdAt: new Date(NOW).toISOString() });

  assert.equal(dueAt(urgent) - NOW, 2 * 3600 * 1000);
  assert.equal(dueAt(normal) - NOW, 24 * 3600 * 1000);
});
