import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '../../store';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Select } from '../../components/ui/Input';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import { cleanTicketTitle } from '../../utils/ticketTitle';
import { monthKey, monthLabel, lastMonthKeys } from '../../utils/charts';
import {
  Users, Ticket, CreditCard, MessageSquare, BarChart3, Activity, Shield,
  Calendar, TrendingUp, UserPlus, X, CheckCircle, ChevronDown, ChevronUp,
  Eye, EyeOff, Copy, Check, Monitor, MapPin, Search, Clock, Zap,
  AlertTriangle, PieChart, Sparkles, Plus, Inbox, Headset, MonitorSmartphone,
  Wifi, Printer, Cctv, Globe, Server, MonitorCheck, Package, Mail,
  Wrench, Building2, Layers, Crown, User as UserIcon, ChevronRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart as RePieChart, Pie, Cell,
} from 'recharts';
import type { User, UserRole } from '../../types';

const tabs = [
  { id: 'overview',      label: 'Reports',       icon: BarChart3 },
  { id: 'tickets',       label: 'Support Queue', icon: Ticket },
  { id: 'technicians',   label: 'Technicians',   icon: Wrench },
  { id: 'organizations', label: 'Organizations', icon: Building2 },
  { id: 'payments',      label: 'Payments',      icon: CreditCard },
  { id: 'bookings',      label: 'Bookings',      icon: Calendar },
  { id: 'messages',      label: 'Messages',      icon: MessageSquare },
  { id: 'plans',         label: 'Plans',         icon: Layers },
  { id: 'activity',      label: 'Audit Logs',    icon: Activity },
];

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple'> = {
  open: 'info', pending: 'warning', assigned: 'purple', in_progress: 'info',
  waiting_customer: 'warning', escalated: 'danger', resolved: 'success', closed: 'default',
};

const roleLabels: Record<string, string> = {
  super_admin:      'Super Admin',
  support_manager:  'Support Manager',
  technician:       'Technician',
  field_technician: 'Field Technician',
  customer:         'Customer',
};

const employeeRoleLabels: Record<string, string> = {
  super_admin:      'Super Admin',
  support_manager:  'Support Manager',
  technician:       'Technician',
  field_technician: 'Field Technician',
};

const roleColors: Record<string, 'danger' | 'purple' | 'info' | 'warning' | 'success'> = {
  super_admin:      'danger',
  support_manager:  'purple',
  technician:       'info',
  field_technician: 'warning',
  customer:         'success',
};

const categoryLabels: Record<string, string> = {
  computer_repair: 'Computer Repair',
  networking:      'Networking',
  printer:         'Printer Support',
  cctv:            'CCTV',
  internet:        'Internet',
  microsoft365:    'Microsoft 365',
  server:          'Server Support',
  website:         'Website Support',
  software:        'Software',
  remote:          'Remote Assistance',
};

const categoryIcons: Record<string, typeof MonitorSmartphone> = {
  computer_repair: MonitorSmartphone,
  networking:      Wifi,
  printer:         Printer,
  cctv:            Cctv,
  internet:        Globe,
  microsoft365:    Mail,
  server:          Server,
  website:         MonitorCheck,
  software:        Package,
  remote:          Headset,
};

const catGrads = [
  'from-emerald-500 to-teal-500',
  'from-blue-500 to-indigo-500',
  'from-violet-500 to-purple-500',
  'from-amber-500 to-orange-500',
  'from-rose-500 to-pink-500',
];

const statusConfig = [
  { key: 'open',            label: 'Open',         color: '#3B82F6' },
  { key: 'pending',         label: 'Pending',      color: '#F59E0B' },
  { key: 'assigned',        label: 'Assigned',     color: '#8B5CF6' },
  { key: 'in_progress',     label: 'In Progress',  color: '#06B6D4' },
  { key: 'waiting_customer',label: 'Waiting',      color: '#F97316' },
  { key: 'escalated',       label: 'Escalated',    color: '#EF4444' },
  { key: 'resolved',        label: 'Resolved',     color: '#10B981' },
  { key: 'closed',          label: 'Closed',       color: '#64748B' },
];

const emptyForm = { name: '', email: '', role: 'technician' as UserRole, password: '', confirmPassword: '' };

const planPrices: Record<string, number> = { Basic: 5000, Professional: 15000, Business: 50000, Enterprise: 0 };
const planNames = ['Basic', 'Professional', 'Business', 'Enterprise'];

const tooltipStyle = {
  backgroundColor: '#0F172A',
  border: '1px solid rgba(148, 163, 184, 0.15)',
  borderRadius: '12px',
  color: '#fff',
  fontSize: '12px',
  boxShadow: '0 8px 24px rgba(2, 6, 23, 0.4)',
};

const th = 'text-left py-3 px-4 text-xs font-semibold uppercase tracking-wider text-slate-400';

function searchBox(value: string, onChange: (v: string) => void, placeholder: string) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder-slate-400"
      />
    </div>
  );
}

export default function Admin() {
  const {
    currentUser, tickets, users, updateUser, deleteUser, addUser,
    payments, contactMessages, markContactRead, updateTicket, bookings, updateBooking,
    changePlan,
  } = useStore();
  const [activeTab, setActiveTab]     = useState('overview');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState(emptyForm);
  const [addError, setAddError]       = useState('');
  const [addSuccess, setAddSuccess]   = useState('');
  const [addLoading, setAddLoading]   = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [ticketQuery, setTicketQuery] = useState('');
  const [userQuery, setUserQuery]     = useState('');
  const [payQuery, setPayQuery]       = useState('');
  const [planTarget, setPlanTarget]   = useState<{ user: User; currentPlan: string | null } | null>(null);
  const [newPlan, setNewPlan]         = useState('Basic');
  const [applying, setApplying]       = useState(false);
  const [changeMsg, setChangeMsg]     = useState('');
  const [searchParams]                = useSearchParams();

  useEffect(() => {
    const urlTab = searchParams.get('tab');
    if (urlTab && tabs.some(t => t.id === urlTab)) setActiveTab(urlTab);
  }, [searchParams]);

  if (currentUser?.role !== 'super_admin' && currentUser?.role !== 'support_manager') {
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

  const revenueData = (() => {
    const keys = lastMonthKeys(6);
    const revenue = new Map(keys.map(k => [k, 0]));
    const newUsers = new Map(keys.map(k => [k, 0]));
    payments
      .filter(p => p.status === 'completed')
      .forEach(p => {
        const k = monthKey(p.createdAt);
        if (revenue.has(k)) revenue.set(k, (revenue.get(k) ?? 0) + p.amount);
      });
    users.forEach(u => {
      const k = monthKey(u.createdAt);
      if (newUsers.has(k)) newUsers.set(k, (newUsers.get(k) ?? 0) + 1);
    });
    return keys.map(k => ({ month: monthLabel(k), revenue: revenue.get(k) ?? 0, users: newUsers.get(k) ?? 0 }));
  })();

  const totalRevenue    = payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const completedCount  = payments.filter(p => p.status === 'completed').length;
  const technicians     = users.filter(u => ['technician', 'field_technician'].includes(u.role));
  const unreadMessages  = contactMessages.filter(m => !m.isRead).length;
  const openTickets     = tickets.filter(t => !['resolved', 'closed'].includes(t.status)).length;
  const overdueCount    = tickets.filter(t => t.slaDeadline && new Date(t.slaDeadline).getTime() < Date.now() && !['resolved', 'closed'].includes(t.status)).length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;

  const donutData = statusConfig
    .map(s => ({ ...s, value: tickets.filter(t => t.status === s.key).length }))
    .filter(d => d.value > 0);

  const catCounts = tickets.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topCats   = Object.entries(catCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCat    = topCats[0]?.[1] ?? 1;

  const filteredTickets = [...tickets]
    .filter(t => {
      const q = ticketQuery.toLowerCase();
      if (!q) return true;
      return t.id.toLowerCase().includes(q)
        || cleanTicketTitle(t.title).toLowerCase().includes(q)
        || t.createdByName.toLowerCase().includes(q)
        || t.priority.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const staffUsers = users.filter(u => u.role !== 'customer');
  const filteredStaff = [...staffUsers]
    .filter(u => {
      const q = userQuery.toLowerCase();
      if (!q) return true;
      return u.name.toLowerCase().includes(q)
        || u.email.toLowerCase().includes(q)
        || roleLabels[u.role].toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const orgOwnerIds = new Set<string>();
  users.filter(u => u.organization).forEach(u => orgOwnerIds.add(u.id));
  payments
    .filter(p => ['Business', 'Enterprise'].includes(p.plan) && p.status === 'completed')
    .forEach(p => orgOwnerIds.add(p.userId));

  const organizations = users
    .filter(u => orgOwnerIds.has(u.id))
    .map(owner => {
      const members = users.filter(m => m.orgOwnerEmail === owner.email);
      const activePmt = payments
        .filter(p => p.userId === owner.id && ['Business', 'Enterprise'].includes(p.plan) && p.status === 'completed')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      const plan = activePmt?.plan ?? (owner.organization ? 'Business' : '-');
      const maxSeats = plan === 'Enterprise' ? 100 : 15;
      const orgTickets = tickets.filter(t => {
        const creator = users.find(u => u.id === t.createdBy);
        return t.createdBy === owner.id || creator?.orgOwnerEmail === owner.email;
      });
      const orgBookings = bookings.filter(b => {
        const creator = users.find(u => u.id === b.createdBy);
        return b.createdBy === owner.id || creator?.orgOwnerEmail === owner.email;
      });
      return { owner, members, plan, maxSeats, orgTickets, orgBookings };
    })
    .sort((a, b) => (b.members.length + b.orgTickets.length) - (a.members.length + a.orgTickets.length));

  const planCatalog = [
    { name: 'Basic',        price: '₦5,000/mo', color: 'from-blue-500 to-indigo-600', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    { name: 'Professional', price: '₦15,000/mo', color: 'from-emerald-500 to-teal-600', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
    { name: 'Business',     price: '₦50,000/mo', color: 'from-violet-500 to-purple-600', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
    { name: 'Enterprise',   price: 'Custom',      color: 'from-slate-500 to-slate-700', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  ];
  const planSubs = (name: string) => payments.filter(p => p.plan === name && p.status === 'completed').length;

  const getActivePlan = (userId: string) =>
    payments
      .filter(p => p.userId === userId && p.status === 'completed')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.plan ?? null;

  const subscribers = users
    .filter(u => u.role === 'customer')
    .map(u => {
      const isOrg = Boolean(u.organization) || users.some(m => m.orgOwnerEmail === u.email);
      return { user: u, plan: getActivePlan(u.id), isOrg };
    })
    .sort((a, b) => new Date(b.user.createdAt).getTime() - new Date(a.user.createdAt).getTime());

  const applyPlanChange = () => {
    if (!planTarget) return;
    setApplying(true);
    setTimeout(() => {
      changePlan(planTarget.user.id, newPlan, planPrices[newPlan] ?? 0);
      setChangeMsg(`Subscription updated for ${planTarget.user.name.split(' ')[0]} → ${newPlan}`);
      setApplying(false);
      setPlanTarget(null);
      setTimeout(() => setChangeMsg(''), 4000);
    }, 600);
  };

  const filteredPayments = [...payments]
    .filter(p => {
      const q = payQuery.toLowerCase();
      if (!q) return true;
      return p.reference.toLowerCase().includes(q)
        || p.plan.toLowerCase().includes(q)
        || p.status.toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (!newEmployee.name.trim() || !newEmployee.email.trim()) {
      setAddError('Name and email are required.');
      return;
    }
    if (!newEmployee.password) {
      setAddError('A password is required for the employee to sign in.');
      return;
    }
    if (newEmployee.password.length < 8) {
      setAddError('Password must be at least 8 characters.');
      return;
    }
    if (newEmployee.password !== newEmployee.confirmPassword) {
      setAddError('Passwords do not match.');
      return;
    }
    const emailExists = users.find(u => u.email === newEmployee.email.trim().toLowerCase());
    if (emailExists) {
      setAddError('An account with that email already exists.');
      return;
    }
    setAddLoading(true);
    const savedName  = newEmployee.name.trim();
    const savedEmail = newEmployee.email.trim().toLowerCase();
    const savedPwd   = newEmployee.password;
    const savedRole  = newEmployee.role;
    setTimeout(() => {
      addUser({
        name:     savedName,
        email:    savedEmail,
        role:     savedRole,
        password: savedPwd,
      });
      setAddSuccess(`${savedName}|${savedEmail}|${savedPwd}`);
      setNewEmployee(emptyForm);
      setAddLoading(false);
    }, 600);
  };

  const handleCopyCreds = (email: string, pwd: string) => {
    navigator.clipboard.writeText(`Email: ${email}\nPassword: ${pwd}`).catch(() => {});
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2000);
  };

  const activityIcon = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes('created')) return { icon: Plus, grad: 'from-emerald-500 to-teal-500' };
    if (a.includes('assigned')) return { icon: UserPlus, grad: 'from-blue-500 to-indigo-500' };
    if (a.includes('resolved') || a.includes('closed')) return { icon: CheckCircle, grad: 'from-emerald-500 to-teal-500' };
    return { icon: Activity, grad: 'from-slate-400 to-slate-500' };
  };

  return (
    <div className="premium-surface rounded-2xl" style={{ padding: '0.25rem 0 2.5rem' }}>
      <div className="space-y-6 max-w-7xl mx-auto">

        <PageHeader
          eyebrow="Control Center"
          title="Admin Panel"
          subtitle="Platform administration and analytics"
          actions={
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              All systems operational
            </span>
          }
        />

        {/* Tab bar */}
        <div className="flex gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm overflow-x-auto lg:flex-wrap lg:overflow-visible">
          {tabs.map(t => {
            const count = t.id === 'messages' ? unreadMessages
              : t.id === 'tickets' ? tickets.length
              : t.id === 'technicians' ? staffUsers.length
              : t.id === 'organizations' ? organizations.length
              : t.id === 'payments' ? payments.length
              : t.id === 'bookings' ? bookings.length
              : 0;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                  activeTab === t.id
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
                {count > 0 && (
                  <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center leading-none ${
                    t.id === 'messages'
                      ? 'bg-red-500 text-white'
                      : activeTab === t.id
                        ? 'bg-white/25 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Users" value={users.length} icon={Users} gradient="from-blue-500 to-indigo-600" sub={`${technicians.length} technicians on staff`} />
              <StatCard label="Total Tickets" value={tickets.length} icon={Ticket} gradient="from-purple-500 to-fuchsia-600" sub={`${openTickets} open · ${overdueCount} overdue`} />
              <StatCard label="Revenue" value={`₦${totalRevenue.toLocaleString()}`} icon={CreditCard} gradient="from-emerald-500 to-teal-600" sub={`${completedCount} completed transactions`} />
              <StatCard label="Bookings" value={bookings.length} icon={Calendar} gradient="from-amber-500 to-orange-600" sub={`${pendingBookings} pending approval`} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue trend */}
              <Card className="card-premium p-6 lg:col-span-2">
                <div className="flex items-center gap-3 mb-5">
                  <div className="chip-icon bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-slate-900 dark:text-white">Revenue Trend</h3>
                    <p className="text-xs text-slate-400">Monthly revenue across completed subscriptions</p>
                  </div>
                </div>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData} barSize={30}>
                      <defs>
                        <linearGradient id="revBar" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(158 64% 52%)" />
                          <stop offset="100%" stopColor="hsl(163 94% 30%)" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} vertical={false} />
                      <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${(v / 1000)}k`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`₦${Number(v).toLocaleString()}`, 'Revenue']} cursor={{ fill: 'rgba(148, 163, 184, 0.06)' }} />
                      <Bar dataKey="revenue" fill="url(#revBar)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Ticket status donut */}
              <Card className="card-premium p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="chip-icon bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-500/20">
                    <PieChart className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-slate-900 dark:text-white">Ticket Status</h3>
                    <p className="text-xs text-slate-400">All tickets by current stage</p>
                  </div>
                </div>

                <div className="relative h-44 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        nameKey="label"
                        innerRadius={52}
                        outerRadius={72}
                        paddingAngle={3}
                        cornerRadius={6}
                        strokeWidth={0}
                      >
                        {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </RePieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="font-heading text-2xl font-bold text-slate-900 dark:text-white">{tickets.length}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tickets</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {donutData.map(d => (
                    <div key={d.key} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-slate-500 dark:text-slate-400 flex-1 truncate">{d.label}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{d.value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold">
                    <Zap className="w-3 h-3" /> {openTickets} open
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${overdueCount > 0 ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                    <AlertTriangle className="w-3 h-3" /> {overdueCount} overdue
                  </span>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* User growth */}
              <Card className="card-premium p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="chip-icon bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-slate-900 dark:text-white">User Growth</h3>
                    <p className="text-xs text-slate-400">New users per month</p>
                  </div>
                </div>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} vertical={false} />
                      <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="users" name="Users" stroke="hsl(217 91% 60%)" strokeWidth={2.5} fill="url(#userGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Technician workload */}
              <Card className="card-premium p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="chip-icon bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/20">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-slate-900 dark:text-white">Technician Workload</h3>
                    <p className="text-xs text-slate-400">Active tickets per technician</p>
                  </div>
                </div>
                {technicians.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No technicians found.</p>
                ) : (
                  <div className="space-y-4">
                    {technicians.map(tech => {
                      const active = tickets.filter(t => t.assignedTo === tech.id && !['resolved', 'closed'].includes(t.status)).length;
                      const total  = tickets.filter(t => t.assignedTo === tech.id).length;
                      const pct    = Math.min((active / Math.max(total, 1)) * 100, 100);
                      return (
                        <div key={tech.id} className="flex items-center gap-3.5">
                          <div className="p-[2px] rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex-shrink-0">
                            <div className="w-9 h-9 rounded-full bg-slate-800 dark:bg-dark-card flex items-center justify-center text-white text-[13px] font-bold">
                              {tech.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-sm text-slate-800 dark:text-white font-medium truncate">{tech.name}</span>
                              <span className="text-xs text-slate-400 ml-2 flex-shrink-0">{active} / {total}</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${pct > 70 ? 'bg-gradient-to-r from-red-500 to-rose-500' : pct > 40 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Top requested services */}
              <Card className="card-premium p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="chip-icon bg-gradient-to-br from-rose-500 to-pink-600 shadow-md shadow-rose-500/20">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-slate-900 dark:text-white">Top Requested Services</h3>
                    <p className="text-xs text-slate-400">Most common ticket categories</p>
                  </div>
                </div>
                {topCats.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No tickets yet.</p>
                ) : (
                  <div className="space-y-4">
                    {topCats.map(([cat, count], i) => {
                      const Icon = categoryIcons[cat] ?? Package;
                      const grad = catGrads[i % catGrads.length];
                      return (
                        <div key={cat} className="flex items-center gap-3">
                          <div className={`chip-icon w-9 h-9 rounded-xl bg-gradient-to-br ${grad} shadow-md shadow-slate-900/10`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{categoryLabels[cat] ?? cat}</p>
                              <span className="text-xs text-slate-400 ml-2 flex-shrink-0">{count}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div className={`h-full rounded-full bg-gradient-to-r ${grad}`} style={{ width: `${(count / maxCat) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* ── Tickets ── */}
        {activeTab === 'tickets' && (
          <Card className="card-premium p-6">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="chip-icon bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-md shadow-purple-500/20">
                  <Ticket className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-slate-900 dark:text-white">All Tickets</h3>
                  <p className="text-xs text-slate-400">{tickets.length} total · {openTickets} open</p>
                </div>
              </div>
              {searchBox(ticketQuery, setTicketQuery, 'Search tickets...')}
            </div>
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className={`${th} pl-6`}>ID</th>
                    <th className={th}>Title</th>
                    <th className={`${th} hidden sm:table-cell`}>Created By</th>
                    <th className={th}>Status</th>
                    <th className={th}>Priority</th>
                    <th className={th}>Assign</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {filteredTickets.length === 0 ? (
                    <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">No tickets match your search.</td></tr>
                  ) : filteredTickets.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 pl-6 font-mono text-xs text-slate-400">#{t.id}</td>
                      <td className="py-3.5 px-4 text-slate-900 dark:text-white font-medium max-w-[240px] truncate">{cleanTicketTitle(t.title)}</td>
                      <td className="py-3.5 px-4 text-slate-500 hidden sm:table-cell text-xs">{t.createdByName}</td>
                      <td className="py-3.5 px-4"><Badge variant={statusVariant[t.status]}>{t.status.replace(/_/g, ' ')}</Badge></td>
                      <td className="py-3.5 px-4"><Badge variant={t.priority === 'critical' || t.priority === 'high' ? 'danger' : t.priority === 'medium' ? 'warning' : 'default'}>{t.priority}</Badge></td>
                      <td className="py-3.5 px-4 min-w-[150px]">
                        <Select
                          value={t.assignedTo || ''}
                          onChange={e => updateTicket(t.id, { assignedTo: e.target.value || undefined, status: e.target.value ? 'assigned' : 'open' })}
                          options={[{ value: '', label: 'Unassigned' }, ...technicians.map(tc => ({ value: tc.id, label: tc.name }))]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ── Technicians ── */}
        {activeTab === 'technicians' && (
          <div className="space-y-5">

            {/* Add Employee */}
            <Card className="card-premium overflow-hidden">
              <button
                onClick={() => { setShowAddForm(v => !v); setAddError(''); setAddSuccess(''); setNewEmployee(emptyForm); }}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="chip-icon bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">Add Employee Account</p>
                    <p className="text-xs text-slate-400" style={{ marginTop: '0.125rem' }}>
                      Create staff accounts for technicians, managers, and admins
                    </p>
                  </div>
                </div>
                {showAddForm
                  ? <ChevronUp className="w-4 h-4 text-slate-400" />
                  : <ChevronDown className="w-4 h-4 text-slate-400" />
                }
              </button>

              {showAddForm && (
                <div className="border-t border-slate-100 dark:border-slate-800 p-5 animate-fade-in">
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 mb-5">
                    <Shield className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Employee accounts are <strong className="text-slate-700 dark:text-slate-300">admin-provisioned only</strong>; they cannot self-register. The employee will log in at <span className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded text-[11px]">/login</span> using the email you set here.
                    </p>
                  </div>

                  {addSuccess ? (() => {
                    const [sName, sEmail, sPwd] = addSuccess.split('|');
                    return (
                      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50 to-teal-50/60 dark:from-emerald-900/20 dark:to-teal-900/10 overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-emerald-200/70 dark:border-emerald-800/60">
                          <div className="chip-icon w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25">
                            <CheckCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{sName} has been added</p>
                            <p className="text-[11px] text-emerald-700/70 dark:text-emerald-400/60">Share these login credentials securely.</p>
                          </div>
                        </div>
                        <div className="px-4 py-3.5 space-y-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-16 text-slate-500 dark:text-slate-400 font-medium flex-shrink-0">Email</span>
                            <code className="flex-1 font-mono bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border px-2.5 py-1.5 rounded-lg text-slate-800 dark:text-slate-200 text-[11px] truncate">{sEmail}</code>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-16 text-slate-500 dark:text-slate-400 font-medium flex-shrink-0">Password</span>
                            <code className="flex-1 font-mono bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border px-2.5 py-1.5 rounded-lg text-slate-800 dark:text-slate-200 text-[11px]">{sPwd}</code>
                          </div>
                          <div className="flex items-center gap-2.5 pt-1">
                            <button
                              onClick={() => handleCopyCreds(sEmail, sPwd)}
                              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors"
                            >
                              {copiedCreds ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedCreds ? 'Copied!' : 'Copy credentials'}
                            </button>
                            <span className="text-slate-300 dark:text-slate-600">·</span>
                            <button
                              onClick={() => { setAddSuccess(''); setShowAddForm(false); setCopiedCreds(false); }}
                              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })() : (
                    <form onSubmit={handleAddEmployee}>
                      <div className="grid sm:grid-cols-3 gap-4 mb-4">
                        <Input
                          label="Full Name"
                          placeholder="e.g. John Smith"
                          value={newEmployee.name}
                          onChange={e => { setNewEmployee(v => ({ ...v, name: e.target.value })); setAddError(''); }}
                          required
                        />
                        <Input
                          label="Work Email"
                          type="email"
                          placeholder="john@ticksera.com"
                          value={newEmployee.email}
                          onChange={e => { setNewEmployee(v => ({ ...v, email: e.target.value })); setAddError(''); }}
                          required
                        />
                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Role</label>
                          <div className="relative">
                            <select
                              value={newEmployee.role}
                              onChange={e => setNewEmployee(v => ({ ...v, role: e.target.value as UserRole }))}
                              style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                              className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent hover:border-emerald-400 dark:hover:border-emerald-500 cursor-pointer transition-all"
                            >
                              {Object.entries(employeeRoleLabels).map(([v, l]) => (
                                <option key={v} value={v}>{l}</option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          </div>
                          <p className="text-xs text-slate-400 mt-1">Customers self-register, not listed here</p>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4 mb-4">
                        <div className="relative">
                          <Input
                            label="Initial Password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Min. 8 characters"
                            value={newEmployee.password}
                            onChange={e => { setNewEmployee(v => ({ ...v, password: e.target.value })); setAddError(''); }}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-1 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                            style={{ top: '2.6rem' }}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <Input
                          label="Confirm Password"
                          type="password"
                          placeholder="Repeat password"
                          value={newEmployee.confirmPassword}
                          onChange={e => { setNewEmployee(v => ({ ...v, confirmPassword: e.target.value })); setAddError(''); }}
                          error={addError || undefined}
                          required
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <Button type="submit" size="sm" disabled={addLoading}>
                          {addLoading ? (
                            <span className="flex items-center gap-2">
                              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Adding…
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <UserPlus className="w-3.5 h-3.5" /> Add Employee
                            </span>
                          )}
                        </Button>
                        <button
                          type="button"
                          onClick={() => { setShowAddForm(false); setAddError(''); setNewEmployee(emptyForm); }}
                          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </Card>

            {/* User table */}
            <Card className="card-premium p-6">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="chip-icon bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-500/20">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-slate-900 dark:text-white">
                      Staff Roster
                      <span className="ml-2 text-sm font-normal text-slate-400">({staffUsers.length})</span>
                    </h3>
                    <p className="text-xs text-slate-400">Technicians, managers, and administrators</p>
                  </div>
                </div>
                {searchBox(userQuery, setUserQuery, 'Search staff...')}
              </div>

              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className={`${th} pl-6`}>User</th>
                      <th className={th}>Email</th>
                      <th className={th}>Role</th>
                      <th className={`${th} hidden sm:table-cell`}>Joined</th>
                      <th className={th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {filteredStaff.length === 0 ? (
                      <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-400">No staff match your search.</td></tr>
                    ) : filteredStaff.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="p-[2px] rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex-shrink-0">
                              <div className="w-9 h-9 rounded-full bg-slate-800 dark:bg-dark-card flex items-center justify-center text-white text-xs font-bold">
                                {u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white text-sm">{u.name}</p>
                              {u.id === currentUser?.id && (
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">You</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-xs">{u.email}</td>
                        <td className="py-3.5 px-4 min-w-[170px]">
                          {u.id === currentUser?.id ? (
                            <Badge variant={roleColors[u.role]}>{roleLabels[u.role]}</Badge>
                          ) : (
                            <Select
                              value={u.role}
                              onChange={e => updateUser(u.id, { role: e.target.value as UserRole })}
                              options={Object.entries(roleLabels).map(([v, l]) => ({ value: v, label: l }))}
                            />
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-xs hidden sm:table-cell">
                          {new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3.5 px-4">
                          {u.id !== currentUser?.id ? (
                            <Button variant="danger" size="sm" onClick={() => { if (confirm(`Delete ${u.name}?`)) deleteUser(u.id); }}>
                              Delete
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ── Organizations ── */}
        {activeTab === 'organizations' && (
          <div className="space-y-5">
            {organizations.length === 0 ? (
              <Card className="card-premium p-10">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                    <Building2 className="w-7 h-7 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No business accounts yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Organizations appear here when they sign up on a Business or Enterprise plan.</p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {organizations.map(org => {
                  const fillPct = Math.min((org.members.length / org.maxSeats) * 100, 100);
                  const openOrg = org.orgTickets.filter(t => !['resolved', 'closed'].includes(t.status)).length;
                  return (
                    <Card key={org.owner.id} className="card-premium p-5">
                      <div className="flex items-start gap-3.5">
                        <div className="chip-icon w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-500/20">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-heading font-semibold text-slate-900 dark:text-white truncate">
                              {org.owner.organization ?? org.owner.name}
                            </h3>
                            <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[11px] font-semibold">
                              <Crown className="w-3 h-3" /> {org.plan}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 break-words">
                            Owner: <span className="text-slate-600 dark:text-slate-300">{org.owner.name}</span> · {org.owner.email}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mt-5">
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-center">
                          <p className="font-heading text-lg font-bold text-slate-900 dark:text-white">{org.members.length}</p>
                          <p className="text-[11px] text-slate-400">Members</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-center">
                          <p className="font-heading text-lg font-bold text-slate-900 dark:text-white">{org.orgTickets.length}</p>
                          <p className="text-[11px] text-slate-400">Tickets</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-center">
                          <p className={`font-heading text-lg font-bold ${openOrg > 0 ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>{openOrg}</p>
                          <p className="text-[11px] text-slate-400">Open</p>
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Seat usage</span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{org.members.length} / {org.maxSeats}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${fillPct > 70 ? 'bg-gradient-to-r from-red-500 to-rose-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`} style={{ width: `${fillPct}%` }} />
                        </div>
                      </div>

                      {org.members.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-4">
                          {org.members.map(m => (
                            <span key={m.id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-600 dark:text-slate-300">
                              <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[8px] text-white font-bold">
                                {m.name.charAt(0)}
                              </span>
                              {m.name.split(' ')[0]}
                            </span>
                          ))}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Payments ── */}
        {activeTab === 'payments' && (
          <Card className="card-premium p-6">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="chip-icon bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-slate-900 dark:text-white">All Payments</h3>
                  <p className="text-xs text-slate-400">
                    Total: <span className="font-semibold text-emerald-600 dark:text-emerald-400">₦{totalRevenue.toLocaleString()}</span> · {completedCount} completed
                  </p>
                </div>
              </div>
              {searchBox(payQuery, setPayQuery, 'Search payments...')}
            </div>
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className={`${th} pl-6`}>Reference</th>
                    <th className={th}>Customer</th>
                    <th className={th}>Plan</th>
                    <th className={th}>Amount</th>
                    <th className={th}>Status</th>
                    <th className={`${th} hidden sm:table-cell`}>Method</th>
                    <th className={`${th} hidden md:table-cell`}>Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {filteredPayments.length === 0 ? (
                    <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-400">No payments match your search.</td></tr>
                  ) : filteredPayments.map(p => {
                    const payer = users.find(u => u.id === p.userId);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 pl-6 font-mono text-xs text-slate-500">{p.reference}</td>
                        <td className="py-3.5 px-4 text-xs text-slate-500">{payer?.name ?? '-'}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">{p.plan}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">₦{p.amount.toLocaleString()}</td>
                        <td className="py-3.5 px-4"><Badge variant={p.status === 'completed' ? 'success' : p.status === 'pending' ? 'warning' : 'danger'}>{p.status}</Badge></td>
                        <td className="py-3.5 px-4 text-slate-500 capitalize hidden sm:table-cell text-xs">{p.paymentMethod.replace('_', ' ')}</td>
                        <td className="py-3.5 px-4 text-slate-400 text-xs hidden md:table-cell">{new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* ── Bookings ── */}
        {activeTab === 'bookings' && (
          <Card className="card-premium p-6">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="chip-icon bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/20">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-slate-900 dark:text-white">
                    All Session Bookings
                    <span className="ml-2 text-sm font-normal text-slate-400">({bookings.length})</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Pending: <span className="font-semibold text-amber-500">{pendingBookings}</span>
                  </p>
                </div>
              </div>
            </div>
            {bookings.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No bookings yet.</p>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-sm min-w-[680px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className={`${th} pl-6`}>Service</th>
                      <th className={`${th} hidden sm:table-cell`}>Customer</th>
                      <th className={th}>Type</th>
                      <th className={th}>Date & Time</th>
                      <th className={th}>Status</th>
                      <th className={th}>Assign</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {[...bookings].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()).map(b => {
                      const customer = users.find(u => u.id === b.createdBy);
                      const bookingStatusColor: Record<string, 'success' | 'warning' | 'info' | 'default' | 'danger'> = {
                        pending: 'warning', confirmed: 'success', in_progress: 'info', completed: 'default', cancelled: 'danger',
                      };
                      return (
                        <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 pl-6">
                            <p className="font-medium text-slate-900 dark:text-white">{b.serviceType}</p>
                            {b.description && <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{b.description}</p>}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 text-xs hidden sm:table-cell">{customer?.name ?? '-'}</td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${b.sessionType === 'remote' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'}`}>
                              {b.sessionType === 'remote' ? <Monitor className="w-3 h-3" /> : <MapPin className="w-3 h-3" />} {b.sessionType}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 text-xs">
                            <p>{b.preferredDate}</p>
                            <p className="text-slate-400">{b.preferredTime}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant={bookingStatusColor[b.status] ?? 'default'}>{b.status.replace('_', ' ')}</Badge>
                          </td>
                          <td className="py-3.5 px-4 min-w-[150px]">
                            <div className="relative">
                              <select
                                value={b.assignedTechnician || ''}
                                onChange={e => updateBooking(b.id, { assignedTechnician: e.target.value || undefined, status: e.target.value ? 'confirmed' : 'pending' })}
                                style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                                className="text-xs pl-2.5 pr-7 py-1.5 rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer transition-all w-full"
                              >
                                <option value="">Unassigned</option>
                                {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* ── Messages ── */}
        {activeTab === 'messages' && (
          <Card className="card-premium p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="chip-icon bg-gradient-to-br from-rose-500 to-pink-600 shadow-md shadow-rose-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-slate-900 dark:text-white">Contact Messages</h3>
                <p className="text-xs text-slate-400">
                  {unreadMessages > 0
                    ? <span className="font-semibold text-rose-500">{unreadMessages} unread</span>
                    : 'All caught up'}
                </p>
              </div>
            </div>
            {contactMessages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <Inbox className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No contact messages yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {contactMessages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(m => (
                  <div key={m.id} className={`p-4 rounded-2xl border transition-colors ${m.isRead ? 'border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card' : 'border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 dark:from-emerald-900/10 dark:to-teal-900/5'}`}>
                    <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-[2px] rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-slate-700 dark:bg-dark-card flex items-center justify-center text-white text-xs font-bold">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 dark:text-white text-sm">{m.name}</span>
                          <span className="text-xs text-slate-500 ml-2 break-all">{m.email}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!m.isRead && (
                          <Button variant="outline" size="sm" onClick={() => markContactRead(m.id)}>
                            Mark Read
                          </Button>
                        )}
                        {!m.isRead && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{m.subject}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-0.5">{m.message}</p>
                    <p className="text-xs text-slate-400 mt-2">{new Date(m.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* ── Plans ── */}
        {activeTab === 'plans' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {planCatalog.map(p => {
                const subs = planSubs(p.name);
                return (
                  <Card key={p.name} className="card-premium p-5">
                    <div className="flex items-start gap-3.5">
                      <div className={`chip-icon w-10 h-10 rounded-xl bg-gradient-to-br ${p.color} shadow-md shadow-slate-900/10`}>
                        <Layers className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-heading font-semibold text-slate-900 dark:text-white">{p.name}</h3>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{p.price}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${p.badge}`}>
                            {subs} subscriber{subs === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${p.color}`} style={{ width: `${Math.min((subs / Math.max(planSubs('Business'), planSubs('Professional'), planSubs('Basic'), 1)) * 100, 100)}%` }} />
                    </div>
                    <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                      {p.name === 'Basic' && 'For individuals who occasionally need IT support; 5 tickets/month.'}
                      {p.name === 'Professional' && 'For professionals and power users; unlimited tickets and live chat.'}
                      {p.name === 'Business' && 'For small and medium businesses; up to 15 team members and a dedicated manager.'}
                      {p.name === 'Enterprise' && 'For large organizations; unlimited users & teams with custom workflows.'}
                    </p>
                  </Card>
                );
              })}
            </div>
            {/* Manage subscriptions */}
            <Card className="card-premium p-6">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="chip-icon bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-slate-900 dark:text-white">
                      Manage Subscriptions
                      <span className="ml-2 text-sm font-normal text-slate-400">({subscribers.length})</span>
                    </h3>
                    <p className="text-xs text-slate-400">Upgrade or downgrade any customer's plan; personal and organization accounts</p>
                  </div>
                </div>
              </div>

              {changeMsg && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-teal-50/60 dark:from-emerald-900/20 dark:to-teal-900/10 mb-5 animate-fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{changeMsg}</p>
                </div>
              )}

              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className={`${th} pl-6`}>Customer</th>
                      <th className={`${th} hidden sm:table-cell`}>Account</th>
                      <th className={th}>Current Plan</th>
                      <th className={th}>Change Plan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                    {subscribers.length === 0 ? (
                      <tr><td colSpan={4} className="py-10 text-center text-sm text-slate-400">No customers yet.</td></tr>
                    ) : subscribers.map(({ user, plan, isOrg }) => (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="p-[2px] rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex-shrink-0">
                              <div className="w-9 h-9 rounded-full bg-slate-800 dark:bg-dark-card flex items-center justify-center text-white text-xs font-bold">
                                {user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white text-sm">{user.name}</p>
                              <p className="text-[11px] text-slate-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 hidden sm:table-cell">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${isOrg ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                            {isOrg ? <Building2 className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                            {isOrg ? 'Organization' : 'Personal'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {plan ? (
                            <Badge variant={plan === 'Enterprise' ? 'danger' : plan === 'Business' ? 'purple' : plan === 'Professional' ? 'warning' : 'default'}>
                              {plan}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">No plan</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 min-w-[170px]">
                          <Select
                            value={plan ?? ''}
                            onChange={e => {
                              if (!e.target.value || e.target.value === plan) return;
                              setPlanTarget({ user, currentPlan: plan });
                              setNewPlan(e.target.value);
                            }}
                            options={[{ value: '', label: plan ?? 'No plan' }, ...planNames.map(n => ({ value: n, label: n }))]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-500" />
              Plan changes take effect immediately. The customer is notified and the update shows on their My Plan page.
            </p>
          </div>
        )}

        {/* ── Activity ── */}
        {activeTab === 'activity' && (
          <Card className="card-premium p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="chip-icon bg-gradient-to-br from-slate-500 to-slate-700 shadow-md shadow-slate-500/20">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-slate-900 dark:text-white">Audit Log</h3>
                <p className="text-xs text-slate-400">Immutable record of actions across the platform</p>
              </div>
            </div>
            {tickets.flatMap(t => t.activityLogs).length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-7 h-7 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No activity recorded.</p>
              </div>
            ) : (
              <div className="relative space-y-5">
                <div className="absolute left-[17px] top-2 bottom-2 w-px bg-slate-100 dark:bg-slate-800" />
                {tickets
                  .flatMap(t => t.activityLogs)
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .slice(0, 20)
                  .map(log => {
                    const { icon: AIcon, grad } = activityIcon(log.action);
                    return (
                      <div key={log.id} className="relative flex gap-4 pl-0">
                        <div className={`chip-icon w-9 h-9 rounded-xl bg-gradient-to-br ${grad} shadow-md shadow-slate-900/10`}>
                          <AIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <p className="text-sm text-slate-900 dark:text-white font-medium">{log.action}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{log.user} · {new Date(log.timestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ── Plan change confirm modal ── */}
      {planTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !applying && setPlanTarget(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border shadow-2xl p-6 animate-fade-in">
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="chip-icon bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-500/20">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-slate-900 dark:text-white">Change Subscription Plan</h3>
                  <p className="text-xs text-slate-400">Update this customer's billing plan</p>
                </div>
              </div>
              <button
                onClick={() => !applying && setPlanTarget(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 mb-5">
              <div className="p-[2px] rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-slate-800 dark:bg-dark-card flex items-center justify-center text-white text-xs font-bold">
                  {planTarget.user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{planTarget.user.name}</p>
                <p className="text-xs text-slate-400 truncate">{planTarget.user.email}</p>
              </div>
              {users.some(m => m.orgOwnerEmail === planTarget.user.email) && (
                <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-[11px] font-semibold">
                  <Building2 className="w-3 h-3" /> Organization
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 rounded-xl border border-slate-200 dark:border-dark-border p-3.5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Current</p>
                <p className="font-bold text-slate-900 dark:text-white">{planTarget.currentPlan ?? 'None'}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <div className="flex-1 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/10 p-3.5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500 mb-1">New</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400">{newPlan}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {newPlan === 'Enterprise' ? 'Custom pricing' : `₦${planPrices[newPlan].toLocaleString()}/mo`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 mb-5">
              <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {users.some(m => m.orgOwnerEmail === planTarget.user.email)
                  ? 'This updates the plan for the entire organization and affects member access and team seat limits.'
                  : 'The change takes effect immediately. The customer will be notified and can see the update on their My Plan page.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setPlanTarget(null)} disabled={applying}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={applyPlanChange} disabled={applying}>
                {applying ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Applying…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Confirm change
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
