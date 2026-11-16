import { Link } from 'react-router-dom';
import {
  ArrowRight, Shield, Zap, Users, CheckCircle,
  Monitor, Wifi, Printer, Camera, Server, Globe, Star, ChevronRight,
  Hotel, GraduationCap, HeartPulse, Truck, Factory, Home, Landmark, Store,
  Route,
  UserPlus, GitBranch, Sparkles, UserCheck, MessageSquare, BadgeCheck, Plus, Play, Bot, Timer, Wrench
} from 'lucide-react';
import { useStore } from '../store';
import Button from '../components/ui/Button';

const services = [
  { icon: Monitor,  title: 'Computer Repair',  desc: 'Hardware diagnostics, OS recovery, data backup, and full system performance tuning.' },
  { icon: Wifi,     title: 'Networking',        desc: 'WiFi setup, LAN/WAN configuration, VPN deployment, and network security audits.' },
  { icon: Printer,  title: 'Printer Support',   desc: 'Installation, driver updates, network printing configuration, and preventive maintenance.' },
  { icon: Camera,   title: 'CCTV & Security',   desc: 'IP camera installation, DVR/NVR setup, remote access, and system monitoring.' },
  { icon: Server,   title: 'Server Support',    desc: 'Server setup, monitoring, backup solutions, and disaster recovery planning.' },
  { icon: Globe,    title: 'Internet & ISP',    desc: 'Connectivity troubleshooting, ISP coordination, and speed optimization.' },
];

const stats = [
  { value: '99.9%', label: 'Uptime SLA',        desc: 'Guaranteed' },
  { value: '15k+',  label: 'Tickets Resolved',  desc: 'And counting' },
  { value: '< 15m', label: 'Critical Response', desc: 'Fastest SLA tier' },
  { value: '4.9 ★', label: 'Customer Rating',   desc: 'From 2,000+ reviews' },
];

const trustedBy = ['TechVentures', 'GlobeCorp', 'StartupHub', 'Medix Care', 'Nova Bank', 'Apex Logistics'];

const features = [
  { icon: Bot,    grad: 'from-emerald-500 to-teal-600',   title: 'AI Self-Service Triage',   desc: 'The TICKSERA BOT answers instantly with step-by-step fixes and resolves many issues before a human ever gets involved.' },
  { icon: Timer,  grad: 'from-orange-500 to-amber-600',   title: 'Guaranteed SLAs',          desc: 'A 15-minute critical response, enforced with live countdowns and automatic escalation before any breach.' },
  { icon: Route,  grad: 'from-violet-500 to-purple-600',  title: 'Zero-Triage Routing',      desc: 'Our guided wizard captures the exact industry, product, and symptom, so every ticket reaches the right specialist the first time.' },
  { icon: Wrench, grad: 'from-sky-500 to-blue-600',       title: 'On-Site & Remote Support', desc: 'Not every problem fits in a chat. Book a technician to your office or connect remotely, same ticket, same SLA.' },
  { icon: Users,  grad: 'from-rose-500 to-pink-600',      title: 'Industry Experts',         desc: 'Certified technicians trained on the systems your sector runs on, from hotel PMS and hospital EMR to POS and logistics.' },
  { icon: Shield, grad: 'from-slate-500 to-slate-700',    title: 'Enterprise-Grade Security', desc: 'SOC 2 compliant, end-to-end encrypted, with role-based access and a full audit trail on every ticket.' },
];

const slaLevels = [
  { dot: 'bg-red-500',    label: 'Critical', time: '15 min', desc: 'System down, full business impact' },
  { dot: 'bg-orange-500', label: 'High',     time: '60 min', desc: 'Major issue affecting productivity' },
  { dot: 'bg-amber-400',  label: 'Medium',   time: '3 hrs',  desc: 'Partial disruption, workaround exists' },
  { dot: 'bg-green-500',  label: 'Low',      time: '5 hrs',  desc: 'Minor inconvenience, not urgent' },
];

const industries = [
  { icon: Hotel,         label: 'Hotel & Hospitality', focus: 'PMS · Guest WiFi · POS · CCTV',           tile: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
  { icon: GraduationCap, label: 'School & University', focus: 'LMS · Smart Boards · Student Portals',     tile: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' },
  { icon: HeartPulse,    label: 'Hospital & Clinic',   focus: 'EMR/EHR · Medical PCs · Lab Systems',      tile: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' },
  { icon: Truck,         label: 'Logistics',            focus: 'Fleet Tracking · Barcode · Mobile Apps',   tile: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' },
  { icon: Factory,       label: 'Manufacturing',        focus: 'PLC · SCADA · Industrial PCs',             tile: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' },
  { icon: Home,          label: 'Real Estate',          focus: 'Property Portals · CCTV · Smart Office',   tile: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' },
  { icon: Landmark,      label: 'Finance & Banking',    focus: 'Core Banking · POS · ATM · VPN',           tile: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' },
  { icon: Store,         label: 'SME / Retail',         focus: 'POS Systems · Inventory · WiFi',           tile: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' },
];

const steps = [
  {
    n: '01', icon: UserPlus,      badge: 'Free Sign‑Up',
    accent: 'bg-emerald-500',     ring: 'ring-emerald-500/20',
    title: 'Create Your Account',
    desc: 'Sign up free in under a minute, no credit card required. Choose Personal or Business and pick the plan that fits your needs.',
  },
  {
    n: '02', icon: GitBranch,     badge: 'Guided Wizard',
    accent: 'bg-violet-500',      ring: 'ring-violet-500/20',
    title: 'Describe the Issue',
    desc: 'Answer six guided questions: Client Type, Industry, Category, Product, Symptom, Priority. Our wizard pre-fills your ticket form so nothing gets lost in translation.',
  },
  {
    n: '03', icon: Sparkles,      badge: 'AI Triage',
    accent: 'bg-sky-500',         ring: 'ring-sky-500/20',
    title: 'Instant Self‑Service',
    desc: 'Our TICKSERA BOT analyzes your issue in real time and walks you through step‑by‑step fixes. Resolve it yourself on the spot, or escalate to a live technician in one click.',
  },
  {
    n: '04', icon: UserCheck,     badge: 'Smart Assignment',
    accent: 'bg-blue-500',        ring: 'ring-blue-500/20',
    title: 'Specialist Takes Over',
    desc: 'Escalated tickets land in the support queue and are picked up by a certified technician who specializes in your industry and product. No manual triage, no wrong queue.',
  },
  {
    n: '05', icon: MessageSquare, badge: 'Live Support',
    accent: 'bg-rose-500',        ring: 'ring-rose-500/20',
    title: 'SLA & Live Chat',
    desc: 'A live SLA countdown tracks your guaranteed response time: 15 min for critical, up to 5 hr for low priority. Chat with your technician inside the ticket, or book an on‑site / remote session.',
  },
  {
    n: '06', icon: BadgeCheck,    badge: 'Resolution',
    accent: 'bg-teal-500',        ring: 'ring-teal-500/20',
    title: 'Resolve, Rate & Close',
    desc: 'Once the issue is fixed, you confirm the resolution and rate the experience. The ticket closes with a full audit trail for compliance and reporting.',
  },
];

const testimonials = [
  { name: 'Adebayo Ogundimu', role: 'CTO, TechVentures',        initial: 'A', text: 'TICKSERA transformed our IT operations completely. Response times dropped by 80% and our team hasn\'t looked back since.' },
  { name: 'Fatima Al-Hassan',  role: 'IT Director, GlobeCorp',   initial: 'F', text: 'The SLA tracking and ticket workflows are genuinely game-changing. Best helpdesk platform we\'ve ever deployed.' },
  { name: 'Chen Wei',          role: 'Ops Manager, StartupHub',  initial: 'C', text: 'From ticket creation to final resolution, everything is seamless. The live chat feature alone saves us hours every day.' },
];

const plans = [
  { name: 'Basic',        price: '₦5,000',  period: '/ month', features: ['Customer dashboard', '5 tickets / month', 'Ticket tracking', 'Remote assistance', 'Basic analytics'] },
  { name: 'Professional', price: '₦15,000', period: '/ month', features: ['Unlimited tickets', 'Live chat', 'Priority support', 'Unlimited bookings', 'Full knowledge base'], popular: true },
  { name: 'Business',     price: '₦50,000', period: '/ month', features: ['Everything in Professional', 'Up to 15 team members', 'High-priority support', 'Dedicated manager'] },
  { name: 'Enterprise',   price: 'Custom',  period: '',         features: ['Unlimited users & teams', 'On-site support', 'Dedicated account manager', '24/7 priority support', 'Custom workflows'] },
];

function SectionLabel({ children }: { children: string }) {
  return (
    <span className="inline-block text-xs font-semibold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-3">
      {children}
    </span>
  );
}

function SectionHeader({ label, title, sub }: { label: string; title: string; sub: string }) {
  return (
    <div className="s-header text-center">
      <SectionLabel>{label}</SectionLabel>
      <h2 className="font-heading text-slate-900 dark:text-white text-3xl sm:text-4xl font-bold">{title}</h2>
      <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto text-[0.9375rem] leading-relaxed">{sub}</p>
    </div>
  );
}

export default function Landing() {
  const { currentUser } = useStore();
  const primaryCta = currentUser ? 'Go to Dashboard' : 'Get Started Free';
  const primaryTo = currentUser ? '/dashboard' : '/login';

  return (
    <div className="bg-white dark:bg-dark-bg">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/80 via-white to-white dark:from-dark-bg dark:via-dark-bg dark:to-dark-bg">
        {/* Soft decorative wash */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 -left-40 w-[34rem] h-[34rem] bg-brand-200/50 dark:bg-brand-500/10 rounded-full blur-3xl" />
          <div className="absolute top-20 -right-44 w-[30rem] h-[30rem] bg-amber-200/40 dark:bg-amber-500/10 rounded-full blur-3xl" />
        </div>

        <div className="s-hero s-inner relative z-10 max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-14 lg:gap-12">

            {/* Left: text content */}
            <div className="flex-shrink-0 lg:w-[47%] text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-brand-200 shadow-sm text-brand-700 dark:bg-brand-500/10 dark:border-brand-500/20 dark:text-brand-300 text-xs font-semibold tracking-wide mb-8">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> AI-Powered IT Support
              </div>
              <h1 className="font-heading leading-[1.02] tracking-tight text-[clamp(2.75rem,6.5vw,4.5rem)] font-extrabold text-slate-900 dark:text-white">
                <span className="text-brand-700 dark:text-brand-400">Fix IT.</span><br />
                <span className="text-amber-500">Faster.</span>
              </h1>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[1.0625rem] mt-6 max-w-xl mx-auto lg:mx-0">
                Get instant help, solve technical problems, and access expert resources with TICKSERA — your smart AI-powered IT support assistant.
              </p>
              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 mt-9">
                <Link to={primaryTo}>
                  <Button size="lg" className="px-8 rounded-full shadow-lg shadow-brand-500/25 w-full sm:w-auto">
                    Start for Free <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/docs" className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-2 py-3 rounded-full text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-brand-700 dark:hover:text-brand-400 transition-colors group">
                  <span className="w-9 h-9 rounded-full bg-white border border-slate-200 dark:bg-white/10 dark:border-white/10 shadow-sm flex items-center justify-center group-hover:border-brand-300 group-hover:bg-brand-50 dark:group-hover:bg-brand-500/10 transition-colors">
                    <Play className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 fill-brand-600 dark:fill-brand-400 ml-0.5" />
                  </span>
                  Watch Demo
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 mt-8">
                {['AI Troubleshooting', 'Expert Guides', 'Track Support Tickets'].map(t => (
                  <span key={t} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                    <CheckCircle className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: AI assistant photo composition */}
            <div className="flex-1 relative w-full max-w-md sm:max-w-lg mx-auto lg:max-w-none">
              <div className="absolute inset-0 -bottom-8 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="relative rounded-[2rem] overflow-hidden shadow-2xl shadow-brand-900/25 ring-1 ring-slate-900/10">
                {/* Image source: crop of the man-with-AI-circuitry art from our own
                    "Ticksera AI Support Hero" template asset (not a stock photo) */}
                <img
                  src="/hero-photo.jpg"
                  alt="Person with glowing AI circuitry and the TICKSERA chip — the TICKSERA AI assistant at work"
                  className="w-full h-[420px] sm:h-[500px] object-cover object-top"
                  loading="eager"
                />
                {/* Subtle grounding gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-950/25 via-transparent to-transparent pointer-events-none" />
                {/* Dim slightly in dark mode so the bright image doesn't glare */}
                <div className="hidden dark:block absolute inset-0 bg-dark-bg/40 pointer-events-none" />
              </div>

              {/* Floating: TICKSERA AI chat card */}
              <div className="absolute left-3 right-3 sm:left-6 sm:right-auto sm:w-60 -bottom-7 bg-white/95 backdrop-blur border border-brand-100 shadow-xl rounded-2xl p-3.5" aria-hidden="true">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-brand-500/30">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-900 leading-none truncate">Hello! I'm TICKSERA AI</p>
                    <p className="text-[9px] text-brand-600 font-medium mt-0.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse flex-shrink-0" /> Online
                    </p>
                  </div>
                </div>
                <div className="rounded-xl bg-brand-50 text-[10px] text-slate-600 leading-relaxed px-2.5 py-2 mb-2">
                  How can I help you today? Describe your issue and I'll walk you through the fix, step by step.
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white pl-3 pr-1 py-1">
                  <span className="text-[10px] text-slate-400 flex-1">Type your issue…</span>
                  <span className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="w-2.5 h-2.5 text-white" />
                  </span>
                </div>
              </div>

              {/* Floating: Quick Actions card */}
              <div className="hidden sm:block absolute -left-8 top-1/4 w-44 bg-white/95 backdrop-blur border border-brand-100 shadow-xl rounded-2xl p-3" aria-hidden="true">
                <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wider mb-2">Quick Actions</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { icon: Wifi,    label: 'Network' },
                    { icon: Monitor, label: 'Computer' },
                    { icon: Wrench,  label: 'Software' },
                    { icon: Globe,   label: 'Email' },
                    { icon: Printer, label: 'Printer' },
                    { icon: Plus,    label: 'More Tools' },
                  ].map(a => (
                    <div key={a.label} className="rounded-lg bg-brand-50 flex flex-col items-center gap-1 py-2 px-1">
                      <a.icon className="w-3.5 h-3.5 text-brand-600" />
                      <span className="text-[8px] font-medium text-slate-600 leading-none text-center">{a.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Trusted-by strip */}
          <div className="mt-16 sm:mt-20 pt-8 border-t border-brand-200/70 dark:border-dark-border">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-6">
              Trusted by 500+ support teams
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {trustedBy.map(name => (
                <span key={name} className="font-heading text-lg font-bold text-slate-300 hover:text-slate-400 transition-colors">
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="bg-white border-t border-brand-100 dark:bg-dark-bg dark:border-dark-border">
        <div className="s-sm s-inner max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-10">
            {stats.map((s, i) => (
              <div key={i} className={`text-center lg:py-2 ${i > 0 ? 'lg:border-l lg:border-brand-100 dark:lg:border-dark-border' : ''}`}>
                <div className="font-heading font-bold leading-none text-[clamp(1.875rem,4vw,2.5rem)] text-gradient">{s.value}</div>
                <div className="font-semibold text-slate-900 dark:text-white mt-2.5 text-sm">{s.label}</div>
                <div className="text-slate-400 mt-1 text-xs">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Industries We Serve ── */}
      <section className="s-section bg-white dark:bg-dark-bg">
        <div className="s-inner max-w-7xl mx-auto">
          <SectionHeader
            label="Industries We Serve"
            title="Built for Your Sector"
            sub="Our technicians are trained in the specific systems your industry depends on, from hospital EMR software to hotel PMS and logistics tracking."
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {industries.map((ind, i) => {
              const Icon = ind.icon;
              return (
                <div key={i} className="card-premium group bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5 hover:border-emerald-400 dark:hover:border-emerald-600">
                  <div className={`w-10 h-10 rounded-xl ${ind.tile} flex items-center justify-center mb-3.5 group-hover:scale-105 transition-transform duration-300`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm mb-1.5">{ind.label}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{ind.focus}</p>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-8">
            <Link to="/services" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors">
              Browse services by industry <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── SLA Response Times ── */}
      <section className="s-section bg-slate-50 dark:bg-dark-bg/60">
        <div className="s-inner max-w-7xl mx-auto">
          <SectionHeader
            label="Response Guarantee"
            title="Guaranteed Response Times"
            sub="Every ticket carries a binding SLA, enforced with a live countdown and automatic escalation before any breach."
          />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {slaLevels.map((s, i) => (
              <div key={i} className="card-premium relative bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-6 text-center overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1 ${s.dot}`} />
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">{s.label}</span>
                </div>
                <div className="font-heading text-3xl font-bold text-slate-900 dark:text-white leading-none">{s.time}</div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-2">Guaranteed response</div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            SLA timers start the moment you submit. Included with Professional and Enterprise plans.
          </p>
        </div>
      </section>

      {/* ── Services ── */}
      <section className="s-section bg-white dark:bg-dark-bg">
        <div className="s-inner max-w-7xl mx-auto">
          <SectionHeader
            label="What We Do"
            title="Our Services"
            sub="Hardware, Software, Networking, Security, and User Access, across personal and business clients in every industry."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((s, i) => (
              <div key={i} className="card-premium group bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl hover:border-emerald-400 dark:hover:border-emerald-600 p-7">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center group-hover:bg-emerald-500 transition-colors duration-300 mb-5">
                  <s.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="font-heading font-bold text-slate-900 dark:text-white mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/services" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors">
              See all 18 services with full details <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="s-section bg-slate-50 dark:bg-dark-bg/60">
        <div className="s-inner max-w-7xl mx-auto">
          <SectionHeader
            label="Why TICKSERA"
            title="The Ticksera Difference"
            sub="We're not another helpdesk queue. Ticksera pairs AI self-service with guaranteed SLAs, industry specialists, and support that comes to you."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={i} className="card-premium group bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-7">
                <div className={`chip-icon w-11 h-11 rounded-xl bg-gradient-to-br ${f.grad} shadow-lg mb-5 group-hover:scale-105 transition-transform duration-300`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-heading font-bold text-slate-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="s-section bg-brand-50/70 dark:bg-dark-bg/60 relative overflow-hidden">
        {/* Background glow blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-300/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl" />
        </div>

        <div className="s-inner max-w-7xl mx-auto relative">
          <div className="s-header text-center">
            <span className="inline-block text-xs font-semibold tracking-widest text-brand-600 dark:text-brand-400 uppercase mb-3">
              The Process
            </span>
            <h2 className="font-heading text-slate-900 dark:text-white text-3xl sm:text-4xl font-bold">
              How TICKSERA Works
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto mt-3 text-[0.9375rem] leading-relaxed">
              From your first click to a verified resolution: every step maps to a real TICKSERA feature, from AI self-service triage to live technician support.
            </p>
          </div>

          {/* Step grid: 3 cols × 2 rows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-brand-200/70 dark:bg-dark-border rounded-2xl overflow-hidden border border-brand-200/70 dark:border-dark-border">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isLastInRow = (i + 1) % 3 === 0;
              return (
                <div
                  key={i}
                  className="relative bg-white dark:bg-dark-card group hover:bg-brand-50/60 dark:hover:bg-dark-card transition-colors duration-300 p-8"
                >
                  <div className="absolute top-4 right-5 font-heading font-black text-brand-100 dark:text-slate-800 select-none leading-none text-[3.5rem]">
                    {s.n}
                  </div>

                  <div className={`w-12 h-12 rounded-xl ${s.accent} flex items-center justify-center shadow-lg ring-4 ${s.ring} group-hover:scale-105 transition-transform duration-300 mb-5`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  <div className="mb-2.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${s.accent} text-white`}>
                      {s.badge}
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-slate-900 dark:text-white text-base mb-2">
                    {s.title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 leading-relaxed text-[0.8125rem]">
                    {s.desc}
                  </p>

                  {!isLastInRow && (
                    <div className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-brand-200 shadow-sm items-center justify-center">
                      <ArrowRight className="w-3.5 h-3.5 text-brand-500" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <Link to={primaryTo}>
              <Button size="lg" className="px-8 shadow-lg shadow-emerald-500/20">
                Start With the Wizard <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <p className="text-slate-500 text-xs mt-3.5">
              Starts at ₦5,000/month · No credit card · Set up in 5 minutes
            </p>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="s-section bg-slate-50 dark:bg-dark-bg/60">
        <div className="s-inner max-w-7xl mx-auto">
          <SectionHeader
            label="Customer Stories"
            title="Trusted Worldwide"
            sub="Thousands of businesses rely on TICKSERA every day to keep their IT running smoothly."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <div key={i} className="card-premium bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl flex flex-col p-7">
                <div className="flex gap-1 mb-5">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed flex-1 text-[0.9375rem]">"{t.text}"</p>
                <div className="flex items-center gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {t.initial}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{t.name}</p>
                    <p className="text-xs text-slate-400 truncate">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="s-section bg-white dark:bg-dark-bg">
        <div className="s-inner max-w-7xl mx-auto">
          <SectionHeader
            label="Pricing"
            title="Simple, Transparent Plans"
            sub="Upgrade or downgrade anytime. No hidden fees."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
            {plans.map((p, i) => (
              <div
                key={i}
                className={`card-premium relative bg-white dark:bg-dark-card rounded-2xl flex flex-col ${
                  p.popular
                    ? 'border-2 border-emerald-500 shadow-xl shadow-emerald-500/10'
                    : 'border border-slate-200 dark:border-dark-border'
                } p-7`}
              >
                {p.popular && (
                  <div className="absolute left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-md -top-3.5 whitespace-nowrap">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-heading font-bold text-slate-900 dark:text-white mb-3">{p.name}</h3>
                  <div className="flex items-end gap-1">
                    <span className="font-heading text-slate-900 dark:text-white text-[1.875rem] font-bold">{p.price}</span>
                    <span className="text-slate-400 text-sm mb-1">{p.period}</span>
                  </div>
                </div>
                <ul className="flex-1 mb-7">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400 mb-2.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to={currentUser ? '/plan' : '/login'}>
                  <Button variant={p.popular ? 'primary' : 'outline'} size="sm" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-400 mt-8">
            Need a custom plan?{' '}
            <Link to="/contact" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
              Contact sales →
            </Link>
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="s-sm s-inner max-w-4xl mx-auto">
        <div className="relative bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 rounded-3xl overflow-hidden text-center px-6 sm:px-10 py-12 sm:py-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-amber-400/20 rounded-full blur-3xl" />
          </div>
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-brand-50 text-xs font-semibold tracking-wide mb-6">
              <Zap className="w-3.5 h-3.5 text-amber-300" /> Start in minutes
            </div>
            <h2 className="font-heading text-white text-3xl sm:text-4xl font-bold mb-4">
              Ready to Fix Your IT <span className="text-amber-300">Faster?</span>
            </h2>
            <p className="text-brand-100/85 text-[1.0625rem] max-w-xl mx-auto mb-10">
              Join thousands of businesses that trust TICKSERA to keep their technology running smoothly, with guaranteed SLA response times and smart technician routing.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to={primaryTo} className="w-full sm:w-auto">
                <Button size="lg" className="px-8 shadow-lg shadow-emerald-500/30 w-full sm:w-auto">
                  {primaryCta} <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/contact" className="w-full sm:w-auto">
                <Button variant="ghost" size="lg" className="px-8 w-full sm:w-auto text-brand-100 hover:text-white hover:bg-white/10">
                  Talk to Sales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
