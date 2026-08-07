import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store';
import { UserPlus, Zap, Shield, Users, CheckCircle, Eye, EyeOff, Building2, User, Sparkles } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Logo from '../components/ui/Logo';
import ShaderBackground from '../components/ui/ShaderBackground';

type AccountType = 'personal' | 'business';

const accountOptions: { id: AccountType; icon: typeof User; title: string; desc: string; plans: string; grad: string }[] = [
  {
    id: 'personal',
    icon: User,
    title: 'Personal',
    desc: 'Individuals with everyday tech problems',
    plans: 'Basic · Professional',
    grad: 'from-emerald-500 to-teal-600',
  },
  {
    id: 'business',
    icon: Building2,
    title: 'Business / Organization',
    desc: 'Companies subscribing on behalf of their employees',
    plans: 'Business · Enterprise',
    grad: 'from-blue-500 to-indigo-600',
  },
];

export default function Signup() {
  const [accountType, setAccountType] = useState<AccountType>('personal');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', orgName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signup } = useStore();
  const navigate = useNavigate();
  const isBusiness = accountType === 'business';
  const activeDef = accountOptions.find(o => o.id === accountType)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isBusiness && !form.orgName.trim()) {
      setError('Organization name is required.');
      return;
    }
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError('Please fill in all fields.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const result = await signup(
      form.name.trim(),
      form.email.trim().toLowerCase(),
      form.password,
      isBusiness ? form.orgName.trim() : undefined
    );
    if (result.ok && result.needsEmailConfirm) {
      setRegistered(true);
      setLoading(false);
    } else if (result.ok) {
      navigate('/billing');
    } else {
      setError(result.error ?? 'Sign-up failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-dark-bg">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[42%] bg-slate-900 flex-col justify-between p-10 relative overflow-hidden flex-shrink-0">
        <ShaderBackground />

        <Link to="/" className="flex items-center gap-3 relative z-10">
          <Logo size={36} />
          <span className="font-heading text-xl font-bold text-white tracking-tight">FIXORA</span>
        </Link>

        <div className="relative z-10 space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-6">
              <Zap className="w-3.5 h-3.5" /> Create your account
            </div>
            <h2 className="font-heading text-4xl font-bold text-white leading-tight mb-4">
              IT Support<br />
              <span className="text-emerald-400">For You & Your Business</span>
            </h2>
            <p className="text-slate-400 leading-relaxed">
              Submit tickets, book technicians, and track resolutions, all in one place. Start free, no credit card needed.
            </p>
          </div>

          <div className="space-y-3.5">
            {[
              { icon: Zap,    text: 'Plans from ₦5,000/month, upgrade anytime' },
              { icon: Shield, text: 'SOC 2 compliant & end-to-end encrypted' },
              { icon: Users,  text: 'Trusted by 500+ businesses across Africa' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-slate-400 text-sm">{f.text}</span>
              </div>
            ))}
          </div>

          {/* Who can sign up */}
          <div className="p-4 bg-slate-800/70 rounded-2xl border border-slate-700/60">
            <p className="text-xs font-semibold text-slate-300 mb-3">Who can sign up?</p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-3 h-3 text-emerald-400" />
                </div>
                <p className="text-xs text-slate-400 leading-snug">
                  <strong className="text-slate-200">Personal</strong>: individuals who register independently · Basic / Professional
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-3 h-3 text-blue-400" />
                </div>
                <p className="text-xs text-slate-400 leading-snug">
                  <strong className="text-slate-200">Business / Organizations</strong>: companies subscribing for employees · Business / Enterprise
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-slate-500 text-xs relative z-10">© {new Date().getFullYear()} FIXORA. All rights reserved.</p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10 overflow-y-auto premium-surface">
        <div className="w-full max-w-[440px]">

          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <Logo size={36} />
            <span className="font-heading text-2xl font-bold text-slate-900 dark:text-white">FIXORA</span>
          </div>

          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3 h-3" /> {activeDef.plans}
            </div>
            <h1 className="font-heading text-3xl font-bold text-slate-900 dark:text-white">Create your account</h1>
            <p className="mt-1.5 text-slate-500 dark:text-slate-400">Pick how you'll use FIXORA, start free, upgrade anytime</p>
          </div>

          {/* Account type selector */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {accountOptions.map(opt => {
              const active = accountType === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => { setAccountType(opt.id); setError(''); }}
                  className={`relative flex flex-col items-start gap-2.5 rounded-2xl border-2 p-3.5 text-left transition-all ${
                    active
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-900/10 shadow-md shadow-emerald-500/10'
                      : 'border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className={`chip-icon w-8 h-8 rounded-xl ${active ? `bg-gradient-to-br ${opt.grad} shadow-md shadow-emerald-500/20` : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <opt.icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${active ? 'text-emerald-900 dark:text-emerald-300' : 'text-slate-900 dark:text-white'}`}>{opt.title}</p>
                    <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{opt.desc}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${active ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                    <CheckCircle className="w-2.5 h-2.5" /> {opt.plans}
                  </span>
                  {active && (
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-dark-card" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Model note */}
          <div className={`flex items-start gap-2.5 p-3.5 rounded-xl border mb-6 ${isBusiness ? 'bg-blue-50 dark:bg-blue-900/15 border-blue-200 dark:border-blue-800/50' : 'bg-emerald-50 dark:bg-emerald-900/15 border-emerald-200 dark:border-emerald-800/50'}`}>
            {isBusiness
              ? <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              : <User className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />}
            <p className={`text-xs leading-relaxed ${isBusiness ? 'text-blue-700 dark:text-blue-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {isBusiness ? (
                <>Registering on behalf of a company. After signup, choose a <strong>Business</strong> or <strong>Enterprise</strong> plan to add team members and manage your organization's capacity.</>
              ) : (
                <>Registering on your own. After signup, choose a <strong>Basic</strong> or <strong>Professional</strong> plan to get started.</>
              )}
            </p>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm p-6 mb-6">
            {registered ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">Check your inbox</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 mb-6 leading-relaxed">
                  We've sent a confirmation link to{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{form.email.trim().toLowerCase()}</span>.
                  Click the link to activate your account, then sign in.
                </p>
                <Link to="/login">
                  <Button className="w-full" size="md">
                    <span className="flex items-center justify-center gap-2">Go to Sign In <CheckCircle className="w-4 h-4" /></span>
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
              {isBusiness && (
                <Input
                  label="Organization Name"
                  placeholder="e.g. Acme Industries"
                  value={form.orgName}
                  onChange={e => { setForm(f => ({ ...f, orgName: e.target.value })); setError(''); }}
                  required
                />
              )}
              <Input
                label={isBusiness ? 'Your Full Name' : 'Full Name'}
                placeholder={isBusiness ? 'Jane Smith' : 'Jane Doe'}
                value={form.name}
                onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setError(''); }}
                required
              />
              <Input
                label={isBusiness ? 'Business Email' : 'Email Address'}
                type="email"
                placeholder={isBusiness ? 'you@company.com' : 'you@example.com'}
                value={form.email}
                onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setError(''); }}
                required
              />
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setError(''); }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors"
                  style={{ top: '2.6rem' }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Input
                label="Confirm Password"
                type="password"
                placeholder="Repeat password"
                value={form.confirm}
                onChange={e => { setForm(f => ({ ...f, confirm: e.target.value })); setError(''); }}
                error={error}
                required
              />
              <Button type="submit" className="w-full" size="md" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <UserPlus className="w-4 h-4" /> Create {isBusiness ? 'Business' : 'Personal'} Account
                  </span>
                )}
              </Button>
              </form>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Link to="/login" className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              ← Already have an account? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Sign in</span>
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              No credit card
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
