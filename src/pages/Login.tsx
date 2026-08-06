import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store';
import { isSupabaseConfigured, getSupabase } from '../lib/supabase';
import { Lock, ArrowRight, Shield, Zap, Users, Eye, EyeOff, Check, Mail, KeyRound, ArrowLeft, ShieldCheck } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Logo from '../components/ui/Logo';
import ShaderBackground from '../components/ui/ShaderBackground';
import { hasActivePlan, hasActivePlanFor } from '../utils/plans';

const STAFF_ROLES = ['super_admin', 'support_manager', 'technician', 'field_technician'];

type AuthMode = 'signin' | 'forgot' | 'reset' | 'done' | 'mfa';

export default function Login() {
  const [email, setEmail]       = useState(() => localStorage.getItem('fixora_remember_email') ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(!!localStorage.getItem('fixora_remember_email'));
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const [mode, setMode]                 = useState<AuthMode>('signin');
  const [resetEmail, setResetEmail]     = useState('');
  const [newPassword, setNewPassword]   = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetViaEmail, setResetViaEmail] = useState(false);
  const [mfaCode, setMfaCode]           = useState('');

  const { login, verifyMfa, resetPassword, completePasswordReset, recoveryMode } = useStore();
  const navigate = useNavigate();
  const supabaseLive = isSupabaseConfigured();

  useEffect(() => {
    if (recoveryMode) {
      setMode('reset');
      setError('');
    }
  }, [recoveryMode]);

  const getDestination = (userId: string, role: string) => {
    if (STAFF_ROLES.includes(role)) return '/dashboard';
    const { payments, users } = useStore.getState();
    const user = users.find(u => u.id === userId);
    // Company member — check if org owner has active Enterprise plan
    if (user?.orgOwnerEmail) {
      const owner = users.find(u => u.email === user.orgOwnerEmail);
      const ownerHasEnterprise = owner
        ? hasActivePlanFor(payments, owner.id, ['Enterprise'])
        : false;
      return ownerHasEnterprise ? '/dashboard' : '/billing';
    }
    // Regular customer — needs their own active plan
    return hasActivePlan(payments, userId) ? '/dashboard' : '/billing';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (supabaseLive) {
      const res = await login(email.trim().toLowerCase(), password);
      if (res.ok) {
        const { currentUser } = useStore.getState();
        if (remember) localStorage.setItem('fixora_remember_email', email.trim().toLowerCase());
        else localStorage.removeItem('fixora_remember_email');
        navigate(currentUser ? getDestination(currentUser.id, currentUser.role) : '/dashboard');
      } else if (res.mfaRequired) {
        setMode('mfa');
        setError('');
        setLoading(false);
      } else {
        setError('Invalid email or password.');
        setLoading(false);
      }
      return;
    }

    const { users } = useStore.getState();
    const normalized = email.trim().toLowerCase();
    const user = users.find(u => u.email === normalized);
    const ok = await login(normalized, password);
    if (ok.ok && user) {
      if (remember) localStorage.setItem('fixora_remember_email', normalized);
      else localStorage.removeItem('fixora_remember_email');
      navigate(getDestination(user.id, user.role));
    } else if (!user) {
      setError('No account found with that email address.');
      setLoading(false);
    } else {
      setError('Incorrect password. Please try again.');
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalized = email.trim().toLowerCase();

    if (supabaseLive) {
      setLoading(true);
      try {
        await getSupabase().auth.resetPasswordForEmail(normalized, {
          redirectTo: `${window.location.origin}/login`,
        });
        setResetEmail(normalized);
        setResetViaEmail(true);
        setMode('done');
      } catch {
        setError('We could not send a reset link. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    const { users } = useStore.getState();
    if (!users.some(u => u.email === normalized)) {
      setError('No account found with that email address.');
      return;
    }
    setResetEmail(normalized);
    setNewPassword('');
    setConfirmPassword('');
    setMode('reset');
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (supabaseLive) {
      setLoading(true);
      const ok = await completePasswordReset(newPassword);
      setLoading(false);
      if (ok) {
        setResetViaEmail(false);
        setMode('done');
      } else {
        setError('Something went wrong. Please try again.');
      }
      return;
    }
    if (resetPassword(resetEmail, newPassword)) {
      setResetViaEmail(false);
      setMode('done');
    } else {
      setError('Something went wrong. Please try again.');
    }
  };

  const handleMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mfaCode.trim().length < 6) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setLoading(true);
    const ok = await verifyMfa(mfaCode);
    setLoading(false);
    if (ok) {
      const { currentUser } = useStore.getState();
      navigate(currentUser ? getDestination(currentUser.id, currentUser.role) : '/dashboard');
    } else {
      setError('That code did not verify. Try again.');
    }
  };

  const backToSignIn = () => {
    setMode('signin');
    setError('');
    setResetViaEmail(false);
    if (resetEmail) setEmail(resetEmail);
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMfaCode('');
  };

  const isResetMode = mode !== 'signin';

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
              <Zap className="w-3.5 h-3.5" /> Enterprise Grade
            </div>
            <h2 className="font-heading text-4xl font-bold text-white leading-tight mb-4">
              IT Support<br />
              <span className="text-emerald-400">Made Simple</span>
            </h2>
            <p className="text-slate-400 leading-relaxed">
              Real-time ticket management, live technician chat, and smart SLA tracking — all in one place.
            </p>
          </div>

          <div className="space-y-3.5">
            {[
              { icon: Zap,    text: 'Under 15 min avg. response time' },
              { icon: Shield, text: 'SOC 2 compliant & end-to-end encrypted' },
              { icon: Users,  text: '15,000+ tickets resolved every month' },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-slate-400 text-sm">{f.text}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
            <div className="flex -space-x-2">
              {['O', 'A', 'C', 'N'].map((l, i) => (
                <div key={i} className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-slate-900">
                  {l}
                </div>
              ))}
            </div>
            <div>
              <p className="text-white text-sm font-semibold">500+ enterprises trust us</p>
              <div className="flex items-center gap-1 mt-0.5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
                ))}
                <span className="text-slate-500 text-xs ml-1">4.9/5 rating</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-slate-500 text-xs relative z-10">© {new Date().getFullYear()} FIXORA. All rights reserved.</p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10 overflow-y-auto premium-surface">
        <div className="w-full max-w-[400px]">

          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <Logo size={36} />
            <span className="font-heading text-2xl font-bold text-slate-900 dark:text-white">FIXORA</span>
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-3">
              {isResetMode ? <KeyRound className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
              {isResetMode ? 'Account recovery' : 'Secure workspace'}
            </div>
            <h1 className="font-heading text-3xl font-bold text-slate-900 dark:text-white">
              {isResetMode ? 'Reset your password' : 'Welcome back'}
            </h1>
            <p className="mt-1.5 text-slate-500 dark:text-slate-400">
              {isResetMode ? "We'll get you back in, fast." : 'Sign in to access your FIXORA workspace'}
            </p>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm p-6 mb-5">

            {mode === 'signin' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  required
                />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      error={error}
                      required
                      className="pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={e => setRemember(e.target.checked)}
                      className="sr-only"
                    />
                    <span className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                      remember
                        ? 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-500/30'
                        : 'border-slate-300 dark:border-slate-600 group-hover:border-emerald-400'
                    }`}>
                      {remember && <Check className="w-3 h-3 text-white" />}
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">Keep me signed in</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(''); }}
                    className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button type="submit" className="w-full" size="md" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Sign In <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 flex-shrink-0">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white leading-tight">Find your account</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enter the email linked to your account and we'll guide you through the reset.</p>
                  </div>
                </div>
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  error={error}
                  autoFocus
                  required
                />
                <Button type="submit" className="w-full" size="md">
                  <span className="flex items-center justify-center gap-2">Continue <ArrowRight className="w-4 h-4" /></span>
                </Button>
                <button
                  type="button"
                  onClick={backToSignIn}
                  className="w-full flex items-center justify-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                </button>
              </form>
            )}

            {mode === 'reset' && (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
                    <KeyRound className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white leading-tight">Set a new password</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Create a strong password for <span className="font-semibold text-slate-700 dark:text-slate-300">{resetEmail || 'your account'}</span>.
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">New password</label>
                  <div className="relative">
                    <Input
                      type={showResetPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setError(''); }}
                      error={error}
                      autoFocus
                      required
                      className="pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(v => !v)}
                      aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Confirm new password</label>
                  <Input
                    type={showResetPassword ? 'text' : 'password'}
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" size="md">
                  <span className="flex items-center justify-center gap-2">Reset Password <ArrowRight className="w-4 h-4" /></span>
                </Button>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="w-full flex items-center justify-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
              </form>
            )}

            {mode === 'mfa' && (
              <form onSubmit={handleMfa} className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25 flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white leading-tight">Two-factor authentication</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enter the 6-digit code from your authenticator app to complete sign in.</p>
                  </div>
                </div>
                <Input
                  label="Verification code"
                  placeholder="000000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={mfaCode}
                  onChange={e => { setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                  error={error}
                  autoFocus
                  required
                />
                <Button type="submit" className="w-full" size="md" disabled={loading}>
                  <span className="flex items-center justify-center gap-2">Verify & Sign In <ArrowRight className="w-4 h-4" /></span>
                </Button>
                <button
                  type="button"
                  onClick={backToSignIn}
                  className="w-full flex items-center justify-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                </button>
              </form>
            )}

            {mode === 'done' && (
              <div className="text-center py-2">
                <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
                  {resetViaEmail ? 'Check your inbox' : 'Password reset successful'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 mb-6 leading-relaxed">
                  {resetViaEmail
                    ? <>We've sent a password reset link to <span className="font-semibold text-slate-700 dark:text-slate-300">{resetEmail}</span>. Follow the link in the email to choose a new password.</>
                    : 'Your password has been updated. Sign in with your new password.'}
                </p>
                <Button className="w-full" size="md" onClick={backToSignIn}>
                  <span className="flex items-center justify-center gap-2">Back to Sign In <ArrowRight className="w-4 h-4" /></span>
                </Button>
              </div>
            )}
          </div>

          {!isResetMode && (
            <div className="flex items-center justify-center gap-3 text-xs text-slate-400 mb-6">
              <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> SOC 2 compliant</span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
              <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> End-to-end encrypted</span>
            </div>
          )}

          {!isResetMode && !supabaseLive && (
            <p className="text-center text-xs text-slate-400 mb-5">
              Demo build — all demo accounts use password{' '}
              <code className="font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">fixora123</code>
            </p>
          )}

          <div className="flex items-center justify-between">
            <Link to="/" className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              ← Back to home
            </Link>
            {isResetMode ? (
              <button onClick={backToSignIn} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Back to sign in</span>
              </button>
            ) : (
              <Link to="/signup" className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                New here? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Create account</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
