const state = {
  search: '',
  assignedTo: '',
  overdueOnly: false,
  status: 'open',
  page: 1,
  pageSize: 10,
};

const els = {
  search: document.getElementById('searchInput'),
  assignee: document.getElementById('assigneeFilter'),
  overdue: document.getElementById('overdueFilter'),
  status: document.getElementById('statusFilter'),
  list: document.getElementById('ticketList'),
  resultCount: document.getElementById('resultCount'),
  prevPage: document.getElementById('prevPage'),
  nextPage: document.getElementById('nextPage'),
  pageInfo: document.getElementById('pageInfo'),
  newTicketBtn: document.getElementById('newTicketBtn'),
  modalBackdrop: document.getElementById('modalBackdrop'),
  modalTitle: document.getElementById('modalTitle'),
  form: document.getElementById('ticketForm'),
  cancelModal: document.getElementById('cancelModal'),
  fCustomer: document.getElementById('f_customerName'),
  fSubject: document.getElementById('f_subject'),
  fDescription: document.getElementById('f_description'),
  fPriority: document.getElementById('f_priority'),
  fAssignedTo: document.getElementById('f_assignedTo'),
};

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

async function loadAgents() {
  const agents = await fetch('/api/agents').then((r) => r.json());
  for (const select of [els.assignee, els.fAssignedTo]) {
    agents.forEach((a) => {
      const opt = document.createElement('option');
      opt.value = a;
      opt.textContent = a;
      select.appendChild(opt);
    });
  }
}

function formatDue(ticket) {
  const due = new Date(ticket.dueAt);
  const diffMs = due.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const hours = Math.floor(abs / 3600000);
  const mins = Math.floor((abs % 3600000) / 60000);
  const label = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  return ticket.overdue ? `overdue by ${label}` : `due in ${label}`;
}

function ticketRow(ticket) {
  const row = document.createElement('div');
  row.className = 'ticket-row' + (ticket.overdue ? ' overdue' : '');

  const stripe = document.createElement('div');
  stripe.className = 'stripe ' + (ticket.overdue ? 'overdue' : ticket.priority);
  row.appendChild(stripe);

  const main = document.createElement('div');
  main.className = 'ticket-main';
  main.innerHTML = `
    <div class="subject">${escapeHtml(ticket.subject)}</div>
    <div class="meta">${escapeHtml(ticket.customerName)} · opened ${timeAgo(ticket.createdAt)}</div>
  `;
  row.appendChild(main);

  const badges = document.createElement('div');
  badges.style.display = 'flex';
  badges.style.gap = '6px';
  const priorityBadge = document.createElement('span');
  priorityBadge.className = 'badge ' + ticket.priority;
  priorityBadge.textContent = ticket.priority;
  badges.appendChild(priorityBadge);
  if (ticket.overdue) {
    const overdueBadge = document.createElement('span');
    overdueBadge.className = 'badge overdue';
    overdueBadge.textContent = 'overdue';
    badges.appendChild(overdueBadge);
  }
  row.appendChild(badges);

  const assignee = document.createElement('div');
  assignee.className = 'assignee';
  assignee.textContent = ticket.assignedTo ? `→ ${ticket.assignedTo}` : 'unassigned';
  row.appendChild(assignee);

  const due = document.createElement('div');
  due.className = 'due' + (ticket.overdue ? ' overdue' : '');
  due.textContent = formatDue(ticket);
  row.appendChild(due);

  row.appendChild(rowActions(ticket));

  return row;
}

function rowActions(ticket) {
  const wrap = document.createElement('div');
  wrap.className = 'row-actions';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn';
  closeBtn.textContent = ticket.status === 'closed' ? 'Reopen' : 'Close';
  closeBtn.addEventListener('click', async () => {
    await fetch(`/api/tickets/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: ticket.status === 'closed' ? 'open' : 'closed' }),
    });
    refresh();
  });
  wrap.appendChild(closeBtn);

  return wrap;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

async function refresh() {
  const params = new URLSearchParams({
    search: state.search,
    assignedTo: state.assignedTo,
    overdueOnly: String(state.overdueOnly),
    status: state.status,
    page: String(state.page),
    pageSize: String(state.pageSize),
  });
  const data = await fetch(`/api/tickets?${params}`).then((r) => r.json());

  els.list.innerHTML = '';
  if (data.tickets.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No tickets match these filters.';
    els.list.appendChild(empty);
  } else {
    data.tickets.forEach((t) => els.list.appendChild(ticketRow(t)));
  }

  els.resultCount.textContent = `${data.total} ticket${data.total === 1 ? '' : 's'}`;
  els.pageInfo.textContent = `Page ${data.page} of ${data.totalPages}`;
  els.prevPage.disabled = data.page <= 1;
  els.nextPage.disabled = data.page >= data.totalPages;
  state.page = data.page;
}

els.search.addEventListener('input', debounce((e) => {
  state.search = e.target.value;
  state.page = 1;
  refresh();
}, 250));

els.assignee.addEventListener('change', (e) => {
  state.assignedTo = e.target.value;
  state.page = 1;
  refresh();
});

els.overdue.addEventListener('change', (e) => {
  state.overdueOnly = e.target.checked;
  state.page = 1;
  refresh();
});

els.status.addEventListener('change', (e) => {
  state.status = e.target.value;
  state.page = 1;
  refresh();
});

els.prevPage.addEventListener('click', () => {
  if (state.page > 1) { state.page -= 1; refresh(); }
});

els.nextPage.addEventListener('click', () => {
  state.page += 1;
  refresh();
});

els.newTicketBtn.addEventListener('click', () => {
  els.form.reset();
  els.modalBackdrop.classList.remove('hidden');
});

els.cancelModal.addEventListener('click', () => {
  els.modalBackdrop.classList.add('hidden');
});

els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    customerName: els.fCustomer.value.trim(),
    subject: els.fSubject.value.trim(),
    description: els.fDescription.value.trim(),
    priority: els.fPriority.value,
    assignedTo: els.fAssignedTo.value || null,
  };
  await fetch('/api/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  els.modalBackdrop.classList.add('hidden');
  state.page = 1;
  refresh();
});

loadAgents();
refresh();
setInterval(refresh, 30000); // keep overdue status / due countdowns fresh
