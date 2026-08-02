import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { CheckCircle, X, CreditCard, ArrowUp, ArrowDown, Minus, Zap, RefreshCw, Calendar, Shield, Phone, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import { initPaystackCheckout, verifyPaystackPayment } from '../../lib/paystack';
import { isPaymentActive } from '../../utils/plans';

const plans = [
  {
    name: 'Basic',
    price: 5000,
    period: '/month',
    tag: null,
    color: 'blue',
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
    excluded: ['Priority support', 'Unlimited tickets', 'Team members'],
    enterprise: false,
  },
  {
    name: 'Professional',
    price: 15000,
    period: '/month',
    tag: 'Most Popular',
    color: 'emerald',
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
    excluded: ['Team members', 'Business dashboard'],
    note: 'Licensed for one user only.',
    enterprise: false,
  },
  {
    name: 'Business',
    price: 50000,
    period: '/month',
    tag: null,
    color: 'violet',
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
    excluded: [],
    enterprise: false,
  },
  {
    name: 'Enterprise',
    price: 0,
    period: 'custom',
    tag: null,
    color: 'slate',
    description: 'For large organizations and enterprises.',
    features: [
      'Unlimited users & teams',
      'Unlimited ticket volume',
      'Unlimited booking sessions',
      'On-site support assistance',
      'Dedicated account manager',
      '24/7 priority support',
      'Custom workflows',
    ],
    excluded: [],
    enterprise: true,
  },
];

const planOrder = ['Basic', 'Professional', 'Business', 'Enterprise'];

const accentClasses: Record<string, { ring: string; badge: string }> = {
  slate:   { ring: 'border-slate-400',   badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  blue:    { ring: 'border-blue-500',    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  emerald: { ring: 'border-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  violet:  { ring: 'border-violet-500',  badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
};

export default function PlanSettings() {
  const { currentUser, payments, addPayment, updatePayment } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [payError, setPayError] = useState('');

  const reference = searchParams.get('reference');

  const activePmt = payments
    .filter(p => p.userId === currentUser?.id && isPaymentActive(p))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const myPayments = payments
    .filter(p => p.userId === currentUser?.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const currentPlanName = activePmt?.plan ?? 'Basic';
  const currentPlanDef  = plans.find(p => p.name === currentPlanName) ?? plans[0];
  const currentIdx      = planOrder.indexOf(currentPlanName);

  // Verify the Paystack transaction when the user returns to /plan?reference=...
  useEffect(() => {
    if (!reference || !currentUser || processing || successMsg) return;
    let cancelled = false;
    (async () => {
      setVerifying(true);
      setProcessing(true);
      const result = await verifyPaystackPayment(reference);
      if (cancelled) return;
      setVerifying(false);
      setProcessing(false);
      if (result?.ok && result.payment) {
        if (activePmt && activePmt.plan !== result.payment.plan) {
          updatePayment(activePmt.id, { status: 'cancelled' });
        }
        addPayment(result.payment);
        setSuccessMsg(result.payment.plan);
        setSearchParams({}, { replace: true });
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setPayError(
          result?.error === 'payment_not_successful'
            ? 'The payment did not complete. You can try again.'
            : result?.message || 'We could not verify the payment. If you were charged, contact support.'
        );
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, currentUser, successMsg]);

  const handleActivate = async () => {
    if (!pendingPlan || !currentUser) return;
    const newPlan = plans.find(p => p.name === pendingPlan)!;
    if (newPlan.enterprise || newPlan.price === 0) return;
    setProcessing(true);
    setPayError('');
    const result = await initPaystackCheckout(newPlan.name, currentUser.email, currentUser.id, '/plan');
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

  const pendingPlanDef = pendingPlan ? plans.find(p => p.name === pendingPlan) : null;
  const pendingIdx     = pendingPlan ? planOrder.indexOf(pendingPlan) : -1;
  const isUpgrade      = pendingIdx > currentIdx;

  return (
    <div className="max-w-5xl mx-auto space-y-8 premium-surface rounded-2xl p-1" style={{ padding: '0.25rem 0 2rem' }}>

      <PageHeader
        eyebrow="Subscription"
        title="My Plan"
        subtitle="Review your current plan, compare options, and switch whenever you need."
      />

      {/* Success banner */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 animate-fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            Successfully switched to the <strong>{successMsg}</strong> plan! Your subscription is now active.
          </p>
        </div>
      )}

      {/* Current Plan Hero */}
      <Card className={`card-premium relative overflow-hidden p-6 border-2 ${accentClasses[currentPlanDef?.color ?? 'slate'].ring}`}>
        <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-emerald-500/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-heading text-xl font-bold text-slate-900 dark:text-white">
                  {currentPlanName} Plan
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Active
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {currentPlanDef?.enterprise
                  ? 'Custom enterprise pricing'
                  : `₦${currentPlanDef?.price.toLocaleString()} / month`}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {activePmt?.renewalDate && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                Renews {new Date(activePmt.renewalDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            )}
            {activePmt?.paymentMethod && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <CreditCard className="w-3.5 h-3.5" />
                Paid via {activePmt.paymentMethod}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {currentPlanDef?.features.map(f => (
            <span key={f} className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <CheckCircle className="w-3 h-3 text-emerald-500" /> {f}
            </span>
          ))}
        </div>
      </Card>

      {/* Plan Cards */}
      <div>
        <h3 className="font-heading font-bold text-slate-900 dark:text-white text-lg mb-1">Change Plan</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          Upgrades take effect immediately. Downgrades cancel your current plan.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map(plan => {
            const planIdx   = planOrder.indexOf(plan.name);
            const isCurrent = plan.name === currentPlanName;
            const accent    = accentClasses[plan.color];
            const direction = planIdx > currentIdx ? 'upgrade' : planIdx < currentIdx ? 'downgrade' : 'current';

            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl border-2 transition-all duration-200 flex flex-col ${
                  plan.enterprise
                    ? 'bg-slate-900 border-slate-700'
                    : isCurrent
                    ? `${accent.ring} bg-slate-50 dark:bg-slate-800/40`
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-card hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md'
                }`}
                style={{ padding: '1.25rem' }}
              >
                {/* Grid texture on Enterprise */}
                {plan.enterprise && (
                  <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]" />
                  </div>
                )}

                {plan.tag && !isCurrent && (
                  <div className="absolute left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full whitespace-nowrap" style={{ top: '-0.75rem' }}>
                    {plan.tag}
                  </div>
                )}
                {isCurrent && !plan.enterprise && (
                  <div className="absolute left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full whitespace-nowrap" style={{ top: '-0.75rem' }}>
                    Current Plan
                  </div>
                )}

                <div className="mb-3 relative">
                  <h4 className={`font-heading font-bold text-base mb-0.5 ${plan.enterprise ? 'text-white' : isCurrent ? 'text-slate-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                    {plan.name}
                  </h4>
                  <p className={`text-[10px] leading-relaxed mb-1.5 ${plan.enterprise ? 'text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>
                    {plan.description}
                  </p>
                  <div>
                    <span className={`font-heading font-bold text-xl ${plan.enterprise ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                      {plan.enterprise ? 'Custom' : `₦${plan.price.toLocaleString()}`}
                    </span>
                    {!plan.enterprise && <span className="text-xs text-slate-400 ml-1">{plan.period}</span>}
                  </div>
                </div>

                <ul className="flex-1 space-y-1.5 mb-4 relative">
                  {plan.features.map(f => (
                    <li key={f} className={`flex items-start gap-1.5 text-xs ${plan.enterprise ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400'}`}>
                      <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                  {plan.excluded.map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-slate-400 dark:text-slate-600">
                      <X className="w-3 h-3 text-slate-300 dark:text-slate-600 flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>

                {'note' in plan && plan.note && (
                  <p className="text-[10px] text-slate-400 italic mb-3 relative">* {plan.note as string}</p>
                )}

                <div className="relative">
                  {plan.enterprise ? (
                    <Link to="/contact">
                      <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-sm shadow-emerald-500/30">
                        <Phone className="w-3.5 h-3.5" /> Contact Sales
                      </button>
                    </Link>
                  ) : isCurrent ? (
                    <div className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                      <Minus className="w-3.5 h-3.5" /> Active
                    </div>
                  ) : (
                    <button
                      onClick={() => { setPendingPlan(plan.name); setPayError(''); }}
                      className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                        direction === 'upgrade'
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {direction === 'upgrade'
                        ? <><ArrowUp className="w-3.5 h-3.5" /> Upgrade</>
                        : <><ArrowDown className="w-3.5 h-3.5" /> Downgrade</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment History */}
      <Card className="card-premium p-6">
        <h3 className="font-heading font-semibold text-slate-900 dark:text-white mb-4">Payment History</h3>
        {myPayments.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No payment history yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-dark-border">
                  <th className="text-left py-3 px-4 text-xs text-slate-400 font-semibold uppercase tracking-wide">Reference</th>
                  <th className="text-left py-3 px-4 text-xs text-slate-400 font-semibold uppercase tracking-wide">Plan</th>
                  <th className="text-left py-3 px-4 text-xs text-slate-400 font-semibold uppercase tracking-wide">Amount</th>
                  <th className="text-left py-3 px-4 text-xs text-slate-400 font-semibold uppercase tracking-wide">Status</th>
                  <th className="text-left py-3 px-4 text-xs text-slate-400 font-semibold uppercase tracking-wide hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {myPayments.map(p => (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-slate-500 dark:text-slate-400">{p.reference}</td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white text-sm">{p.plan}</td>
                    <td className="py-3 px-4 text-slate-900 dark:text-white text-sm">₦{p.amount.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <Badge variant={p.status === 'completed' ? 'success' : p.status === 'pending' ? 'warning' : 'danger'}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell text-slate-400 text-xs">
                      {new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Confirmation Modal */}
      {pendingPlan && pendingPlanDef && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-dark-border">
              <div className="flex items-center gap-2.5">
                {isUpgrade
                  ? <ArrowUp className="w-5 h-5 text-emerald-500" />
                  : <ArrowDown className="w-5 h-5 text-amber-500" />}
                <h3 className="font-heading font-bold text-slate-900 dark:text-white">
                  {isUpgrade ? 'Upgrade' : 'Downgrade'} to {pendingPlan}
                </h3>
              </div>
              <button
                onClick={() => setPendingPlan(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div className="flex-1 text-center">
                  <p className="text-xs text-slate-400 mb-0.5">Current</p>
                  <p className="font-heading font-bold text-slate-900 dark:text-white">{currentPlanName}</p>
                  <p className="text-xs text-slate-500">₦{currentPlanDef?.price.toLocaleString()}/mo</p>
                </div>
                <RefreshCw className="w-5 h-5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                <div className="flex-1 text-center">
                  <p className="text-xs text-slate-400 mb-0.5">New</p>
                  <p className="font-heading font-bold text-slate-900 dark:text-white">{pendingPlan}</p>
                  <p className="text-xs text-slate-500">₦{pendingPlanDef.price.toLocaleString()}/mo</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Payment</p>
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-dark-border">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Payment is processed securely by <strong className="text-slate-700 dark:text-slate-200">Paystack</strong> — pay by card, bank transfer, USSD, or mobile money.
                    You'll be redirected to Paystack to complete the payment, and your plan activates automatically once verified.
                  </p>
                </div>
              </div>

              {payError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">{payError}</p>
                </div>
              )}

              {!isUpgrade && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                  <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Your current plan will be cancelled immediately. You'll lose access to higher-tier features.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setPendingPlan(null)} disabled={processing}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleActivate} disabled={processing}>
                  {processing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {verifying ? 'Verifying payment…' : 'Preparing checkout…'}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {isUpgrade ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                      Pay ₦{pendingPlanDef.price.toLocaleString()}
                    </span>
                  )}
                </Button>
              </div>
              <p className="text-center text-xs text-slate-400">
                You'll be redirected to Paystack to complete your payment securely.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
