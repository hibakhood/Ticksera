import { useState } from 'react';
import { useStore } from '../../store';
import { useShallow } from 'zustand/react/shallow';
import { Link } from 'react-router-dom';
import Badge from '../../components/ui/Badge';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import { Search, Shield, Users, Ticket, Building2, CreditCard, TrendingUp } from 'lucide-react';
import { isPaymentActive } from '../../utils/plans';

const STAFF_ROLES = ['super_admin', 'support_manager', 'technician', 'field_technician'];

const planColor: Record<string, 'default' | 'warning' | 'purple' | 'danger'> = {
  Basic: 'default',
  Professional: 'warning',
  Business: 'purple',
  Enterprise: 'danger',
};

export default function Customers() {
  const { currentUser, users, tickets, payments } = useStore(
    useShallow(s => ({ currentUser: s.currentUser, users: s.users, tickets: s.tickets, payments: s.payments }))
  );
  const [query, setQuery] = useState('');

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

  const rows = users
    .filter(u => u.role === 'customer')
    .map(c => {
      const myTickets = tickets.filter(t => t.createdBy === c.id);
      const open = myTickets.filter(t => !['resolved', 'closed'].includes(t.status)).length;
      const pmt = payments
        .filter(p => p.userId === c.id && isPaymentActive(p))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      const owner = c.orgOwnerEmail ? users.find(u => u.email === c.orgOwnerEmail) : null;
      const org = c.organization
        ?? owner?.organization
        ?? (owner ? `@${owner.email.split('@')[1]}` : null);
      return { ...c, myTickets, open, plan: pmt?.plan ?? null, org };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filtered = rows.filter(c => {
    const q = query.toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q)
      || c.email.toLowerCase().includes(q)
      || (c.org?.toLowerCase().includes(q) ?? false);
  });

  const totalCustomers  = rows.length;
  const activePlanUsers = rows.filter(c => c.plan).length;
  const businesses      = rows.filter(c => c.org).length;
  const openTotal       = rows.reduce((s, c) => s + c.open, 0);

  return (
    <div className="space-y-6 animate-fade-in premium-surface rounded-2xl p-1">
      <PageHeader
        eyebrow="Directory"
        title="Customers"
        subtitle="Every customer account, plan, and active workload in one place."
        actions={(
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder-slate-400"
            />
          </div>
        )}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Customers" value={totalCustomers} icon={Users} gradient="from-blue-500 to-indigo-600" sub="Registered accounts" />
        <StatCard label="Active Plans" value={activePlanUsers} icon={CreditCard} gradient="from-emerald-500 to-teal-600" sub="Paid subscriptions" />
        <StatCard label="Business Accounts" value={businesses} icon={Building2} gradient="from-violet-500 to-purple-600" sub="Organizations & teams" />
        <StatCard label="Open Tickets" value={openTotal} icon={Ticket} gradient="from-amber-500 to-orange-600" sub="Across all customers" />
      </div>

      <Card className="card-premium p-6 overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="chip-icon bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-slate-900 dark:text-white">
                Customer Directory
                <span className="ml-2 text-sm font-normal text-slate-400">({filtered.length})</span>
              </h3>
              <p className="text-xs text-slate-400">Searchable list of all customer accounts</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="text-left py-3 pl-6 text-xs font-semibold text-slate-400 uppercase tracking-wide">Customer</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">Email</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Plan</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">Tickets</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-sm text-slate-400">No customers found.</td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="p-[2px] rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-slate-800 dark:bg-dark-card flex items-center justify-center text-white text-xs font-bold">
                          {c.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white text-sm">{c.name}</p>
                        {c.org ? (
                          <p className="flex items-center gap-1 text-[11px] text-violet-500 dark:text-violet-400 font-medium">
                            <Building2 className="w-3 h-3" /> {c.org}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400">Individual account</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 text-xs hidden sm:table-cell">{c.email}</td>
                  <td className="py-3.5 px-4">
                    {c.plan ? (
                      <Badge variant={planColor[c.plan] ?? 'default'}>{c.plan}</Badge>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <Link to="/tickets" className="text-sm font-semibold text-slate-900 dark:text-white hover:text-emerald-500 transition-colors">
                        {c.myTickets.length}
                      </Link>
                      {c.open > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full">
                          {c.open} open
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 text-xs hidden md:table-cell">
                    {new Date(c.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {businesses > 0 && (
          <div className="flex items-center gap-2 pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" /> Business accounts are organizations subscribing on behalf of their team
          </div>
        )}
      </Card>
    </div>
  );
}
