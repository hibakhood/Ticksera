import { Target, Eye, Shield, Zap, Heart, Users, BadgeCheck, Sparkles, Clock, MapPin, Plus } from 'lucide-react';
import ShaderBackground from '../components/ui/ShaderBackground';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

const values = [
  { icon: Shield, title: 'Reliability', desc: 'Consistent, dependable service you can count on every time.', grad: 'from-emerald-500 to-teal-600' },
  { icon: Zap,    title: 'Speed',       desc: 'Fast response and resolution is our relentless focus.',        grad: 'from-amber-500 to-orange-600' },
  { icon: Heart,  title: 'Care',        desc: 'Every issue is treated with urgency and genuine attention.',    grad: 'from-rose-500 to-red-600' },
  { icon: Users,  title: 'Teamwork',    desc: 'Collaboration and deep expertise power our support model.',     grad: 'from-blue-500 to-sky-600' },
];

const milestones = [
  { year: '2020', title: 'Founded in Lagos', desc: 'A small team of technicians starts fixing office IT that everyone else ignored.' },
  { year: '2022', title: 'FIXORA Platform Launches', desc: 'Guided ticket routing goes live — every request captured and dispatched in minutes.' },
  { year: '2023', title: 'AI Triage Introduced', desc: 'AI-assisted diagnostics and smart routing on every ticket, cutting triage time to zero.' },
  { year: '2024', title: 'SLA Guarantees', desc: 'Binding response targets with live countdowns and automatic escalation.' },
  { year: '2025', title: 'Enterprise Scale', desc: '500+ enterprise clients across hospitality, healthcare, finance, and manufacturing.' },
  { year: '2026', title: '15,000+ Tickets Resolved', desc: 'A 99.9% uptime SLA and a support model built for all of Africa.' },
];

const team = [
  { name: 'Ibrahim O. Akande', role: 'Founder & CEO',   initial: 'I', grad: 'from-emerald-500 to-teal-600' },
  { name: 'Paul Ilesanmi',     role: 'CTO',             initial: 'P', grad: 'from-blue-500 to-sky-600' },
  { name: 'Femi Omoniyi',      role: 'Head of Support', initial: 'F', grad: 'from-violet-500 to-purple-600' },
  { name: 'Akeem Amusat',      role: 'Lead Engineer',   initial: 'A', grad: 'from-amber-500 to-orange-600' },
];

const stats = [
  { value: '2020',  label: 'Founded' },
  { value: '500+',  label: 'Enterprise Clients' },
  { value: '15k+',  label: 'Tickets Resolved' },
  { value: '99.9%', label: 'Uptime SLA' },
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

export default function About() {
  return (
    <div className="bg-white dark:bg-dark-bg">

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-grid pointer-events-none" />
        <ShaderBackground />
        <div className="s-hero s-inner relative z-10 max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide mb-8">
            Our Story
          </div>
          <h1 className="font-heading text-white leading-[1.1] tracking-tight text-[clamp(2.125rem,5vw,3.5rem)] font-bold">
            Built to Fix IT, <span className="text-gradient">Fast</span>
          </h1>
          <p className="text-slate-300 leading-relaxed text-[1.0625rem] mt-6 max-w-2xl mx-auto">
            FIXORA was founded with a single mission: make enterprise IT support fast, transparent, and stress-free. We combine smart technology with experienced technicians to deliver support that actually works.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {[
              { icon: BadgeCheck, label: 'SOC 2 aligned' },
              { icon: Sparkles,   label: 'AI-powered triage' },
              { icon: Clock,      label: 'SLA guarantees' },
              { icon: MapPin,     label: 'Remote & on-site' },
            ].map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-slate-200">
                <t.icon className="w-3.5 h-3.5 text-emerald-400" />
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="s-section bg-white dark:bg-dark-bg">
        <div className="s-inner max-w-6xl mx-auto">
          <SectionHeader
            label="Who We Are"
            title="Technology Should Empower, Not Slow You Down"
            sub="Two ideas drive everything we build at FIXORA."
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[
              { icon: Target, label: 'Our Mission', grad: 'from-emerald-500 to-teal-600', text: 'We believe technology should empower businesses, not slow them down. Our mission is to eliminate IT friction with fast, reliable, transparent support — backed by binding SLAs and expert technicians your team can trust.' },
              { icon: Eye,    label: 'Our Vision',  grad: 'from-sky-500 to-indigo-600',   text: 'We want to become Africa\'s most trusted IT support platform — where any business, from a three-person startup to a nationwide enterprise, can resolve IT issues in minutes, not days.' },
            ].map((m, i) => (
              <div key={i} className="card-premium group bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-8">
                <div className={`chip-icon bg-gradient-to-br ${m.grad} shadow-lg mb-6 group-hover:scale-105 transition-transform duration-300`}>
                  <m.icon className="w-5 h-5" />
                </div>
                <h3 className="font-heading font-bold text-lg text-slate-900 dark:text-white mb-3">{m.label}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{m.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="s-section bg-slate-900 dark:bg-slate-950">
        <div className="s-inner max-w-6xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {stats.map((s, i) => (
              <div key={i} className={`text-center py-4 ${i > 0 ? 'lg:border-l lg:border-white/10' : ''}`}>
                <div className="font-heading text-gradient text-3xl sm:text-4xl font-bold mb-1.5">{s.value}</div>
                <div className="text-[11px] uppercase tracking-widest text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="s-section bg-slate-50 dark:bg-dark-bg/50">
        <div className="s-inner max-w-6xl mx-auto">
          <SectionHeader
            label="Our Values"
            title="The Principles That Guide Every Interaction"
            sub="Four commitments we bring to every ticket, every technician, and every client."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((v, i) => (
              <div key={i} className="card-premium group bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-7">
                <div className={`chip-icon bg-gradient-to-br ${v.grad} shadow-lg mb-5 group-hover:scale-105 transition-transform duration-300`}>
                  <v.icon className="w-5 h-5" />
                </div>
                <h3 className="font-heading font-bold text-slate-900 dark:text-white mb-2">{v.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey */}
      <section className="s-section bg-white dark:bg-dark-bg">
        <div className="s-inner max-w-3xl mx-auto">
          <SectionHeader
            label="Our Journey"
            title="From a Small Team to a Support Platform"
            sub="A few milestones that shaped how FIXORA works today."
          />
          <div className="relative" style={{ paddingLeft: '2rem' }}>
            <div className="absolute left-[7px] top-1 bottom-1 w-px bg-slate-200 dark:bg-dark-border" aria-hidden />
            {milestones.map((m, i) => (
              <div key={i} className={`relative ${i < milestones.length - 1 ? 'pb-9' : ''}`}>
                <span className="absolute -left-8 top-1 w-4 h-4 rounded-full border-4 border-white dark:border-dark-bg bg-emerald-500 shadow" aria-hidden />
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{m.year}</span>
                <h3 className="font-heading font-bold text-slate-900 dark:text-white text-sm mt-1">{m.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="s-section bg-slate-50 dark:bg-dark-bg/50">
        <div className="s-inner max-w-6xl mx-auto">
          <SectionHeader
            label="Meet the Team"
            title="The People Driving FIXORA's Mission Forward"
            sub="Engineers, technicians, and support specialists — working together to keep you running."
          />
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
            {team.map((member, i) => (
              <div key={i} className="card-premium group bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl text-center p-6">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${member.grad} flex items-center justify-center text-white text-xl font-bold mx-auto mb-4 shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                  {member.initial}
                </div>
                <h3 className="font-heading font-semibold text-slate-900 dark:text-white text-sm">{member.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{member.role}</p>
              </div>
            ))}
            <div className="card-premium group bg-white dark:bg-dark-card border border-dashed border-slate-300 dark:border-dark-border rounded-2xl flex flex-col items-center justify-center text-center p-6 hover:border-emerald-400 dark:hover:border-emerald-700 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors">
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-dark-border flex items-center justify-center mb-4 group-hover:bg-emerald-500 group-hover:border-emerald-500 transition-colors">
                <Plus className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-heading font-semibold text-slate-900 dark:text-white text-sm">Join Our Team</h3>
              <p className="text-xs text-slate-400 mt-1">We're always hiring great people.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="s-section bg-white dark:bg-dark-bg">
        <div className="s-inner max-w-5xl mx-auto">
          <div className="rounded-3xl bg-slate-900 dark:bg-slate-950 relative overflow-hidden text-center px-6 py-12 sm:px-12">
            <div className="absolute -top-24 -left-16 w-64 h-64 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden />
            <div className="absolute -bottom-24 -right-16 w-64 h-64 rounded-full bg-teal-500/15 blur-3xl" aria-hidden />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20" style={{ marginBottom: '1rem' }}>
                Let's work together
              </div>
              <h3 className="font-heading text-white" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>Ready to fix IT for good?</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto" style={{ marginBottom: '1.75rem' }}>
                Join 500+ businesses that resolve IT issues in minutes — not days.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/login"><Button size="lg">Get Started Free</Button></Link>
                <Link to="/contact">
                  <Button variant="ghost" size="lg" className="text-slate-300 hover:text-white hover:bg-slate-800">Contact Us</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
