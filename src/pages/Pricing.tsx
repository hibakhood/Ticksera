import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle, ArrowRight, Zap, Phone, Minus, RefreshCw, CreditCard,
  Clock, ShieldCheck, User, Building2, Sparkles, BadgeCheck, LifeBuoy,
} from 'lucide-react';
import Button from '../components/ui/Button';
import ShaderBackground from '../components/ui/ShaderBackground';
import { useStore } from '../store';

const FREQUENCIES = ['monthly', 'yearly'] as const;
type Frequency = typeof FREQUENCIES[number];

interface Plan {
  id: string;
  icon: React.ElementType;
  grad: string;
  name: string;
  description: string;
  price: { monthly: number | null; yearly: number | null };
  features: string[];
  note?: string;
  cta: string;
  popular?: boolean;
  highlighted?: boolean;
  enterprise?: boolean;
}

const plans: Plan[] = [
  {
    id: 'basic',
    icon: User,
    grad: 'from-slate-500 to-slate-700',
    name: 'Basic',
    description: 'For individuals who occasionally need IT support.',
    price: { monthly: 5000, yearly: 4000 },
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
    cta: 'Get Started',
  },
  {
    id: 'professional',
    icon: Zap,
    grad: 'from-emerald-500 to-teal-600',
    name: 'Professional',
    description: 'For professionals, freelancers, and power users.',
    price: { monthly: 15000, yearly: 12000 },
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
    cta: 'Get Started',
    popular: true,
  },
  {
    id: 'business',
    icon: Building2,
    grad: 'from-blue-500 to-sky-600',
    name: 'Business',
    description: 'For small and medium businesses.',
    price: { monthly: 50000, yearly: 40000 },
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
    cta: 'Get Started',
  },
  {
    id: 'enterprise',
    icon: Sparkles,
    grad: 'from-violet-500 to-purple-600',
    name: 'Enterprise',
    description: 'For large organizations and enterprises.',
    price: { monthly: null, yearly: null },
    features: [
      'Unlimited users & teams',
      'Unlimited ticket volume',
      'Unlimited booking sessions',
      'Full knowledge base',
      'Remote support assistance',
      'On-site support assistance',
      'Dedicated account manager',
      '24/7 priority support',
      'High-priority support',
      'Custom workflows',
      'Unlimited assets',
    ],
    cta: 'Contact Sales',
    highlighted: true,
    enterprise: true,
  },
];

type CellValue = boolean | string;

const compareRows: { label: string; basic: CellValue; professional: CellValue; business: CellValue; enterprise: CellValue }[] = [
  { label: 'Customer dashboard', basic: true, professional: true, business: true, enterprise: true },
  { label: 'Tickets per month', basic: '5', professional: 'Unlimited', business: 'Unlimited', enterprise: 'Unlimited' },
  { label: 'Live chat', basic: 'Limited', professional: true, business: true, enterprise: true },
  { label: 'Priority support', basic: false, professional: true, business: true, enterprise: true },
  { label: 'Remote support', basic: true, professional: true, business: true, enterprise: true },
  { label: 'Booking sessions', basic: '2 / month', professional: 'Unlimited', business: 'Unlimited', enterprise: 'Unlimited' },
  { label: 'Knowledge base', basic: 'Basic', professional: true, business: true, enterprise: true },
  { label: 'Team members', basic: false, professional: '1 seat', business: 'Up to 15', enterprise: 'Up to 100' },
  { label: 'On-site support', basic: false, professional: false, business: false, enterprise: true },
  { label: 'Dedicated manager', basic: false, professional: false, business: true, enterprise: 'Account manager' },
  { label: '24/7 priority support', basic: false, professional: false, business: false, enterprise: true },
  { label: 'Custom workflows', basic: false, professional: false, business: false, enterprise: true },
];

const guarantees = [
  { icon: RefreshCw,   grad: 'from-emerald-500 to-teal-600',    title: 'Upgrade or downgrade anytime', desc: 'Change plans from the Billing page — new plans take effect immediately.' },
  { icon: CreditCard,  grad: 'from-blue-500 to-sky-600',        title: 'No credit card required',      desc: 'Start with the plan that fits. No card needed to get going.' },
  { icon: Clock,       grad: 'from-violet-500 to-purple-600',   title: 'Cancel anytime',               desc: 'Keep your subscription until you choose to end it — no questions asked.' },
  { icon: ShieldCheck, grad: 'from-amber-500 to-orange-600',    title: '7-day money-back guarantee',   desc: 'New paid subscriptions are fully covered for the first week.' },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <span className="inline-block text-xs font-semibold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-3">
      {children}
    </span>
  );
}

function PriceDisplay({ price, frequency }: { price: number | null; frequency: Frequency }) {
  if (price === null) return (
    <div>
      <span className="font-heading text-white" style={{ fontSize: '2rem', fontWeight: 700 }}>Custom</span>
    </div>
  );
  return (
    <div>
      <span
        key={`${price}-${frequency}`}
        className="font-heading text-slate-900 dark:text-white"
        style={{ fontSize: '2rem', fontWeight: 700, display: 'inline-block', animation: 'priceFadeIn 0.22s ease' }}
      >
        ₦{price.toLocaleString()}
      </span>
    </div>
  );
}

function Cell({ value, highlighted }: { value: CellValue; highlighted: boolean }) {
  if (value === true) {
    return (
      <CheckCircle className={`w-4 h-4 mx-auto ${highlighted ? 'text-emerald-400' : 'text-emerald-500'}`} />
    );
  }
  if (value === false) {
    return <Minus className={`w-4 h-4 mx-auto ${highlighted ? 'text-slate-600' : 'text-slate-300 dark:text-slate-600'}`} />;
  }
  return <span className={`text-xs font-medium ${highlighted ? 'text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>{value}</span>;
}

export default function Pricing() {
  const { currentUser } = useStore();
  const [frequency, setFrequency] = useState<Frequency>('monthly');

  return (
    <div className="bg-white dark:bg-dark-bg">

      <style>{`
        @keyframes priceFadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-grid pointer-events-none" />
        <ShaderBackground />
        <div className="s-hero s-inner relative z-10 max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide mb-8">
            <BadgeCheck className="w-3.5 h-3.5" />
            Plans & Pricing
          </div>
          <h1 className="font-heading text-white leading-[1.1] tracking-tight text-[clamp(2.125rem,5vw,3.5rem)] font-bold">
            Simple, <span className="text-gradient">Transparent</span> Pricing
          </h1>
          <p className="text-slate-300 leading-relaxed text-[1.0625rem] mt-6 max-w-2xl mx-auto">
            Pick the plan that fits, then upgrade, downgrade, or cancel whenever you like. No hidden fees, no lock-in.
          </p>

          {/* Frequency toggle */}
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/10 border border-white/15" style={{ marginTop: '2rem' }}>
            {FREQUENCIES.map(freq => (
              <button
                key={freq}
                onClick={() => setFrequency(freq)}
                className={`relative px-5 py-2 rounded-full text-sm font-semibold capitalize transition-all duration-200 ${
                  frequency === freq
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {freq}
                {freq === 'yearly' && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-bold leading-none">
                    -20%
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            {[
              { icon: CreditCard, label: 'No credit card required' },
              { icon: RefreshCw, label: 'Upgrade or downgrade anytime' },
              { icon: Clock, label: 'Cancel anytime' },
            ].map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-slate-200">
                <t.icon className="w-3.5 h-3.5 text-emerald-400" />
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="s-section bg-white dark:bg-dark-bg">
        <div className="s-inner max-w-6xl mx-auto">

          {frequency === 'yearly' && (
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium" style={{ marginBottom: '2rem' }}>
              <Zap className="w-4 h-4" />
              2 months free with yearly billing
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map(p => {
              const price = p.price[frequency];
              const Icon = p.icon;

              return (
                <div
                  key={p.id}
                  className={`card-premium group relative flex flex-col rounded-2xl overflow-hidden ${
                    p.highlighted
                      ? 'bg-slate-900 border border-slate-700 shadow-xl'
                      : p.popular
                      ? 'bg-white dark:bg-dark-card border-2 border-emerald-500 shadow-lg shadow-emerald-500/10'
                      : 'bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border hover:border-emerald-400 dark:hover:border-emerald-600'
                  }`}
                  style={{ padding: '1.5rem' }}
                >
                  {/* Gradient hairline */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Grid texture on Enterprise */}
                  {p.highlighted && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:28px_28px]" />
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(16,185,129,0.12),transparent)]" />
                    </div>
                  )}

                  {/* Most Popular badge */}
                  {p.popular && (
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full whitespace-nowrap z-10" style={{ top: '-0.75rem' }}>
                      <Zap className="w-2.5 h-2.5" /> Most Popular
                    </div>
                  )}

                  {/* Icon + name + description */}
                  <div className="relative z-10" style={{ marginBottom: '1.25rem' }}>
                    <div className={`chip-icon bg-gradient-to-br ${p.grad} shadow-lg mb-4 group-hover:scale-105 transition-transform duration-300`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className={`font-heading font-bold text-lg ${p.highlighted ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                      {p.name}
                    </h3>
                    <p className={`text-xs mt-1 leading-relaxed ${p.highlighted ? 'text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      {p.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="relative z-10" style={{ marginBottom: '1.25rem' }}>
                    {p.enterprise ? (
                      <div>
                        <span className="font-heading text-white" style={{ fontSize: '2rem', fontWeight: 700 }}>Custom</span>
                        <p className="text-xs text-slate-500 mt-1">Pricing tailored to your needs</p>
                      </div>
                    ) : (
                      <div>
                        <PriceDisplay price={price} frequency={frequency} />
                        <p className={`text-xs mt-1 ${p.highlighted ? 'text-slate-500' : 'text-slate-400'}`}>
                          /month{frequency === 'yearly' ? ', billed yearly' : ''}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="relative z-10 flex-1" style={{ marginBottom: '1.25rem' }}>
                    {p.features.map(f => (
                      <li key={f} className={`flex items-start gap-2 text-xs ${p.highlighted ? 'text-slate-300' : 'text-slate-600 dark:text-slate-400'}`} style={{ marginBottom: '0.5rem' }}>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" style={{ marginTop: '0.125rem' }} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Note */}
                  {p.note && (
                    <p className="relative z-10 text-[10px] text-slate-400 dark:text-slate-500 italic" style={{ marginBottom: '1rem' }}>
                      * {p.note}
                    </p>
                  )}

                  {/* CTA */}
                  <div className="relative z-10">
                    <Link to={p.enterprise ? '/contact' : (currentUser ? '/plan' : '/login')}>
                      <Button
                        variant={p.highlighted || p.popular ? 'primary' : 'outline'}
                        size="sm"
                        className={`w-full flex items-center justify-center gap-2 ${p.highlighted ? 'bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white' : ''}`}
                      >
                        {p.enterprise ? <><Phone className="w-3.5 h-3.5" /> {p.cta}</> : <>{p.cta} <ArrowRight className="w-3.5 h-3.5" /></>}
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 text-center" style={{ marginTop: '2rem' }}>
            All prices are in Nigerian Naira (₦). This is a demo build — no real charges are made.
          </p>
        </div>
      </section>

      {/* Comparison */}
      <section className="s-section bg-slate-50 dark:bg-dark-bg/50">
        <div className="s-inner max-w-6xl mx-auto">
          <div className="s-header text-center">
            <SectionLabel>Compare Plans</SectionLabel>
            <h2 className="font-heading text-slate-900 dark:text-white text-3xl sm:text-4xl font-bold">Every Feature, Side by Side</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto text-[0.9375rem] leading-relaxed">
              Find the exact plan that matches how your team works.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm" style={{ marginTop: '2.5rem' }}>
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-5 py-4">
                    <span className="font-heading text-slate-300 text-xs uppercase tracking-widest">Feature</span>
                  </th>
                  {plans.map(p => (
                    <th key={p.id} className={`px-4 py-4 text-center ${p.highlighted ? 'bg-emerald-500/10' : p.popular ? 'bg-emerald-500/5' : ''}`}>
                      <div className={`font-heading font-bold ${p.highlighted ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{p.name}</div>
                      <div className={`text-[11px] mt-0.5 font-medium ${p.highlighted ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {p.enterprise
                          ? 'Custom'
                          : frequency === 'monthly'
                          ? `₦${(p.price.monthly as number).toLocaleString()}/mo`
                          : `₦${(p.price.yearly as number).toLocaleString()}/yr`}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row, i) => (
                  <tr key={row.label} className={`border-t border-slate-200 dark:border-dark-border ${i % 2 === 1 ? 'bg-slate-50/60 dark:bg-dark-bg/40' : 'bg-white dark:bg-dark-card'}`}>
                    <td className="px-5 py-3 text-xs font-medium text-slate-700 dark:text-slate-300">{row.label}</td>
                    {[
                      ['basic', row.basic],
                      ['professional', row.professional],
                      ['business', row.business],
                      ['enterprise', row.enterprise],
                    ].map(([id, value]) => (
                      <td key={id as string} className={`px-4 py-3 text-center ${id === 'enterprise' ? 'bg-emerald-500/10' : ''}`}>
                        <Cell value={value as CellValue} highlighted={id === 'enterprise'} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Guarantees */}
      <section className="s-section bg-white dark:bg-dark-bg">
        <div className="s-inner max-w-6xl mx-auto">
          <div className="s-header text-center">
            <SectionLabel>Why It's Simple</SectionLabel>
            <h2 className="font-heading text-slate-900 dark:text-white text-3xl sm:text-4xl font-bold">Pricing You Can Rely On</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto text-[0.9375rem] leading-relaxed">
              No hidden fees, no lock-in, no surprises — just clear, honest pricing.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" style={{ marginTop: '2.5rem' }}>
            {guarantees.map((g, i) => (
              <div key={i} className="card-premium group bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 text-center">
                <div className={`chip-icon bg-gradient-to-br ${g.grad} shadow-lg mx-auto mb-4 group-hover:scale-105 transition-transform duration-300`}>
                  <g.icon className="w-5 h-5" />
                </div>
                <h3 className="font-heading font-bold text-sm text-slate-900 dark:text-white mb-1.5">{g.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{g.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="s-section bg-slate-50 dark:bg-dark-bg/50">
        <div className="s-inner max-w-5xl mx-auto">
          <div className="rounded-3xl bg-slate-900 dark:bg-slate-950 relative overflow-hidden text-center px-6 py-12 sm:px-12">
            <div className="absolute -top-24 -left-16 w-64 h-64 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden />
            <div className="absolute -bottom-24 -right-16 w-64 h-64 rounded-full bg-teal-500/15 blur-3xl" aria-hidden />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20" style={{ marginBottom: '1rem' }}>
                <LifeBuoy className="w-3.5 h-3.5" />
                Let's talk
              </div>
              <h3 className="font-heading text-white" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>Need a custom agreement?</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto" style={{ marginBottom: '1.75rem' }}>
                From large enterprises with on-site requirements to organisations with complex workflows — we'll build a plan around you.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/contact"><Button size="lg">Contact Sales</Button></Link>
                <Link to="/services">
                  <Button variant="ghost" size="lg" className="text-slate-300 hover:text-white hover:bg-slate-800">Browse Services</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
