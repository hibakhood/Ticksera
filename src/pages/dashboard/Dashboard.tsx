import { useState } from 'react';
import { useStore } from '../../store';
import { useShallow } from 'zustand/react/shallow';
import Badge from '../../components/ui/Badge';
import { Link } from 'react-router-dom';
import {
  Ticket, Clock, CheckCircle, AlertTriangle, TrendingUp, Users,
  DollarSign, ArrowUpRight, BarChart3, Activity, Plus, CalendarCheck
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import Button from '../../components/ui/Button';
import TicketWizard from '../../components/ui/TicketWizard';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import { cleanTicketTitle } from '../../utils/ticketTitle';
import { monthKey, monthLabel, lastMonthKeys, dayKey, dayLabel, lastDayKeys } from '../../utils/charts';

const statusColor: Record<string, string> = {
  open: 'info', pending: 'warning', assigned: 'purple', in_progress: 'info',
  waiting_customer: 'warning', escalated: 'danger', resolved: 'success', closed: 'default',
};
const priorityColor: Record<string, string> = {
  low: 'default', medium: 'warning', high: 'danger', critical: 'danger',
};

const gradients: Record<string, string> = {
  blue: 'from-blue-500 to-indigo-600',
  amber: 'from-amber-500 to-orange-600',
  emerald: 'from-emerald-500 to-teal-600',
  purple: 'from-violet-500 to-purple-600',
  rose: 'from-rose-500 to-red-600',
};

export default function Dashboard() {
  const { currentUser, tickets, bookings, users, payments } = useStore(
    useShallow(s => ({
      currentUser: s.currentUser, tickets: s.tickets, bookings: s.bookings,
      users: s.users, payments: s.payments,
    }))
  );
  const [wizardOpen, setWizardOpen] = useState(false);
  const role = currentUser?.role;

  const myTickets = role === 'customer'
    ? tickets.filter(t => t.createdBy === currentUser?.id)
    : (role === 'technician' || role === 'field_technician')
      ? tickets.filter(t => t.assignedTo === currentUser?.id)
      : tickets;

  const recentTickets   = [...myTickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);

  const openCount       = myTickets.filter(t => t.status === 'open').length;
  const inProgressCount = myTickets.filter(t => ['in_progress', 'assigned'].includes(t.status)).length;
  const resolvedCount   = myTickets.filter(t => t.status === 'resolved').length;
  const escalatedCount  = myTickets.filter(t => t.status === 'escalated').length;

  const chartData = (() => {
    const keys = lastDayKeys(7);
    const created = new Map(keys.map(k => [k, 0]));
    const resolved = new Map(keys.map(k => [k, 0]));
    myTickets.forEach(t => {
      const ck = dayKey(t.createdAt);
      if (created.has(ck)) created.set(ck, (created.get(ck) ?? 0) + 1);
      if (t.status === 'resolved') {
        const rk = dayKey(t.updatedAt);
        if (resolved.has(rk)) resolved.set(rk, (resolved.get(rk) ?? 0) + 1);
      }
    });
    return keys.map(k => ({
      name: dayLabel(k),
      tickets: created.get(k) ?? 0,
      resolved: resolved.get(k) ?? 0,
    }));
  })();

  const pieData = [
    { name: 'Open',        value: openCount,       color: '#3B82F6' },
    { name: 'In Progress', value: inProgressCount, color: '#8B5CF6' },
    { name: 'Resolved',    value: resolvedCount,   color: '#10B981' },
    { name: 'Escalated',   value: escalatedCount,  color: '#EF4444' },
  ];

  const revenueData = (() => {
    const keys = lastMonthKeys(6);
    const byKey = new Map(keys.map(k => [k, 0]));
    payments
      .filter(p => p.status === 'completed')
      .forEach(p => {
        const k = monthKey(p.createdAt);
        if (byKey.has(k)) byKey.set(k, (byKey.get(k) ?? 0) + p.amount);
      });
    return keys.map(k => ({ month: monthLabel(k), revenue: byKey.get(k) ?? 0 }));
  })();

  const statCards = role === 'customer' ? [
    { icon: Ticket,      label: 'My Tickets', value: myTickets.length, grad: gradients.blue,    trend: { value: `${myTickets.length} total`, up: true } },
    { icon: Clock,       label: 'Open',       value: openCount,        grad: gradients.amber,   trend: { value: 'Needs action', up: openCount === 0 } },
    { icon: CheckCircle, label: 'Resolved',   value: resolvedCount,    grad: gradients.emerald, trend: { value: 'Closed tickets', up: true } },
    { icon: CalendarCheck, label: 'Bookings', value: bookings.filter(b => b.createdBy === currentUser?.id).length, grad: gradients.purple, trend: { value: 'Sessions', up: true } },
  ] : role === 'super_admin' ? [
    { icon: Ticket,        label: 'Total Tickets', value: tickets.length, grad: gradients.blue,    trend: { value: '+8%', up: true } },
    { icon: Users,         label: 'Total Users',   value: users.length,   grad: gradients.purple,  trend: { value: '+3', up: true } },
    { icon: DollarSign,    label: 'Revenue',       value: `₦${payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0).toLocaleString()}`, grad: gradients.emerald, trend: { value: '+₦35K', up: true } },
    { icon: AlertTriangle, label: 'Escalated',     value: escalatedCount, grad: gradients.rose,   trend: { value: 'Needs review', up: escalatedCount === 0 } },
  ] : [
    { icon: Ticket,      label: 'Assigned',    value: myTickets.length,                                     grad: gradients.blue,    trend: { value: 'On your plate', up: true } },
    { icon: Clock,       label: 'Pending',     value: myTickets.filter(t => t.status === 'pending').length,  grad: gradients.amber,   trend: { value: 'Awaiting', up: true } },
    { icon: TrendingUp,  label: 'In Progress', value: inProgressCount,                                       grad: gradients.purple,  trend: { value: 'Active', up: true } },
    { icon: CheckCircle, label: 'Resolved',    value: resolvedCount,                                         grad: gradients.emerald, trend: { value: 'Completed', up: true } },
  ];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const subtitle = role === 'customer'
    ? 'Here\'s a summary of your support activity.'
    : role === 'super_admin' || role === 'support_manager'
      ? 'Here\'s your platform operations overview.'
      : 'Here\'s what\'s on your plate today.';

  return (
    <>
    <div className="space-y-6 animate-fade-in premium-surface rounded-2xl p-1">
      <PageHeader
        eyebrow="TICKSERA Workspace"
        title={`${greeting()}, ${currentUser?.name?.split(' ')[0]}`}
        subtitle={subtitle}
        actions={role === 'customer' ? (
          <Button size="md" onClick={() => setWizardOpen(true)}>
            <Plus className="w-4 h-4" /> Get IT Help
          </Button>
        ) : undefined}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <StatCard
            key={i}
            label={s.label}
            value={s.value}
            icon={s.icon}
            gradient={s.grad}
            trend={s.trend}
          />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card-premium bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="chip-icon bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md">
                <BarChart3 className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-slate-900 dark:text-white">
                  {role === 'super_admin' ? 'Revenue Overview' : 'Ticket Activity'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{role === 'super_admin' ? 'Last 6 months' : 'This week'}</p>
              </div>
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              {role === 'super_admin' ? (
                <BarChart data={revenueData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f8fafc', fontSize: '12px', padding: '8px 12px' }}
                    formatter={(v) => [`₦${Number(v).toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gTickets" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#64748b" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#64748b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gResolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.4} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f8fafc', fontSize: '12px', padding: '8px 12px' }}
                  />
                  <Area type="monotone" dataKey="tickets"  name="Tickets"  stroke="#64748b" fill="url(#gTickets)"  strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" fill="url(#gResolved)" strokeWidth={2} dot={false} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
          {role !== 'super_admin' && (
            <div className="flex items-center gap-5 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Tickets</div>
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Resolved</div>
            </div>
          )}
        </div>

        <div className="card-premium bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="chip-icon bg-gradient-to-br from-violet-500 to-purple-600 shadow-md">
              <Activity className="w-4.5 h-4.5" />
            </div>
            <h3 className="font-heading font-bold text-slate-900 dark:text-white">Status Breakdown</h3>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={64} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f8fafc', fontSize: '12px', padding: '8px 12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2.5 mt-2">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-xs text-slate-500 dark:text-slate-400">{d.name}</span>
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent tickets */}
      <div className="card-premium bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-800/30">
          <h3 className="font-heading font-bold text-slate-900 dark:text-white">Recent Tickets</h3>
          <Link to="/tickets" className="text-xs font-semibold text-emerald-500 hover:text-emerald-600 transition-colors flex items-center gap-1 p-2 -m-2 rounded-lg">
            View all <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {myTickets.length === 0 ? (
          <div className="text-center py-14">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">No tickets yet</p>
            <p className="text-xs text-slate-400 mb-5">When you submit a ticket, it'll appear here.</p>
            {role === 'customer' && (
              <Button size="sm" onClick={() => setWizardOpen(true)}>
                <Plus className="w-4 h-4" /> Create your first ticket
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wide">Title</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">Priority</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentTickets.map((t, idx) => (
                  <tr key={t.id} className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors ${idx < recentTickets.length - 1 ? 'border-b border-slate-50 dark:border-slate-800/60' : ''}`}>
                    <td className="py-3.5 px-6">
                      <Link to={`/tickets/${t.id}`} className="font-medium text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors line-clamp-1 text-sm">
                        {cleanTicketTitle(t.title)}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 hidden sm:table-cell">
                      <Badge variant={priorityColor[t.priority] as 'success' | 'warning' | 'danger' | 'info' | 'default'}>{t.priority}</Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={statusColor[t.status] as 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple'}>
                        {t.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 hidden md:table-cell text-xs text-slate-400">
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

    <TicketWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </>
  );
}
