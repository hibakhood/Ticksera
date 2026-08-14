import { useState } from 'react';
import ShaderBackground from '../components/ui/ShaderBackground';
import { Search, Plus, X, Rocket, Wrench, CreditCard, Building2, ShieldCheck, LifeBuoy } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

interface FaqItem { q: string; a: string; }
interface FaqCategory { icon: React.ElementType; label: string; grad: string; faqs: FaqItem[]; }

const FAQS: FaqCategory[] = [
  {
    icon: Rocket,
    label: 'Getting Started',
    grad: 'from-emerald-500 to-teal-600',
    faqs: [
      { q: 'What is TICKSERA?', a: 'TICKSERA is an enterprise-grade IT support platform that helps businesses manage technical support tickets, technician scheduling, and customer communication in one place.' },
      { q: 'How do I get IT help?', a: 'Sign up for a free account, navigate to the Tickets section, and click "Get IT Help". Describe your issue and our AI assistant will walk you through diagnostic steps. If the issue isn\'t resolved, you can request a technician.' },
      { q: 'How does the AI assistant and smart triage work?', a: 'When you open a ticket, our guided wizard quickly collects the essentials: client type, industry, category, product, and symptom. TICKSERA\'s AI then triages the request instantly, recommending diagnostic steps and routing it to the right specialist so you skip the queue entirely.' },
      { q: 'How do I track my ticket and its SLA?', a: 'Every ticket is tracked live from your dashboard. The SLA countdown starts the moment you submit, and tickets that approach or breach their response target are automatically escalated, with real-time status and a full activity history on each ticket.' },
    ],
  },
  {
    icon: Wrench,
    label: 'Support & Services',
    grad: 'from-blue-500 to-sky-600',
    faqs: [
      { q: 'What are the response times?', a: 'Our average first response time is under 15 minutes for critical issues. Standard tickets are typically addressed within 1-2 hours. SLA-backed response times are available on Pro and Enterprise plans.' },
      { q: 'What\'s the difference between remote and onsite support?', a: 'Remote support is handled over a secure screen-share session, ideal for software, email, account, and connectivity issues, and usually the fastest option. Onsite support sends a technician to your location, and is best for hardware failures, cabling, CCTV, and anything that needs physical access.' },
      { q: 'Can I book an onsite technician?', a: 'Yes. You can book remote or onsite support sessions. Select your preferred date, time, and service type and we\'ll match you with the best available technician.' },
      { q: 'Do you support Microsoft 365 and Google Workspace?', a: 'Yes. We support the full Microsoft 365 suite (Outlook, Teams, SharePoint, OneDrive) and Google Workspace (Gmail, Drive, Meet, Calendar), including setup, migration, admin management, and troubleshooting.' },
      { q: 'Can you help me onboard new employees?', a: 'Yes. Business clients can add employee onboarding and offboarding: new-user setup, email and app provisioning, access rights, and equipment handover, as part of their support plan.' },
      { q: 'Which areas do you cover?', a: 'Remote support is available wherever you are. Onsite visits are scheduled around your location and technician availability, and Business plans extend support to every department and site in your organisation.' },
      { q: 'What happens if my issue isn\'t fully resolved?', a: 'If a fix doesn\'t stick, reopen the ticket and the same specialist picks it up with the full history, no repeating yourself. Tickets approaching or exceeding their SLA are automatically escalated, and we follow up until you\'re satisfied.' },
    ],
  },
  {
    icon: CreditCard,
    label: 'Plans & Billing',
    grad: 'from-violet-500 to-purple-600',
    faqs: [
      { q: 'What plans are available?', a: 'TICKSERA offers four plans: Basic (₦5,000/mo), Professional (₦15,000/mo, most popular), Business (₦50,000/mo for teams up to 15), and Enterprise (custom pricing for large organisations). All paid plans include a full customer dashboard, ticket management, and remote support.' },
      { q: 'Can I upgrade or downgrade?', a: 'Absolutely. You can upgrade, downgrade, or cancel at any time from the Billing section of your dashboard. Changes take effect immediately.' },
      { q: 'What payment methods do you accept?', a: 'We accept Card, Bank Transfer, USSD, and Mobile Pay. This is a demo build; no real charges are made.' },
    ],
  },
  {
    icon: Building2,
    label: 'Teams & Enterprise',
    grad: 'from-amber-500 to-orange-600',
    faqs: [
      { q: 'Do you offer team accounts?', a: 'Yes. The Business plan supports up to 15 team members. For unlimited users and teams, choose the Enterprise plan with custom pricing.' },
      { q: 'How does SLA management work?', a: 'On Professional, Business, and Enterprise plans you can set response and resolution time targets. The system automatically escalates tickets approaching or exceeding SLA deadlines.' },
    ],
  },
  {
    icon: ShieldCheck,
    label: 'Security & Trust',
    grad: 'from-rose-500 to-red-600',
    faqs: [
      { q: 'How secure is TICKSERA?', a: 'We use end-to-end encryption, role-based access controls, and follow SOC 2 compliance standards. All data is stored securely with regular backups.' },
    ],
  },
];

const POPULAR = ['SLA', 'Payment', 'Onsite', 'Security', 'Upgrade'];

export default function FAQ() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const results: { cat: FaqCategory; ci: number; fi: number; item: FaqItem }[] = [];
  FAQS.forEach((cat, ci) => cat.faqs.forEach((item, fi) => {
    if (!q || item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)) {
      results.push({ cat, ci, fi, item });
    }
  }));

  const renderItem = (ci: number, fi: number, item: FaqItem) => {
    const key = `${ci}-${fi}`;
    const isOpen = open === key;
    return (
      <div key={key} className={`rounded-2xl border transition-all duration-200 ${isOpen ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm'}`}>
        <button
          onClick={() => setOpen(isOpen ? null : key)}
          className="w-full flex items-center justify-between gap-4 text-left px-5 py-4"
        >
          <span className="font-heading font-semibold text-sm text-slate-900 dark:text-white leading-snug">{item.q}</span>
          <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${isOpen ? 'bg-emerald-500 text-white rotate-180' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
            <Plus className="w-4 h-4" />
          </span>
        </button>
        <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed px-5 pb-5">{item.a}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-dark-bg">

      {/* Hero */}
      <section className="s-hero bg-slate-900 relative overflow-hidden">
        <ShaderBackground />
        <div className="absolute inset-0 bg-grid" aria-hidden />
        <div className="s-inner max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20" style={{ marginBottom: '1.5rem' }}>
            <LifeBuoy className="w-3.5 h-3.5" />
            Support Center
          </div>
          <h1 className="font-heading text-white" style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Frequently Asked Questions</h1>
          <p className="text-slate-300">Everything you need to know about getting IT help with TICKSERA.</p>

          {/* Search */}
          <div className="relative max-w-xl mx-auto" style={{ marginTop: '2rem' }}>
            <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(null); }}
              placeholder="Search questions… e.g. SLA, payment, onsite"
              className="w-full rounded-2xl bg-white/10 backdrop-blur border border-white/15 text-white placeholder:text-slate-400 pl-11 pr-10 py-3.5 text-sm outline-none focus:border-emerald-400/60 focus:bg-white/15 focus:ring-2 focus:ring-emerald-400/20 transition-all"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors" aria-label="Clear search">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2" style={{ marginTop: '1rem' }}>
            <span className="text-[11px] text-slate-500">Popular:</span>
            {POPULAR.map(t => (
              <button key={t} onClick={() => { setQuery(t); setOpen(null); }} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-slate-300 hover:bg-white/20 hover:text-white transition-colors">
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Questions */}
      <section className="s-section bg-white dark:bg-dark-bg">
        <div className="s-inner max-w-3xl mx-auto">
          {q ? (
            <>
              <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-900 dark:text-white">{results.length}</span> result{results.length !== 1 ? 's' : ''} for <span className="font-semibold text-slate-900 dark:text-white">"{query.trim()}"</span>
                </p>
                <button onClick={() => setQuery('')} className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">Clear search</button>
              </div>
              {results.length === 0 ? (
                <div className="text-center py-16">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center" style={{ marginBottom: '1rem' }}>
                    <Search className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">No results found. Try a different keyword or browse the categories below.</p>
                  <button onClick={() => setQuery('')} className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">Show all questions</button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {results.map(r => renderItem(r.ci, r.fi, r.item))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-10">
              {FAQS.map((cat, ci) => {
                const Icon = cat.icon;
                return (
                  <div key={ci}>
                    <div className="flex items-center gap-3" style={{ marginBottom: '1.25rem' }}>
                      <div className={`chip-icon bg-gradient-to-br ${cat.grad} shadow-lg`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-heading font-bold text-base text-slate-900 dark:text-white">{cat.label}</h2>
                        <p className="text-xs text-slate-400">{cat.faqs.length} question{cat.faqs.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      {cat.faqs.map((item, fi) => renderItem(ci, fi, item))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* CTA */}
          <div className="rounded-3xl bg-slate-900 dark:bg-slate-950 relative overflow-hidden text-center" style={{ marginTop: '3rem', padding: '3rem 1.5rem' }}>
            <div className="absolute -top-24 -left-16 w-64 h-64 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden />
            <div className="absolute -bottom-24 -right-16 w-64 h-64 rounded-full bg-teal-500/15 blur-3xl" aria-hidden />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20" style={{ marginBottom: '1rem' }}>
                Need a hand?
              </div>
              <h3 className="font-heading text-white" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Still have questions?</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto" style={{ marginBottom: '1.75rem' }}>
                Can't find what you're looking for? Our team is happy to help with anything you need.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/contact"><Button size="lg">Contact Us</Button></Link>
                <Link to="/docs">
                  <Button variant="ghost" size="lg" className="text-slate-300 hover:text-white hover:bg-slate-800">Read the Docs</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
