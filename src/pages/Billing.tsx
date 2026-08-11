import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import { CheckCircle, ShieldCheck, Zap, ArrowRight, LogOut, Phone, AlertTriangle } from 'lucide-react';
import Button from '../components/ui/Button';
import Logo from '../components/ui/Logo';
import { initPaystackCheckout, verifyPaystackPayment } from '../lib/paystack';
import { hasActivePlan } from '../utils/plans';

const plans = [
  {
    name: 'Basic',
    price: 5000,
    period: '/month',
    tag: null,
    description: 'For individuals who occasionally need IT support.',
    features: [
      'Customer dashboard',
      '5 tickets/month',
      'Ticket tracking',
      'Remote assistance',
      'Basic knowledge base',
      'Limited live chat',
      'Up to 2 bookings/month',
      'Basic analytics',
    ],
    enterprise: false,
  },
  {
    name: 'Professional',
    price: 15000,
    period: '/month',
    tag: 'Most Popular',
    description: 'For professionals, freelancers, and power users.',
    features: [
      'Customer dashboard',
      'Unlimited tickets',
      'Live chat',
      'Priority support',
      'Unlimited booking sessions',
      'Full knowledge base',
      'Remote support assistance',
      'Unlimited ticket history',
    ],
    note: 'Licensed for one user only.',
    enterprise: false,
  },
  {
    name: 'Business',
    price: 50000,
    period: '/month',
    tag: null,
    description: 'For small and medium businesses.',
    features: [
      'Unlimited tickets',
      'Live chat',
      'Priority support',
      'Unlimited booking sessions',
      'Full knowledge base',
      'Remote support assistance',
      'Unlimited ticket history',
      'Up to 15 team members',
      'High-priority support',
      'Dedicated manager',
    ],
    enterprise: false,
  },
  {
    name: 'Enterprise',
    price: null,
    period: null,
    tag: null,
    description: 'For large organizations. Custom pricing, unlimited everything.',
    features: [
      'Unlimited users & teams',
      'Unlimited ticket volume',
      'Unlimited booking sessions',
      'On-site support assistance',
      'Dedicated account manager',
      '24/7 priority support',
      'Custom workflows',
    ],
    enterprise: true,
  },
];

const STAFF_ROLES = ['super_admin', 'support_manager', 'technician', 'field_technician'];

export default function Billing() {
  const { currentUser, payments, addPayment, logout } = useStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [payError, setPayError] = useState('');

  const reference = searchParams.get('reference');

  useEffect(() => {
    if (!currentUser) { navigate('/login', { replace: true }); return; }
    if (STAFF_ROLES.includes(currentUser.role)) { navigate('/dashboard', { replace: true }); return; }
    if (hasActivePlan(payments, currentUser.id)) { navigate('/dashboard', { replace: true }); }
  }, [currentUser, payments, navigate]);

  // Verify the Paystack transaction when the customer returns to /billing?reference=...
  useEffect(() => {
    if (!reference || !currentUser || success || processing) return;
    let cancelled = false;
    (async () => {
      setProcessing(true);
      setVerifying(true);
      const result = await verifyPaystackPayment(reference);
      if (cancelled) return;
      setVerifying(false);
      if (result?.ok && result.payment) {
        addPayment(result.payment);
        setSuccess(true);
        setSearchParams({}, { replace: true });
        setTimeout(() => navigate('/dashboard', { replace: true }), 2200);
      } else {
        setProcessing(false);
        setPayError(
          result?.error === 'payment_not_successful'
            ? 'The payment did not complete. You can try again below.'
            : result?.message || 'We could not verify the payment. If you were charged, contact support.'
        );
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, currentUser, success]);

  const handleActivate = async () => {
    if (!selected || !currentUser) return;
    const plan = plans.find(p => p.name === selected)!;
    if (plan.enterprise || plan.price === null) return;
    setProcessing(true);
    setPayError('');
    const result = await initPaystackCheckout(plan.name, currentUser.email, currentUser.id, '/billing');
    if (!result?.ok) {
      setProcessing(false);
      setPayError(
        result?.error === 'not_configured'
          ? 'Payments are not configured yet. The account owner needs to add the Paystack secret key.'
          : result?.message || 'Could not start checkout. Please try again.'
      );
      return;
    }
    if (result.authorization_url) {
      window.location.href = result.authorization_url;
    } else {
      setProcessing(false);
      setPayError('Could not start checkout. Please try again.');
    }
  };

  if (success || verifying) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center" style={{ padding: '2rem' }}>
          <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto" style={{ marginBottom: '1.5rem' }}>
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-slate-900 dark:text-white" style={{ marginBottom: '0.5rem' }}>
            {verifying ? 'Verifying your payment…' : 'Payment Successful!'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400" style={{ marginBottom: '1.5rem' }}>
            {verifying
              ? 'Confirming your transaction with Paystack.'
              : `Your ${selected ?? ''} plan is now active. Taking you to your dashboard…`}
          </p>
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  const selectedPlan = selected ? plans.find(p => p.name === selected) : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg">

      {/* Header */}
      <header className="bg-white dark:bg-dark-card border-b border-slate-200 dark:border-dark-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between" style={{ padding: '1rem 1.5rem' }}>
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size={32} />
            <span className="font-heading text-lg font-bold text-slate-900 dark:text-white">TICKSERA</span>
          </Link>
          <div className="flex items-center gap-4">
            {currentUser && (
              <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">
                Signed in as <span className="font-medium text-slate-900 dark:text-white">{currentUser.name}</span>
              </span>
            )}
            <button
              onClick={() => { logout(); navigate('/login', { replace: true }); }}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto" style={{ padding: '3rem 1.5rem' }}>

        {/* Hero */}
        <div className="text-center" style={{ marginBottom: '3rem' }}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-semibold" style={{ marginBottom: '1rem' }}>
            <Zap className="w-3.5 h-3.5" /> One last step
          </div>
          <h1 className="font-heading text-slate-900 dark:text-white" style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Choose your plan
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            Select a plan that fits your needs. You can upgrade or downgrade at any time from your billing settings.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" style={{ marginBottom: '2.5rem' }}>
          {plans.map(p => {
            if (p.enterprise) {
              return (
                <div
                  key={p.name}
                  className="relative text-left rounded-2xl border border-slate-700 bg-slate-900 flex flex-col"
                  style={{ padding: '1.5rem' }}
                >
                  <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(16,185,129,0.1),transparent)]" />
                  </div>
                  <h3 className="font-heading font-bold text-white relative" style={{ marginBottom: '0.25rem' }}>{p.name}</h3>
                  <p className="text-xs text-slate-400 relative" style={{ marginBottom: '1rem' }}>{p.description}</p>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <span className="font-heading text-white relative" style={{ fontSize: '1.75rem', fontWeight: 700 }}>Custom</span>
                  </div>
                  <ul className="flex-1 relative" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    {p.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" style={{ marginTop: '0.125rem' }} /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/contact" className="relative block">
                    <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-all">
                      <Phone className="w-4 h-4" /> Contact Sales
                    </button>
                  </Link>
                </div>
              );
            }

            return (
              <button
                key={p.name}
                onClick={() => setSelected(p.name)}
                className={`relative text-left rounded-2xl transition-all duration-200 flex flex-col ${
                  selected === p.name
                    ? 'border-2 border-emerald-500 shadow-xl shadow-emerald-500/15 bg-white dark:bg-dark-card'
                    : p.tag
                    ? 'border-2 border-emerald-300 dark:border-emerald-700 bg-white dark:bg-dark-card hover:border-emerald-400 hover:shadow-md'
                    : 'border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card hover:border-slate-300 hover:shadow-md'
                }`}
                style={{ padding: '1.5rem' }}
              >
                {p.tag && (
                  <div className="absolute left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full whitespace-nowrap" style={{ top: '-0.75rem' }}>
                    {p.tag}
                  </div>
                )}
                {selected === p.name && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                )}

                <h3 className="font-heading font-bold text-slate-900 dark:text-white" style={{ marginBottom: '0.25rem' }}>{p.name}</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed" style={{ marginBottom: '1rem' }}>{p.description}</p>
                <div style={{ marginBottom: '1.25rem' }}>
                  <span className="font-heading text-slate-900 dark:text-white" style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                    ₦{(p.price as number).toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400" style={{ marginLeft: '0.25rem' }}>{p.period}</span>
                </div>

                <ul className="flex-1" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" style={{ marginTop: '0.125rem' }} /> {f}
                    </li>
                  ))}
                </ul>

                {'note' in p && p.note && (
                  <p className="text-[10px] text-slate-400 italic" style={{ marginBottom: '0.75rem' }}>* {p.note as string}</p>
                )}
              </button>
            );
          })}
        </div>

        {/* Payment section */}
        {selected && selectedPlan && !selectedPlan.enterprise && (
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl animate-fade-in" style={{ padding: '2rem', maxWidth: '40rem', marginLeft: 'auto', marginRight: 'auto' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
              <div>
                <h3 className="font-heading font-bold text-slate-900 dark:text-white">
                  Pay for {selected} Plan
                </h3>
                <p className="text-sm text-slate-400" style={{ marginTop: '0.25rem' }}>
                  ₦{(selectedPlan.price as number).toLocaleString()} / month
                </p>
              </div>
              <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full text-emerald-600 dark:text-emerald-400 text-sm font-semibold border border-emerald-200 dark:border-emerald-800">
                {selected}
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 p-4" style={{ marginBottom: '1.5rem' }}>
              <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" style={{ marginTop: '0.125rem' }} />
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Payment is processed securely by <strong className="text-slate-700 dark:text-slate-200">Paystack</strong>.
                You'll be able to pay by card, bank transfer, USSD, or mobile money.
                Your plan activates automatically once the payment is verified.
              </p>
            </div>

            {payError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-3.5" style={{ marginBottom: '1.25rem' }}>
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" style={{ marginTop: '0.125rem' }} />
                <p className="text-xs text-amber-700 dark:text-amber-400">{payError}</p>
              </div>
            )}

            <Button size="lg" className="w-full" onClick={handleActivate} disabled={processing}>
              {processing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Preparing checkout…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Pay ₦{(selectedPlan.price as number).toLocaleString()}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>

            <p className="text-center text-xs text-slate-400" style={{ marginTop: '1rem' }}>
              Plans renew monthly. You can upgrade or cancel any time from your plan settings.
            </p>
          </div>
        )}

        {!selected && (
          <p className="text-center text-sm text-slate-400">
            ↑ Select a plan above to continue
          </p>
        )}

      </div>
    </div>
  );
}
