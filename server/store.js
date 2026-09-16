'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '..', 'data', 'tickets.json');

function load() {
  if (!fs.existsSync(DATA_FILE)) return [];
  const raw = fs.readFileSync(DATA_FILE, 'utf-8').trim();
  if (!raw) return [];
  return JSON.parse(raw);
}

function save(tickets) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(tickets, null, 2));
}

function all() {
  return load();
}

function getById(id) {
  return load().find((t) => t.id === id) || null;
}

function create(input) {
  const tickets = load();
  const ticket = {
    id: crypto.randomUUID(),
    customerName: input.customerName,
    subject: input.subject,
    description: input.description || '',
    priority: input.priority === 'urgent' ? 'urgent' : 'normal',
    status: 'open',
    assignedTo: input.assignedTo || null,
    createdAt: input.createdAt || new Date().toISOString(),
  };
  tickets.push(ticket);
  save(tickets);
  return ticket;
}

function update(id, patch) {
  const tickets = load();
  const idx = tickets.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const allowed = ['assignedTo', 'status', 'priority', 'subject', 'description'];
  for (const key of allowed) {
    if (key in patch) tickets[idx][key] = patch[key];
  }
  save(tickets);
  return tickets[idx];
}

function remove(id) {
  const tickets = load();
  const next = tickets.filter((t) => t.id !== id);
  const removed = next.length !== tickets.length;
  if (removed) save(next);
  return removed;
}

function replaceAll(tickets) {
  save(tickets);
}

module.exports = { all, getById, create, update, remove, replaceAll, DATA_FILE };
