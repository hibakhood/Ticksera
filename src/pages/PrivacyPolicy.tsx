import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Shield, ChevronRight, Database, Sparkles, Share2, ShieldCheck, Clock,
  UserCheck, Cookie, Mail, Lock, Bell, Trash2, LifeBuoy, Ban,
} from 'lucide-react';
import ShaderBackground from '../components/ui/ShaderBackground';
import Button from '../components/ui/Button';

const sections = [
  {
    id: 'collect',
    num: '01',
    icon: Database,
    grad: 'from-emerald-500 to-teal-600',
    title: 'Information We Collect',
    content: [
      {
        subtitle: '1.1 Account Information',
        text: 'When you register for FIXORA, we collect personal information such as your full name, email address, phone number, company name, and billing information. This information is required to create and maintain your account.',
      },
      {
        subtitle: '1.2 Support Ticket Data',
        text: 'We collect information you provide when submitting support tickets, including issue descriptions, screenshots, file attachments, and device or system information. This data is used solely to resolve your technical issues.',
      },
      {
        subtitle: '1.3 Usage & Log Data',
        text: 'We automatically collect information about how you interact with our platform, including IP addresses, browser type, pages visited, timestamps, session duration, and clickstream data. This helps us improve performance and detect security threats.',
      },
      {
        subtitle: '1.4 Communication Data',
        text: 'Messages exchanged through our live chat feature, email correspondence with our support team, and any feedback you submit are stored to maintain service continuity and quality assurance.',
      },
      {
        subtitle: '1.5 Payment Information',
        text: 'Payment transactions are processed through secure third-party processors. We store only non-sensitive billing details (plan type, billing cycle, last 4 digits of card) and never retain full card numbers on our servers.',
      },
    ],
  },
  {
    id: 'use',
    num: '02',
    icon: Sparkles,
    grad: 'from-blue-500 to-sky-600',
    title: 'How We Use Your Information',
    content: [
      {
        subtitle: '2.1 Service Delivery',
        text: 'We use your information to create and manage your account, process support requests, assign technicians, send ticket updates and SLA notifications, and provide all features included in your subscription plan.',
      },
      {
        subtitle: '2.2 Communication',
        text: 'We may contact you via email or SMS to send service updates, maintenance notices, security alerts, invoice receipts, and (with your consent) promotional materials about new features or plans.',
      },
      {
        subtitle: '2.3 Analytics & Improvement',
        text: 'Aggregated and anonymised usage data helps us understand feature adoption, identify bugs, optimise platform performance, and make product decisions. This data is never sold to third parties.',
      },
      {
        subtitle: '2.4 Legal & Compliance',
        text: 'We may process your data to comply with applicable laws, respond to lawful government or regulatory requests, enforce our Terms of Service, and protect the rights, property, and safety of FIXORA and its users.',
      },
    ],
  },
  {
    id: 'share',
    num: '03',
    icon: Share2,
    grad: 'from-violet-500 to-purple-600',
    title: 'Data Sharing & Disclosure',
    content: [
      {
        subtitle: '3.1 Service Providers',
        text: 'We share data with trusted third-party service providers (e.g., cloud hosting, payment processors, email delivery, analytics) who process data on our behalf under strict data processing agreements and are prohibited from using it for any other purpose.',
      },
      {
        subtitle: '3.2 Business Transfers',
        text: 'If FIXORA is involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will notify you before your data becomes subject to a different privacy policy.',
      },
      {
        subtitle: '3.3 Legal Requirements',
        text: 'We may disclose your information if required by law, court order, or governmental authority, or if we believe disclosure is necessary to prevent imminent harm or illegal activity.',
      },
      {
        subtitle: '3.4 No Sale of Personal Data',
        text: 'FIXORA does not sell, rent, or trade your personal information to third parties for marketing purposes under any circumstances.',
      },
    ],
  },
  {
    id: 'security',
    num: '04',
    icon: ShieldCheck,
    grad: 'from-amber-500 to-orange-600',
    title: 'Data Security',
    content: [
      {
        subtitle: '4.1 Technical Safeguards',
        text: 'We implement industry-standard security measures including TLS 1.3 encryption in transit, AES-256 encryption at rest, role-based access controls, multi-factor authentication for administrative access, and regular vulnerability assessments.',
      },
      {
        subtitle: '4.2 SOC 2 Compliance',
        text: 'Our infrastructure is designed to meet SOC 2 Type II security, availability, and confidentiality criteria. We undergo periodic third-party audits to verify our compliance posture.',
      },
      {
        subtitle: '4.3 Breach Notification',
        text: 'In the event of a data breach that affects your personal information, we will notify you within 72 hours of becoming aware of the incident, as required by applicable data protection laws.',
      },
    ],
  },
  {
    id: 'retention',
    num: '05',
    icon: Clock,
    grad: 'from-rose-500 to-red-600',
    title: 'Data Retention',
    content: [
      {
        subtitle: '5.1 Active Accounts',
        text: 'We retain your personal data for as long as your account is active. Ticket history, chat logs, and activity records are kept to provide continuity of service and support historical analysis.',
      },
      {
        subtitle: '5.2 Account Deletion',
        text: 'Upon account deletion, we will permanently delete your personal data within 30 days, except where retention is required by law (e.g., financial records must be kept for 7 years in most jurisdictions).',
      },
      {
        subtitle: '5.3 Backup Retention',
        text: 'Encrypted backup copies may persist for up to 90 days after deletion as part of our disaster recovery processes, after which they are permanently destroyed.',
      },
    ],
  },
  {
    id: 'rights',
    num: '06',
    icon: UserCheck,
    grad: 'from-cyan-500 to-teal-600',
    title: 'Your Rights',
    content: [
      {
        subtitle: '6.1 Access & Portability',
        text: 'You have the right to request a copy of the personal data we hold about you in a structured, machine-readable format. Submit a request via your account settings or by emailing privacy@fixora.com.',
      },
      {
        subtitle: '6.2 Correction',
        text: 'You may update inaccurate or incomplete personal data at any time through your profile settings or by contacting our support team.',
      },
      {
        subtitle: '6.3 Deletion ("Right to be Forgotten")',
        text: 'You may request deletion of your personal data. We will honour such requests unless retention is required for legal or legitimate business reasons.',
      },
      {
        subtitle: '6.4 Opt-Out of Marketing',
        text: 'You can opt out of marketing communications at any time by clicking "Unsubscribe" in any email or updating your notification preferences in your account settings.',
      },
    ],
  },
  {
    id: 'cookies',
    num: '07',
    icon: Cookie,
    grad: 'from-fuchsia-500 to-purple-600',
    title: 'Cookies & Tracking',
    content: [
      {
        subtitle: '7.1 Essential Cookies',
        text: 'We use strictly necessary cookies to maintain your session, remember authentication state, and provide core platform functionality. These cannot be disabled without breaking core features.',
      },
      {
        subtitle: '7.2 Analytics Cookies',
        text: 'With your consent, we use analytics cookies to understand platform usage patterns and improve the user experience. You can manage cookie preferences through our cookie banner.',
      },
      {
        subtitle: '7.3 No Third-Party Advertising Cookies',
        text: 'FIXORA does not use advertising or cross-site tracking cookies. We do not participate in ad networks or retargeting programs.',
      },
    ],
  },
  {
    id: 'contact',
    num: '08',
    icon: Mail,
    grad: 'from-slate-500 to-slate-700',
    title: 'Contact & Updates',
    content: [
      {
        subtitle: '8.1 Contact Us',
        text: 'For privacy-related enquiries, data subject requests, or to report a concern, contact our Data Protection Officer at: privacy@fixora.com or write to FIXORA Technologies Ltd, Lagos, Nigeria.',
      },
      {
        subtitle: '8.2 Policy Updates',
        text: 'We may update this Privacy Policy periodically. We will notify you of material changes via email or an in-app notice at least 14 days before the changes take effect. Continued use of the platform after that date constitutes acceptance of the updated policy.',
      },
    ],
  },
];

const facts = [
  { icon: Ban,      title: 'No sale of data',       desc: 'We never sell, rent, or trade your personal information.' },
  { icon: Bell,     title: '72-hour breach alert',  desc: 'You\u2019re notified within 72 hours of any breach.' },
  { icon: Trash2,   title: '30-day deletion',       desc: 'Your data is deleted within 30 days of account deletion.' },
  { icon: Lock,     title: 'TLS + AES-256',         desc: 'Encrypted in transit and at rest, end to end.' },
];

export default function PrivacyPolicy() {
  const [activeId, setActiveId] = useState('collect');

  useEffect(() => {
    const onScroll = () => {
      const current = sections
        .map(s => {
          const el = document.getElementById(s.id);
          return { id: s.id, top: el ? el.getBoundingClientRect().top : Infinity };
        })
        .filter(o => o.top <= 200)
        .sort((a, b) => b.top - a.top)[0];
      if (current) setActiveId(current.id);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setActiveId(id);
  };

  return (
    <div className="bg-white dark:bg-dark-bg min-h-screen">

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-grid pointer-events-none" />
        <ShaderBackground />
        <div className="s-hero s-inner relative z-10 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-slate-500" style={{ marginBottom: '1.5rem' }}>
            <Link to="/" className="hover:text-emerald-400 transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-300">Privacy Policy</span>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide mb-8">
            <Shield className="w-3.5 h-3.5" />
            Privacy & Trust
          </div>
          <h1 className="font-heading text-white leading-[1.1] tracking-tight text-[clamp(2.125rem,5vw,3.5rem)] font-bold">
            Privacy <span className="text-gradient">Policy</span>
          </h1>
          <p className="text-slate-300 leading-relaxed text-[1.0625rem] mt-6 max-w-2xl">
            FIXORA Technologies Ltd ("FIXORA", "we", "our", or "us") is committed to protecting your privacy. This policy explains what personal data we collect, how we use it, how we keep it safe, and your rights regarding your information when you use our platform and services.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-8">
            {[
              { icon: Lock,       label: 'Encrypted in transit' },
              { icon: ShieldCheck, label: 'SOC 2 aligned' },
              { icon: Ban,         label: 'No data sold' },
              { icon: Mail,        label: 'DPA available' },
            ].map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-slate-200">
                <t.icon className="w-3.5 h-3.5 text-emerald-400" />
                {t.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-slate-300">
              Last updated June 9, 2026
            </span>
          </div>
        </div>
      </section>

      {/* Quick facts */}
      <section className="s-section bg-white dark:bg-dark-bg">
        <div className="s-inner max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {facts.map((f, i) => (
              <div key={i} className="card-premium group bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5 flex items-start gap-4">
                <div className="chip-icon bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg group-hover:scale-105 transition-transform duration-300">
                  <f.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-sm text-slate-900 dark:text-white mb-1">{f.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="s-section bg-slate-50 dark:bg-dark-bg/50" style={{ paddingTop: '2rem' }}>
        <div className="s-inner max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-10">

            {/* Sidebar */}
            <aside className="lg:w-64 flex-shrink-0">
              <div className="sticky top-24">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest" style={{ marginBottom: '0.875rem' }}>On this page</p>
                <nav className="space-y-1">
                  {sections.map(s => (
                    <button
                      key={s.id}
                      onClick={() => jumpTo(s.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${activeId === s.id
                        ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 font-semibold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'}`}
                    >
                      <span className="text-[10px] font-bold w-4 flex-shrink-0">{s.num}</span>
                      {s.title}
                    </button>
                  ))}
                </nav>

                <div className="mt-8 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2" style={{ marginBottom: '0.375rem' }}>
                    <LifeBuoy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Questions?</p>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed" style={{ marginBottom: '0.75rem' }}>
                    For data requests or privacy enquiries, email privacy@fixora.com.
                  </p>
                  <Link to="/contact" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                    Contact support <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </aside>

            {/* Main */}
            <main className="flex-1 min-w-0">
              <div className="flex flex-col gap-6">
                {sections.map(section => {
                  const Icon = section.icon;
                  return (
                    <section key={section.id} id={section.id} className="scroll-mt-28 rounded-2xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card p-6 sm:p-8">
                      <div className="flex items-center gap-3" style={{ marginBottom: '1.5rem' }}>
                        <div className={`chip-icon bg-gradient-to-br ${section.grad} shadow-lg`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Section {section.num}</span>
                          <h2 className="font-heading font-bold text-lg text-slate-900 dark:text-white leading-tight">{section.title}</h2>
                        </div>
                      </div>
                      <div className="space-y-6">
                        {section.content.map((item, j) => (
                          <div key={j}>
                            <h3 className="font-semibold text-slate-800 dark:text-slate-200" style={{ fontSize: '0.9375rem', marginBottom: '0.5rem' }}>{item.subtitle}</h3>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-sm">{item.text}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>

              {/* Callout */}
              <div className="mt-10 p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Questions about this policy?{' '}
                  <Link to="/contact" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">Contact our team →</Link>
                  {' '}or email <span className="text-emerald-600 dark:text-emerald-400 font-semibold">privacy@fixora.com</span>
                </p>
              </div>

              {/* End CTA */}
              <div className="rounded-3xl bg-slate-900 dark:bg-slate-950 relative overflow-hidden text-center px-6 py-12 sm:px-12" style={{ marginTop: '2.5rem' }}>
                <div className="absolute -top-24 -left-16 w-64 h-64 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden />
                <div className="absolute -bottom-24 -right-16 w-64 h-64 rounded-full bg-teal-500/15 blur-3xl" aria-hidden />
                <div className="relative z-10">
                  <h3 className="font-heading text-white" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Your data stays yours.</h3>
                  <p className="text-sm text-slate-400 max-w-md mx-auto" style={{ marginBottom: '1.75rem' }}>
                    See how FIXORA protects your information every day, or reach out with any question.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link to="/docs"><Button size="lg">Read the Docs</Button></Link>
                    <Link to="/terms">
                      <Button variant="ghost" size="lg" className="text-slate-300 hover:text-white hover:bg-slate-800">Terms of Service</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </section>

    </div>
  );
}
