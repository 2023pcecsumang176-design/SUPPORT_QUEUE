'use strict';

const express = require('express');
const path = require('path');
const store = require('./store');
const { queryTickets, SLA_HOURS } = require('./queue');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// GET /api/tickets - the queue, filtered/searched/paginated
app.get('/api/tickets', (req, res) => {
  const { search = '', assignedTo = '', overdueOnly, status = 'open', page = '1', pageSize = '10' } = req.query;
  const result = queryTickets(store.all(), {
    search,
    assignedTo,
    overdueOnly: overdueOnly === 'true',
    status,
    page: parseInt(page, 10) || 1,
    pageSize: parseInt(pageSize, 10) || 10,
  });
  res.json(result);
});

// GET /api/agents - distinct assignees seen so far (plus known agents)
app.get('/api/agents', (req, res) => {
  const known = new Set(['Priya', 'Alex']);
  store.all().forEach((t) => { if (t.assignedTo) known.add(t.assignedTo); });
  res.json([...known].sort());
});

// GET /api/tickets/:id
app.get('/api/tickets/:id', (req, res) => {
  const ticket = store.getById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json(ticket);
});

// POST /api/tickets - create a new ticket
app.post('/api/tickets', (req, res) => {
  const { customerName, subject, description, priority, assignedTo } = req.body || {};
  if (!customerName || !subject) {
    return res.status(400).json({ error: 'customerName and subject are required' });
  }
  if (priority && !['urgent', 'normal'].includes(priority)) {
    return res.status(400).json({ error: "priority must be 'urgent' or 'normal'" });
  }
  const ticket = store.create({ customerName, subject, description, priority, assignedTo });
  res.status(201).json(ticket);
});

// PATCH /api/tickets/:id - assign, change status/priority, edit text
app.patch('/api/tickets/:id', (req, res) => {
  const updated = store.update(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: 'Ticket not found' });
  res.json(updated);
});

// DELETE /api/tickets/:id
app.delete('/api/tickets/:id', (req, res) => {
  const removed = store.remove(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Ticket not found' });
  res.status(204).end();
});

app.get('/api/sla', (req, res) => res.json(SLA_HOURS));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Support queue running on http://localhost:${PORT}`));
}

module.exports = app;
