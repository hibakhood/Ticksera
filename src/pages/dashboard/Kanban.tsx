import { useState } from 'react';
import { useStore } from '../../store';
import Badge from '../../components/ui/Badge';
import { Link } from 'react-router-dom';
import { Search, Shield } from 'lucide-react';
import type { TicketStatus } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import { cleanTicketTitle } from '../../utils/ticketTitle';

const STAFF_ROLES = ['super_admin', 'support_manager', 'technician', 'field_technician'];

const columns: { status: TicketStatus; label: string; color: string }[] = [
  { status: 'open', label: 'Open', color: 'bg-blue-500' },
  { status: 'pending', label: 'Pending', color: 'bg-amber-500' },
  { status: 'assigned', label: 'Assigned', color: 'bg-purple-500' },
  { status: 'in_progress', label: 'In Progress', color: 'bg-cyan-500' },
  { status: 'waiting_customer', label: 'Waiting', color: 'bg-orange-500' },
  { status: 'escalated', label: 'Escalated', color: 'bg-red-500' },
  { status: 'resolved', label: 'Resolved', color: 'bg-emerald-500' },
  { status: 'closed', label: 'Closed', color: 'bg-gray-500' },
];

const priorityColor: Record<string, string> = {
  low: 'border-l-gray-400', medium: 'border-l-amber-400', high: 'border-l-orange-500', critical: 'border-l-red-500',
};

export default function Kanban() {
  const { currentUser, tickets, updateTicket, users } = useStore();
  const [search, setSearch] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const role = currentUser?.role;
  const isAdmin = role === 'super_admin' || role === 'support_manager';

  if (!currentUser || !STAFF_ROLES.includes(currentUser.role)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center" style={{ marginBottom: '1rem' }}>
          <Shield className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h2>
        <p className="text-gray-500" style={{ marginTop: '0.5rem' }}>You don't have permission to view this page.</p>
      </div>
    );
  }

  const visibleTickets = role === 'customer'
    ? tickets.filter(t => t.createdBy === currentUser?.id)
    : role === 'technician' || role === 'field_technician'
    ? tickets.filter(t => t.assignedTo === currentUser?.id)
    : tickets;

  const filtered = search
    ? visibleTickets.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))
    : visibleTickets;

  const getColumnTickets = (status: TicketStatus) => filtered.filter(t => t.status === status);

  const canDrop = (ticketId: string) => {
    if (isAdmin) return true;
    const ticket = tickets.find(t => t.id === ticketId);
    return ticket?.assignedTo === currentUser?.id;
  };

  const handleDrop = (e: React.DragEvent, status: TicketStatus) => {
    e.preventDefault();
    const ticketId = e.dataTransfer.getData('ticketId');
    if (ticketId && canDrop(ticketId)) {
      updateTicket(ticketId, { status });
    }
    setDraggedId(null);
  };

  return (
    <div className="space-y-6 animate-fade-in premium-surface rounded-2xl p-1">
      <PageHeader
        eyebrow="Workflow"
        title="Kanban Board"
        subtitle="Drag and drop tickets across stages to keep your workflow moving."
        actions={(
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-dark-border bg-white dark:bg-dark-card text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder-gray-400"
            />
          </div>
        )}
      />

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1552px]">
          {columns.map(col => {
            const colTickets = getColumnTickets(col.status);
            return (
              <div key={col.status} className="flex-1 min-w-[180px]"
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, col.status)}
              >
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{col.label}</h3>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-auto bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full min-w-[24px] text-center">{colTickets.length}</span>
                </div>
                <div className="space-y-2.5 min-h-[200px] bg-gray-50/80 dark:bg-dark-bg/50 rounded-2xl p-2.5 border border-dashed border-gray-200 dark:border-dark-border">
                  {colTickets.map(t => (
                    <div key={t.id}
                      draggable={canDrop(t.id) || isAdmin}
                      onDragStart={e => { e.dataTransfer.setData('ticketId', t.id); setDraggedId(t.id); }}
                      onDragEnd={() => setDraggedId(null)}
                      className={`bg-white dark:bg-dark-card rounded-xl p-3.5 border border-gray-200 dark:border-dark-border border-l-4 ${priorityColor[t.priority]} cursor-grab active:cursor-grabbing hover:shadow-md hover:shadow-gray-900/5 dark:hover:shadow-black/20 transition-all ${draggedId === t.id ? 'opacity-50 scale-95' : ''}`}
                    >
                      <Link to={`/tickets/${t.id}`}>
                        <p className="text-sm font-medium text-gray-900 dark:text-white hover:text-primary-500 transition-colors line-clamp-2">{cleanTicketTitle(t.title)}</p>
                      </Link>
                      <div className="flex items-center justify-between mt-2.5">
                        <Badge variant={t.priority === 'critical' || t.priority === 'high' ? 'danger' : t.priority === 'medium' ? 'warning' : 'default'}>{t.priority}</Badge>
                        {t.assignedTo && (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-accent-400 flex items-center justify-center text-[10px] text-white font-bold ring-2 ring-white dark:ring-dark-card"
                            title={users.find(u => u.id === t.assignedTo)?.name}>
                            {users.find(u => u.id === t.assignedTo)?.name?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
