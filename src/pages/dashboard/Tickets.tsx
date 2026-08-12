import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store';
import { useShallow } from 'zustand/react/shallow';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import SLACountdown from '../../components/ui/SLACountdown';
import TicketWizard from '../../components/ui/TicketWizard';
import PageHeader from '../../components/ui/PageHeader';
import { Plus, Search, AlertCircle, Filter, FileText, FileSpreadsheet, Ticket as TicketIcon } from 'lucide-react';
import type { Ticket } from '../../types';
import { cleanTicketTitle } from '../../utils/ticketTitle';

function exportCSV(tickets: Ticket[]) {
  const headers = ['ID', 'Title', 'Category', 'Priority', 'Status', 'Created By', 'Assigned To', 'Created At', 'Updated At', 'SLA Deadline'];
  const rows = tickets.map(t => [
    t.id, `"${t.title.replace(/"/g, '""')}"`, t.category, t.priority, t.status,
    t.createdByName, t.assignedTo || '', t.createdAt, t.updatedAt, t.slaDeadline || '',
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `ticksera-tickets-${new Date().toISOString().split('T')[0]}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(tickets: Ticket[]) {
  const rows = tickets.map(t => `
    <tr>
      <td>${t.id.toUpperCase()}</td>
      <td>${t.title}</td>
      <td>${t.priority}</td>
      <td>${t.status.replace(/_/g, ' ')}</td>
      <td>${t.createdByName}</td>
      <td>${new Date(t.createdAt).toLocaleDateString()}</td>
      <td>${t.slaDeadline ? new Date(t.slaDeadline).toLocaleDateString() : '-'}</td>
    </tr>`).join('');
  const html = `<!DOCTYPE html><html><head><title>TICKSERA Tickets</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; color: #1e293b; }
      h1 { color: #10b981; font-size: 20px; margin-bottom: 4px; }
      p { color: #64748b; font-size: 10px; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; }
      th { background: #f1f5f9; text-align: left; padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; border-bottom: 2px solid #e2e8f0; }
      td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
      tr:nth-child(even) td { background: #fafafa; }
    </style></head><body>
    <h1>TICKSERA: Ticket Report</h1>
    <p>Generated ${new Date().toLocaleString()} · ${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}</p>
    <table><thead><tr><th>ID</th><th>Title</th><th>Priority</th><th>Status</th><th>Created By</th><th>Date</th><th>SLA</th></tr></thead>
    <tbody>${rows}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (w) { w.onload = () => { w.print(); URL.revokeObjectURL(url); }; }
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple'> = {
  open: 'info', pending: 'warning', assigned: 'purple', in_progress: 'info',
  waiting_customer: 'warning', escalated: 'danger', resolved: 'success', closed: 'default',
};
const priorityVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  low: 'default', medium: 'warning', high: 'danger', critical: 'danger',
};
const priorityDot: Record<string, string> = {
  low: 'bg-gray-400', medium: 'bg-amber-400', high: 'bg-orange-500', critical: 'bg-red-500',
};

export default function Tickets() {
  const { currentUser, tickets, users } = useStore(
    useShallow(s => ({ currentUser: s.currentUser, tickets: s.tickets, users: s.users }))
  );
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [wizardOpen, setWizardOpen] = useState(false);

  const role = currentUser?.role;
  const visibleTickets = role === 'customer'
    ? tickets.filter(t => t.createdBy === currentUser?.id)
    : (role === 'technician' || role === 'field_technician')
      ? tickets.filter(t => t.assignedTo === currentUser?.id || t.status === 'open')
      : tickets;

  const filtered = visibleTickets.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getAssigneeName = (id?: string) => {
    if (!id) return null;
    return users.find(u => u.id === id)?.name || null;
  };

  const isSLABreached = (t: typeof filtered[0]) =>
    t.slaDeadline &&
    new Date(t.slaDeadline) < new Date() &&
    t.status !== 'resolved' &&
    t.status !== 'closed';

  return (
    <>
    <div className="space-y-6 animate-fade-in premium-surface rounded-2xl p-1">
      <PageHeader
        eyebrow="Support Queue"
        title="All Tickets"
        subtitle={`${filtered.length} of ${visibleTickets.length} ticket${visibleTickets.length !== 1 ? 's' : ''} shown · Track, filter and export your support requests.`}
        actions={(
          <div className="flex items-center gap-2 flex-wrap">
            {filtered.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)}>
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportPDF(filtered)}>
                  <FileText className="w-3.5 h-3.5" /> Export PDF
                </Button>
              </>
            )}
            {role === 'customer' && (
              <Button onClick={() => setWizardOpen(true)}><Plus className="w-4 h-4" /> Get IT Help</Button>
            )}
          </div>
        )}
      />

      {/* Mini stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Open', value: visibleTickets.filter(t => t.status === 'open').length, grad: 'from-sky-500 to-blue-600' },
          { label: 'In Progress', value: visibleTickets.filter(t => ['in_progress', 'assigned'].includes(t.status)).length, grad: 'from-violet-500 to-purple-600' },
          { label: 'Resolved', value: visibleTickets.filter(t => t.status === 'resolved').length, grad: 'from-emerald-500 to-teal-600' },
          { label: 'Escalated', value: visibleTickets.filter(t => t.status === 'escalated').length, grad: 'from-rose-500 to-red-600' },
        ].map(s => (
          <div key={s.label} className="card-premium flex items-center gap-3 rounded-2xl border border-slate-200/80 dark:border-dark-border bg-white dark:bg-dark-card px-4 py-3">
            <div className={`chip-icon w-9 h-9 rounded-xl bg-gradient-to-br ${s.grad}`}>
              <TicketIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-lg font-bold font-heading text-slate-900 dark:text-white leading-none">{s.value}</p>
              <p className="text-[11px] font-medium text-slate-400 mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4 card-premium">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title or ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder-gray-400"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0 hidden sm:block" />
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="sm:min-w-[150px]"
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'open', label: 'Open' },
                { value: 'pending', label: 'Pending' },
                { value: 'assigned', label: 'Assigned' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'waiting_customer', label: 'Waiting' },
                { value: 'escalated', label: 'Escalated' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'closed', label: 'Closed' },
              ]}
            />
            <Select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="sm:min-w-[150px]"
              options={[
                { value: 'all', label: 'All Priority' },
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'critical', label: 'Critical' },
              ]}
            />
          </div>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-16 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-heading font-semibold text-gray-900 dark:text-white">No tickets found</h3>
          <p className="text-sm text-gray-500 mt-1">
            {search || statusFilter !== 'all' || priorityFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'No tickets yet. Create your first one!'}
          </p>
          {!search && statusFilter === 'all' && priorityFilter === 'all' && role === 'customer' && (
            <button onClick={() => setWizardOpen(true)} className="mt-4">
              <Button size="sm"><Plus className="w-4 h-4" /> Get IT Help</Button>
            </button>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => {
            const assigneeName = getAssigneeName(t.assignedTo);
            const breached     = isSLABreached(t);
            return (
              <Link to={`/tickets/${t.id}`} key={t.id}>
                <Card className={`card-premium p-4 sm:p-5 transition-all group ${
                  breached
                    ? 'border-red-200 dark:border-red-900/40 hover:border-red-300 dark:hover:border-red-800'
                    : 'hover:border-emerald-200 dark:hover:border-emerald-800/60'
                }`}>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">

                    {/* Left: title + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[t.priority]}`} />
                        <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-sm truncate">
                          {cleanTicketTitle(t.title)}
                        </h3>
                      </div>

                      {/* Meta row */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {/* Ticket ID chip */}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono text-[10px] font-semibold tracking-wide border border-slate-200 dark:border-slate-700 flex-shrink-0">
                          #{t.id.toUpperCase()}
                        </span>

                        <span className="text-gray-300 dark:text-gray-700">·</span>
                        <span className="text-xs text-gray-400">{t.createdByName}</span>

                        {assigneeName && (
                          <>
                            <span className="text-gray-300 dark:text-gray-700">·</span>
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">→ {assigneeName}</span>
                          </>
                        )}

                        <span className="text-gray-300 dark:text-gray-700">·</span>
                        <span className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Right: SLA + badges */}
                    <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                      <SLACountdown
                        deadline={t.slaDeadline}
                        status={t.status}
                        priority={t.priority}
                      />
                      <Badge variant={priorityVariant[t.priority]}>{t.priority}</Badge>
                      <Badge variant={statusVariant[t.status]}>{t.status.replace(/_/g, ' ')}</Badge>
                    </div>

                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>

    <TicketWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </>
  );
}
