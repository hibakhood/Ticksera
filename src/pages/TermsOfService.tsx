import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  FileText, ChevronRight, FileCheck, UserPlus, CreditCard, FileWarning,
  Activity, Copyright, Lock, Power, AlertTriangle, Scale, ShieldCheck, LifeBuoy,
} from 'lucide-react';
import ShaderBackground from '../components/ui/ShaderBackground';
import Button from '../components/ui/Button';

const sections = [
  {
    id: 'acceptance',
    num: '01',
    icon: FileCheck,
    grad: 'from-emerald-500 to-teal-600',
    title: 'Acceptance of Terms',
    content: [
      {
        subtitle: '1.1 Agreement',
        text: 'By accessing or using the TICKSERA platform (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you are using the Service on behalf of a company or organisation, you represent that you have authority to bind that entity to these Terms.',
      },
      {
        subtitle: '1.2 Eligibility',
        text: 'You must be at least 18 years old and capable of forming a legally binding contract to use the Service. By using TICKSERA, you confirm that you meet these requirements.',
      },
      {
        subtitle: '1.3 Modifications',
        text: 'TICKSERA reserves the right to update or modify these Terms at any time. We will provide at least 14 days\' notice of material changes via email or in-app notification. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.',
      },
    ],
  },
  {
    id: 'account',
    num: '02',
    icon: UserPlus,
    grad: 'from-blue-500 to-sky-600',
    title: 'Account Registration & Security',
    content: [
      {
        subtitle: '2.1 Account Creation',
        text: 'You must provide accurate, complete, and current information when registering. You are responsible for maintaining the accuracy of your account information and updating it promptly when it changes.',
      },
      {
        subtitle: '2.2 Account Security',
        text: 'You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You must notify us immediately at security@ticksera.com if you suspect unauthorised access to your account.',
      },
      {
        subtitle: '2.3 One Account Per User',
        text: 'Each individual may hold only one personal account. Creating multiple accounts to circumvent usage limits, suspensions, or plan restrictions is prohibited and may result in all associated accounts being terminated.',
      },
      {
        subtitle: '2.4 Account Sharing',
        text: 'Account credentials are personal and may not be shared with third parties. Business and Enterprise plan subscribers may add authorised team members through the designated company user management feature.',
      },
    ],
  },
  {
    id: 'billing',
    num: '03',
    icon: CreditCard,
    grad: 'from-violet-500 to-purple-600',
    title: 'Subscription Plans & Billing',
    content: [
      {
        subtitle: '3.1 Plan Selection',
        text: 'TICKSERA offers Basic, Professional, Business, and Enterprise subscription plans. The features available to you depend on your selected plan. Plan details, including ticket limits and feature access, are described on our Pricing page and may be updated from time to time.',
      },
      {
        subtitle: '3.2 Billing Cycle',
        text: 'Paid plans are billed monthly or annually as selected at checkout. Subscription fees are charged at the start of each billing period and are non-refundable except as expressly stated in our refund policy.',
      },
      {
        subtitle: '3.3 Automatic Renewal',
        text: 'Subscriptions automatically renew at the end of each billing period unless cancelled before the renewal date. You can cancel or change your plan at any time from the Billing section of your dashboard; changes take effect immediately.',
      },
      {
        subtitle: '3.4 Price Changes',
        text: 'We may change subscription prices with at least 30 days\' notice. Price changes will apply at the next renewal date after the notice period expires. If you do not agree to the new price, you may cancel your subscription before it renews.',
      },
      {
        subtitle: '3.5 Refund Policy',
        text: 'We offer a 7-day money-back guarantee for new paid subscriptions. After this period, subscription fees are non-refundable. Unused portions of a billing period are not refunded upon cancellation.',
      },
      {
        subtitle: '3.6 Failed Payments',
        text: 'If a payment fails, we will retry the charge up to three times over 7 days. If the payment remains unsuccessful, your account may be suspended and access to paid features restricted until the outstanding balance is settled.',
      },
    ],
  },
  {
    id: 'use',
    num: '04',
    icon: FileWarning,
    grad: 'from-amber-500 to-orange-600',
    title: 'Acceptable Use Policy',
    content: [
      {
        subtitle: '4.1 Permitted Use',
        text: 'You may use the Service solely for lawful IT support and helpdesk management purposes as intended by the platform. You agree not to use the Service in any way that violates applicable local, national, or international laws or regulations.',
      },
      {
        subtitle: '4.2 Prohibited Activities',
        text: 'You must not: (a) upload malicious code, viruses, or harmful content; (b) attempt to gain unauthorised access to other accounts or backend systems; (c) use the Service to transmit unsolicited bulk communications; (d) scrape, harvest, or extract data without our express written consent; (e) impersonate any person or entity; or (f) use the Service to facilitate fraudulent activity.',
      },
      {
        subtitle: '4.3 Content Standards',
        text: 'Content you submit through the Service (including ticket descriptions, chat messages, and attachments) must not be unlawful, defamatory, harassing, discriminatory, or infringing upon third-party intellectual property rights.',
      },
      {
        subtitle: '4.4 Fair Use',
        text: 'Unlimited-ticket plans are subject to fair use limits. We reserve the right to contact subscribers whose usage significantly exceeds typical enterprise patterns and to negotiate appropriate custom arrangements.',
      },
    ],
  },
  {
    id: 'sla',
    num: '05',
    icon: Activity,
    grad: 'from-rose-500 to-red-600',
    title: 'Service Availability & SLAs',
    content: [
      {
        subtitle: '5.1 Uptime Commitment',
        text: 'TICKSERA targets 99.9% monthly platform uptime, excluding scheduled maintenance windows. Uptime is calculated as the percentage of minutes in a calendar month during which the core platform features are accessible.',
      },
      {
        subtitle: '5.2 Scheduled Maintenance',
        text: 'We will provide at least 48 hours\' advance notice for planned maintenance windows. We aim to schedule maintenance during off-peak hours to minimise impact on your operations.',
      },
      {
        subtitle: '5.3 Support Response Times',
        text: 'Response time SLAs for support tickets are defined by your subscription plan. TICKSERA commits to making reasonable efforts to meet stated SLA targets but does not guarantee response or resolution times for issues outside our control.',
      },
      {
        subtitle: '5.4 Service Credits',
        text: 'If monthly uptime falls below 99.9%, eligible Professional, Business, and Enterprise subscribers may request a service credit of 5% of the monthly fee for each full percentage point below the threshold, up to a maximum of 30% of that month\'s fee.',
      },
    ],
  },
  {
    id: 'ip',
    num: '06',
    icon: Copyright,
    grad: 'from-cyan-500 to-teal-600',
    title: 'Intellectual Property',
    content: [
      {
        subtitle: '6.1 TICKSERA Ownership',
        text: 'All intellectual property rights in the TICKSERA platform, including software, design, trademarks, logos, and documentation, are owned by TICKSERA Technologies Ltd. Nothing in these Terms grants you any rights in our intellectual property other than the limited licence to use the Service.',
      },
      {
        subtitle: '6.2 Your Content',
        text: 'You retain ownership of all content you submit to the Service. By submitting content, you grant TICKSERA a limited, non-exclusive licence to use, store, and process that content solely to provide and improve the Service.',
      },
      {
        subtitle: '6.3 Feedback',
        text: 'Any feedback, suggestions, or ideas you provide about the Service may be used by TICKSERA without restriction or compensation. Such feedback does not create any intellectual property rights for you.',
      },
    ],
  },
  {
    id: 'privacy',
    num: '07',
    icon: Lock,
    grad: 'from-fuchsia-500 to-purple-600',
    title: 'Privacy & Data Protection',
    content: [
      {
        subtitle: '7.1 Privacy Policy',
        text: 'Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand our data collection, use, and sharing practices.',
      },
      {
        subtitle: '7.2 Data Processing',
        text: 'For Enterprise customers subject to GDPR or similar regulations, TICKSERA will enter into a Data Processing Agreement (DPA) upon request. Contact legal@ticksera.com to initiate this process.',
      },
    ],
  },
  {
    id: 'termination',
    num: '08',
    icon: Power,
    grad: 'from-slate-500 to-slate-700',
    title: 'Termination & Suspension',
    content: [
      {
        subtitle: '8.1 Termination by You',
        text: 'You may cancel your account at any time through the Billing section of your dashboard. Cancellation takes effect immediately upon confirmation.',
      },
      {
        subtitle: '8.2 Termination by TICKSERA',
        text: 'We may suspend or terminate your account immediately, without notice, if you materially breach these Terms, engage in fraudulent activity, fail to pay outstanding fees, or if continued service creates legal or security risks.',
      },
      {
        subtitle: '8.3 Effect of Termination',
        text: 'Upon termination, your right to access the Service ceases immediately. We will retain your data for 30 days post-termination, during which you may request an export. After 30 days, your data will be permanently deleted.',
      },
    ],
  },
  {
    id: 'liability',
    num: '09',
    icon: AlertTriangle,
    grad: 'from-yellow-500 to-amber-600',
    title: 'Limitation of Liability',
    content: [
      {
        subtitle: '9.1 Disclaimer of Warranties',
        text: 'The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied, including fitness for a particular purpose, merchantability, or non-infringement.',
      },
      {
        subtitle: '9.2 Liability Cap',
        text: 'To the maximum extent permitted by law, TICKSERA\'s total cumulative liability to you for any claims arising from or relating to these Terms or the Service shall not exceed the total fees paid by you in the 12 months preceding the claim.',
      },
      {
        subtitle: '9.3 Consequential Damages',
        text: 'TICKSERA shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, even if advised of the possibility of such damages.',
      },
    ],
  },
  {
    id: 'law',
    num: '10',
    icon: Scale,
    grad: 'from-indigo-500 to-blue-600',
    title: 'Governing Law & Disputes',
    content: [
      {
        subtitle: '10.1 Governing Law',
        text: 'These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be subject to the exclusive jurisdiction of the courts of Lagos State, Nigeria.',
      },
      {
        subtitle: '10.2 Dispute Resolution',
        text: 'Before initiating legal proceedings, both parties agree to attempt good-faith resolution of disputes through direct negotiation for at least 30 days. If unresolved, disputes shall be referred to binding arbitration under the rules of the Lagos Court of Arbitration.',
      },
      {
        subtitle: '10.3 Contact for Legal Matters',
        text: 'Legal notices should be sent to: legal@ticksera.com or TICKSERA Technologies Ltd, Legal Department, Lagos, Nigeria.',
      },
    ],
  },
];

const facts = [
  { icon: FileCheck,  title: 'Cancel anytime',     desc: 'Change or end your plan whenever you like, no lock-in.' },
  { icon: Activity,   title: '99.9% uptime',       desc: 'Our target monthly platform availability.' },
  { icon: ShieldCheck, title: '7-day guarantee',   desc: 'Money-back guarantee on new paid subscriptions.' },
  { icon: Scale,      title: 'Lagos law governs',  desc: 'Terms are governed by the laws of the Federal Republic of Nigeria.' },
];

export default function TermsOfService() {
  const [activeId, setActiveId] = useState('acceptance');

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
            <span className="text-slate-300">Terms of Service</span>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide mb-8">
            <FileText className="w-3.5 h-3.5" />
            Legal
          </div>
          <h1 className="font-heading text-white leading-[1.1] tracking-tight text-[clamp(2.125rem,5vw,3.5rem)] font-bold">
            Terms of <span className="text-gradient">Service</span>
          </h1>
          <p className="text-slate-300 leading-relaxed text-[1.0625rem] mt-6 max-w-2xl">
            Please read these Terms of Service carefully before using the TICKSERA platform. These Terms constitute a legally binding agreement between you and TICKSERA Technologies Ltd governing your access to and use of our IT support platform and related services.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-8">
            {[
              { icon: FileCheck,  label: 'Cancel anytime' },
              { icon: ShieldCheck, label: '7-day money-back guarantee' },
              { icon: Activity,    label: '99.9% uptime target' },
              { icon: Scale,       label: 'Lagos law governs' },
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

      {/* Key facts */}
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
                    For legal matters, email legal@ticksera.com.
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
                  Questions about these terms?{' '}
                  <Link to="/contact" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">Contact our team →</Link>
                  {' '}or email <span className="text-emerald-600 dark:text-emerald-400 font-semibold">legal@ticksera.com</span>
                </p>
              </div>

              {/* End CTA */}
              <div className="rounded-3xl bg-slate-900 dark:bg-slate-950 relative overflow-hidden text-center px-6 py-12 sm:px-12" style={{ marginTop: '2.5rem' }}>
                <div className="absolute -top-24 -left-16 w-64 h-64 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden />
                <div className="absolute -bottom-24 -right-16 w-64 h-64 rounded-full bg-teal-500/15 blur-3xl" aria-hidden />
                <div className="relative z-10">
                  <h3 className="font-heading text-white" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>The fine print, minus the friction.</h3>
                  <p className="text-sm text-slate-400 max-w-md mx-auto" style={{ marginBottom: '1.75rem' }}>
                    Read our full Privacy Policy or start using the platform with a plan that fits.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link to="/privacy"><Button size="lg">Privacy Policy</Button></Link>
                    <Link to="/pricing">
                      <Button variant="ghost" size="lg" className="text-slate-300 hover:text-white hover:bg-slate-800">View Pricing</Button>
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
