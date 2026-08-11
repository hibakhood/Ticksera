import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { hasActivePlanFor } from '../../utils/plans';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import {
  Building2, Users, Crown, Lock, CheckCircle,
  Eye, EyeOff, X, UserPlus, Copy, Check,
  AlertCircle, Shield, ArrowRight, Mail,
  CalendarDays, Gauge, ShieldCheck,
} from 'lucide-react';

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function getInitialsColor(name: string) {
  const colors = [
    'bg-emerald-500', 'bg-blue-500', 'bg-purple-500',
    'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
  ];
  return colors[name.charCodeAt(0) % colors.length];
}

function MemberAvatar({ name, avatar }: { name: string; avatar?: string }) {
  return (
    <div className="p-[2px] rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex-shrink-0 shadow-sm">
      {avatar ? (
        <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover" />
      ) : (
        <div className={`w-10 h-10 rounded-full ${getInitialsColor(name)} flex items-center justify-center text-white text-[13px] font-bold`}>
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}

export default function CompanyUsers() {
  const { currentUser, payments, users, addUser, deleteUser } = useStore();
  const navigate = useNavigate();

  const [form, setForm]           = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPwd, setShowPwd]     = useState(false);
  const [error, setError]         = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [loading, setLoading]     = useState(false);
  const [copiedId, setCopiedId]   = useState('');
  const [removing, setRemoving]   = useState<string | null>(null);

  if (!currentUser) return null;

  const isCompanyMember = Boolean(currentUser.orgOwnerEmail);
  const orgOwner = isCompanyMember
    ? users.find(u => u.email === currentUser.orgOwnerEmail)
    : currentUser;

  const orgPlan = orgOwner
    ? hasActivePlanFor(payments, orgOwner.id, ['Enterprise'])
      ? 'Enterprise'
      : hasActivePlanFor(payments, orgOwner.id, ['Business'])
        ? 'Business'
        : null
    : null;

  const maxSeats = orgPlan === 'Enterprise' ? 100 : orgPlan === 'Business' ? 15 : 0;

  const orgDomain  = orgOwner?.email.split('@')[1] ?? '';
  const orgMembers = isCompanyMember
    ? users.filter(u => u.orgOwnerEmail === currentUser.orgOwnerEmail)
    : users.filter(u => u.orgOwnerEmail === currentUser.email);

  const seatsUsed = orgMembers.length;
  const seatsLeft = Math.max(maxSeats - seatsUsed, 0);
  const seatPct   = maxSeats > 0 ? Math.round((seatsUsed / maxSeats) * 100) : 0;

  const seatTone =
    seatsUsed >= maxSeats
      ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
      : seatsUsed >= maxSeats * 0.8
        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
        : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';

  const barTone =
    seatsUsed >= maxSeats
      ? 'from-rose-500 to-rose-400'
      : seatsUsed >= maxSeats * 0.8
        ? 'from-amber-500 to-amber-400'
        : 'from-emerald-500 to-teal-400';

  // ── Locked state ──────────────────────────────────────────────────────────
  if (!orgPlan) {
    return (
      <div className="premium-surface rounded-2xl" style={{ padding: '0.25rem 0 2.5rem' }}>
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <div className="max-w-lg w-full text-center">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 opacity-20 blur-2xl" />
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-500/30">
                <Lock className="w-10 h-10 text-white" />
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/25 mb-4">
              <Crown className="w-3 h-3" /> Business + Enterprise
            </div>
            <h2 className="font-heading text-2xl font-bold text-slate-900 dark:text-white mb-3">
              Team Account Management
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              Add up to <strong className="text-slate-700 dark:text-slate-200">15 team members</strong> on Business, or
              {' '}<strong className="text-slate-700 dark:text-slate-200">100 on Enterprise</strong>, who share your plan.
              Only users with your organisation's email domain are accepted; keeping access secure.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-8 text-left">
              {[
                { icon: Users,    label: '15 seats',   note: 'Business plan' },
                { icon: Building2, label: '100 seats', note: 'Enterprise plan' },
                { icon: Shield,   label: '@domain',    note: 'Locked security' },
              ].map((f, i) => (
                <div key={i} className="card-premium flex flex-col items-center gap-2.5 p-4 bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border text-center">
                  <div className="chip-icon bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
                    <f.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-white">{f.label}</p>
                    <p className="text-[10px] text-slate-400">{f.note}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={() => navigate('/plan')} size="lg" className="gap-2">
              Upgrade to Business or Enterprise <ArrowRight className="w-4 h-4" />
            </Button>
            <p className="text-xs text-slate-400 mt-3">Business ₦50,000 / month · Enterprise custom pricing</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Company member read-only view ─────────────────────────────────────────
  if (isCompanyMember) {
    return (
      <div className="premium-surface rounded-2xl" style={{ padding: '0.25rem 0 2.5rem' }}>
        <div className="space-y-6 max-w-2xl">
          <PageHeader
            eyebrow="Organisation"
            title="Your Team"
            subtitle={`You're a member of the @${orgDomain} ${orgPlan} team.`}
            actions={
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/25">
                <Crown className="w-3.5 h-3.5" /> {orgPlan} Member
              </span>
            }
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Team Size" value={orgMembers.length} icon={Users} gradient="from-emerald-500 to-teal-600" sub="Shared team seats" />
            <StatCard label="Plan" value={orgPlan ?? ''} icon={Building2} gradient="from-violet-500 to-purple-600" sub={`@${orgDomain} organisation`} />
            <StatCard label="Managed By" value={orgOwner?.name?.split(' ')[0] ?? 'Admin'} icon={Crown} gradient="from-amber-500 to-orange-600" sub="Organisation admin" />
          </div>

          <Card className="card-premium p-5">
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/60 dark:from-emerald-900/15 dark:to-teal-900/10 border border-emerald-200/70 dark:border-emerald-800/50 mb-5">
              <div className="chip-icon w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80 leading-relaxed">
                You are a member of the <strong className="text-emerald-900 dark:text-emerald-300">@{orgDomain}</strong> {orgPlan} team,
                managed by <strong className="text-emerald-900 dark:text-emerald-300">{orgOwner?.name ?? 'your organisation admin'}</strong>.
                Contact them to manage team members.
              </p>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Team Members</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">{orgMembers.length}</span>
            </div>

            {orgMembers.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No other team members yet.</p>
            ) : (
              <div className="space-y-2">
                {orgMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <MemberAvatar name={m.name} avatar={m.avatar} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate flex items-center gap-1.5">
                        {m.name}
                        {m.id === currentUser.id && (
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full">You</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{m.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // ── Subscriber management view ────────────────────────────────────────────
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedEmail = form.email.trim().toLowerCase();
    const emailDomain  = trimmedEmail.split('@')[1];

    if (!form.name.trim() || !trimmedEmail) {
      setError('Name and email are required.');
      return;
    }
    if (emailDomain !== orgDomain) {
      setError(`Email must use the @${orgDomain} domain.`);
      return;
    }
    if (!form.password) {
      setError('A password is required.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (seatsUsed >= maxSeats) {
      setError(`Seat limit reached (${maxSeats} / ${maxSeats}).`);
      return;
    }
    if (users.find(u => u.email === trimmedEmail)) {
      setError('An account with that email already exists.');
      return;
    }

    setLoading(true);
    const savedName = form.name.trim();
    const savedPwd  = form.password;
    setTimeout(() => {
      addUser({
        name:          savedName,
        email:         trimmedEmail,
        role:          'customer',
        password:      savedPwd,
        orgOwnerEmail: currentUser.email,
      });
      setAddSuccess(`${savedName}|${trimmedEmail}|${savedPwd}`);
      setForm({ name: '', email: '', password: '', confirm: '' });
      setLoading(false);
    }, 500);
  };

  const handleCopy = (email: string, pwd: string, key: string) => {
    navigator.clipboard.writeText(`Email: ${email}\nPassword: ${pwd}`).catch(() => {});
    setCopiedId(key);
    setTimeout(() => setCopiedId(''), 2000);
  };

  const handleRemove = (userId: string) => {
    setRemoving(userId);
    setTimeout(() => {
      deleteUser(userId);
      setRemoving(null);
    }, 300);
  };

  const emailDomainLive = form.email.includes('@') ? form.email.trim().split('@')[1] : null;
  const domainMismatch  = emailDomainLive !== null && emailDomainLive !== orgDomain;

  return (
    <div className="premium-surface rounded-2xl" style={{ padding: '0.25rem 0 2.5rem' }}>
      <div className="space-y-6 max-w-5xl mx-auto">

        <PageHeader
          eyebrow="Organisation"
          title="Team Members"
          subtitle={`Manage your @${orgDomain} team; up to ${maxSeats} shared seats on your ${orgPlan} plan.`}
          actions={
            <>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/25">
                <Crown className="w-3.5 h-3.5" /> {orgPlan}
              </span>
              <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border ${seatTone}`}>
                <Users className="w-3.5 h-3.5" /> {seatsUsed} / {maxSeats} seats
              </span>
            </>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Active Members" value={seatsUsed} icon={Users} gradient="from-emerald-500 to-teal-600" sub="Team seats in use" />
          <StatCard label="Team Seats" value={maxSeats} icon={Building2} gradient="from-violet-500 to-purple-600" sub={`${orgPlan} plan allowance`} />
          <StatCard label="Seats Remaining" value={seatsLeft} icon={UserPlus} gradient="from-amber-500 to-orange-600" sub="Ready to invite" />
        </div>

        {/* Seat usage */}
        <Card className="card-premium p-5">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="chip-icon bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Seat Usage</p>
                <p className="text-xs text-slate-400">{seatsUsed} of {maxSeats} seats used · {seatsLeft} remaining</p>
              </div>
            </div>
            <span className="font-heading text-2xl font-bold text-gradient">{seatPct}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${barTone} transition-all duration-500`}
              style={{ width: `${Math.min(seatPct, 100)}%` }}
            />
          </div>
        </Card>

        {/* Add form + members */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

          {/* Add member */}
          <Card className="card-premium p-6 lg:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="chip-icon bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/20">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-slate-900 dark:text-white">Add Team Member</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Invite with your @{orgDomain} email</p>
              </div>
            </div>

            {seatsUsed >= maxSeats ? (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/15 border border-rose-200 dark:border-rose-800/60">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">Seat limit reached</p>
                  <p className="text-xs text-rose-600/80 dark:text-rose-400/70 mt-0.5">Remove a member below to free up a seat.</p>
                </div>
              </div>
            ) : addSuccess ? (() => {
              const parts = addSuccess.split('|');
              const [sName, sEmail, sPwd] = parts;
              return (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-b from-emerald-50 to-teal-50/60 dark:from-emerald-900/20 dark:to-teal-900/10 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3.5 border-b border-emerald-200/70 dark:border-emerald-800/60">
                    <div className="chip-icon w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{sName} added to your team</p>
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
                        onClick={() => handleCopy(sEmail, sPwd, 'new')}
                        className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors"
                      >
                        {copiedId === 'new' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedId === 'new' ? 'Copied!' : 'Copy credentials'}
                      </button>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <button
                        onClick={() => setAddSuccess('')}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        Add another member
                      </button>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <form onSubmit={handleAdd} className="space-y-4">
                <Input
                  label="Full Name"
                  placeholder="e.g. Jane Smith"
                  value={form.name}
                  onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setError(''); }}
                  required
                />
                <div className="space-y-1">
                  <Input
                    label="Work Email"
                    type="email"
                    placeholder={`jane@${orgDomain}`}
                    value={form.email}
                    onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setError(''); }}
                    required
                  />
                  {domainMismatch && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      Must end in @{orgDomain}
                    </p>
                  )}
                  {form.email.includes('@') && !domainMismatch && emailDomainLive && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                      <CheckCircle className="w-3 h-3 flex-shrink-0" />
                      Domain matches
                    </p>
                  )}
                </div>
                <div className="relative">
                  <Input
                    label="Initial Password"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setError(''); }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    style={{ top: '2.6rem' }}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="Repeat password"
                  value={form.confirm}
                  onChange={e => { setForm(f => ({ ...f, confirm: e.target.value })); setError(''); }}
                  error={error || undefined}
                  required
                />
                <Button type="submit" className="w-full" disabled={loading || domainMismatch}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Adding…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4" /> Add to Team
                    </span>
                  )}
                </Button>
              </form>
            )}
          </Card>

          {/* Members list */}
          <Card className="card-premium p-6 lg:col-span-3">
            <div className="flex items-center gap-3 mb-5">
              <div className="chip-icon bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-500/20">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-bold text-slate-900 dark:text-white">Active Members</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{seatsUsed} of {maxSeats} seats used</p>
              </div>
              {seatsUsed > 0 && (
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${seatTone}`}>{seatsUsed}</span>
              )}
            </div>

            {orgMembers.length === 0 ? (
              <div className="text-center py-14">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No team members yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Invite your first teammate using the form; they'll sign in with the credentials you set.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {orgMembers.map(m => (
                  <div
                    key={m.id}
                    className={`group flex items-center gap-3.5 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/20 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800/40 transition-all ${removing === m.id ? 'opacity-40' : ''}`}
                  >
                    <MemberAvatar name={m.name} avatar={m.avatar} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate flex items-center gap-1.5">
                        {m.name}
                        {m.id === currentUser.id && (
                          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded-full">You</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                        <Mail className="w-3 h-3 flex-shrink-0" /> {m.email}
                      </p>
                    </div>
                    <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/20 text-[10px] font-semibold text-violet-600 dark:text-violet-400">Team Member</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemove(m.id)}
                      disabled={removing === m.id}
                      className="w-9 h-9 flex items-center justify-center rounded-xl border border-transparent hover:border-rose-200 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-all flex-shrink-0"
                      title={`Remove ${m.name}`}
                    >
                      {removing === m.id ? (
                        <span className="w-4 h-4 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
