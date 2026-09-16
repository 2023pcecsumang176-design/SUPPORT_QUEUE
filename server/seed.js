'use strict';

// Generates realistic demo data so the queue ordering is visible immediately:
// a mix of urgent/normal tickets, some already overdue, some assigned,
// some not, spread across more than one page.

const store = require('./store');

const AGENTS = ['Priya', 'Alex'];

const CUSTOMERS = [
  'Rohan Mehta', 'Sara Khan', 'Liu Wei', 'Amara Okafor', 'Diego Alvarez',
  'Emma Thompson', 'Kenji Sato', 'Fatima Noor', 'Carlos Rivas', 'Priya Nair',
  'James O\'Neill', 'Ana Petrova', 'Tom Becker', 'Nia Williams', 'Yusuf Demir',
  'Grace Park', 'Ivan Petrov', 'Mei Lin', 'Oscar Dubois', 'Leah Cohen',
  'Hana Suzuki', 'Omar Farouk', 'Chloe Martin', 'Ben Turner', 'Zara Ahmed',
];

const SUBJECTS = [
  { subject: 'Laptop won\'t boot before client demo', priority: 'urgent' },
  { subject: 'Production VPN down for whole team', priority: 'urgent' },
  { subject: 'Can\'t log into email', priority: 'urgent' },
  { subject: 'Requesting a second monitor', priority: 'normal' },
  { subject: 'Software license renewal question', priority: 'normal' },
  { subject: 'Printer on 3rd floor jammed', priority: 'normal' },
  { subject: 'New hire laptop setup', priority: 'normal' },
  { subject: 'Wifi dropping intermittently', priority: 'urgent' },
  { subject: 'Password reset request', priority: 'normal' },
  { subject: 'Payment terminal frozen, customers waiting', priority: 'urgent' },
  { subject: 'Slack notifications not working', priority: 'normal' },
  { subject: 'Screen flickering on external display', priority: 'normal' },
];

function hoursAgo(h) {
  return new Date(Date.now() - h * 3600 * 1000).toISOString();
}

function seed(count = 42) {
  const tickets = [];
  for (let i = 0; i < count; i++) {
    const s = SUBJECTS[i % SUBJECTS.length];
    const customer = CUSTOMERS[i % CUSTOMERS.length];
    // spread creation times so some are overdue, some fresh, some closed
    const ageHours = [0.5, 1, 1.9, 2.5, 4, 8, 20, 26, 30, 48][i % 10];
    const assigned = i % 3 === 0 ? null : AGENTS[i % AGENTS.length];
    const status = i % 11 === 0 ? 'closed' : 'open';
    tickets.push({
      id: `seed-${i}-${Date.now()}`,
      customerName: customer,
      subject: s.subject,
      description: `${s.subject} — reported via helpdesk portal.`,
      priority: s.priority,
      status,
      assignedTo: assigned,
      createdAt: hoursAgo(ageHours),
    });
  }
  // Ensure unique-ish ids
  tickets.forEach((t, i) => { t.id = `seed-${i}`; });
  store.replaceAll(tickets);
  console.log(`Seeded ${tickets.length} tickets into ${store.DATA_FILE}`);
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
