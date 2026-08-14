import { useState } from 'react';
import ShaderBackground from '../components/ui/ShaderBackground';
import { Mail, Phone, MapPin, CheckCircle, Send, Clock, MessageCircle, BadgeCheck, BookOpen, ArrowRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { TextArea } from '../components/ui/Input';
import { useStore } from '../store';

const channels = [
  { icon: Mail,    label: 'Email',    value: 'support@ticksera.com', sub: 'For support and general inquiries', grad: 'from-emerald-500 to-teal-600' },
  { icon: Phone,   label: 'Phone',    value: '+234 800 FIX ORA',    sub: 'Mon - Fri, 8am - 6pm WAT',          grad: 'from-blue-500 to-sky-600' },
  { icon: MapPin,  label: 'Location', value: 'Lagos, Nigeria',      sub: 'Head office & on-site dispatch',    grad: 'from-violet-500 to-purple-600' },
];

const quickFaqs = [
  { q: 'What happens after I send a message?', a: 'Our support team reviews your inquiry and replies within 24 hours. Urgent issues are routed straight to a technician for faster handling.' },
  { q: 'How do I report an urgent IT issue?', a: "For immediate help, don't wait for email, log in and open a ticket. Critical issues carry a 15-minute response SLA and are escalated automatically." },
  { q: 'Can I talk to sales about a custom plan?', a: "Yes. Use the form below and mention 'sales' in the subject, and our team will put together a plan tailored to your organisation." },
  { q: 'Do you provide support outside Lagos?', a: 'Remote support is available nationwide, and on-site visits are scheduled around your location. See our Services page for everything we cover.' },
];

export default function Contact() {
  const { addContactMessage } = useStore();
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) return;
    const { website, ...msg } = form;
    addContactMessage({ ...msg, website });
    setSent(true);
    setForm({ name: '', email: '', subject: '', message: '', website: '' });
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className="bg-white dark:bg-dark-bg">

      {/* Hero */}
      <section className="relative overflow-hidden bg-white dark:bg-slate-900">
        <div className="absolute inset-0 bg-grid pointer-events-none" />
        <ShaderBackground />
        <div className="s-hero s-inner relative z-10 max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wide mb-8">
            <MessageCircle className="w-3.5 h-3.5" />
            Get in Touch
          </div>
          <h1 className="font-heading text-slate-900 dark:text-white leading-[1.1] tracking-tight text-[clamp(2.125rem,5vw,3.5rem)] font-bold">
            Contact <span className="text-gradient">Us</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[1.0625rem] mt-6 max-w-2xl mx-auto">
            We'd love to hear from you. Send us a message and we'll respond shortly.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {[
              { icon: MessageCircle, label: 'Replies within 24 hours' },
              { icon: Clock,         label: 'Mon-Fri, 8am-6pm WAT' },
              { icon: BadgeCheck,    label: 'SOC 2 aligned' },
            ].map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 dark:bg-white/10 dark:border-white/15 dark:text-slate-200">
                <t.icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Contact body */}
      <section className="s-section bg-white dark:bg-dark-bg">
        <div className="s-inner max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">

            {/* Info */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="s-header" style={{ marginBottom: '0.25rem' }}>
                <span className="inline-block text-xs font-semibold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-3">Contact Information</span>
                <h2 className="font-heading text-slate-900 dark:text-white text-2xl font-bold">Reach us through any of these channels</h2>
              </div>

              {channels.map((c, i) => (
                <div key={i} className="card-premium group bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5 flex items-start gap-4">
                  <div className={`chip-icon bg-gradient-to-br ${c.grad} shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                    <c.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">{c.label}</p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{c.value}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{c.sub}</p>
                  </div>
                </div>
              ))}

              <div className="card-premium group bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl p-5">
                <div className="flex items-center gap-3" style={{ marginBottom: '0.5rem' }}>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Business Hours</p>
                </div>
                <div className="space-y-1" style={{ paddingLeft: '3rem' }}>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Monday - Friday: 8am - 6pm WAT</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Saturday: 9am - 3pm WAT</p>
                </div>
              </div>

              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 p-5 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                  Every inquiry gets a reply within 24 hours; urgent tickets are escalated to a technician immediately.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3">
                <Link to="/faq" className="flex-1">
                  <Button variant="ghost" className="w-full justify-center border border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <BookOpen className="w-4 h-4" /> Browse the FAQ
                  </Button>
                </Link>
                <Link to="/docs" className="flex-1">
                  <Button variant="ghost" className="w-full justify-center border border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <BookOpen className="w-4 h-4" /> Read the Docs
                  </Button>
                </Link>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-3">
              <div className="premium-surface relative bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl overflow-hidden" style={{ padding: '2rem' }}>
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
                {sent ? (
                  <div className="animate-fade-in text-center" style={{ padding: '3rem 0' }}>
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-lg" style={{ marginBottom: '1.25rem' }}>
                      <CheckCircle className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-heading font-bold text-slate-900 dark:text-white text-lg" style={{ marginBottom: '0.375rem' }}>Message Sent!</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">We'll get back to you within 24 hours.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                      <h3 className="font-heading font-bold text-slate-900 dark:text-white text-lg">Send us a message</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Fill in the form and our team will respond shortly.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Your Name" placeholder="John Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                    <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                    <div className="absolute opacity-0 -z-10" aria-hidden="true">
                      <Input label="Website" tabIndex={-1} autoComplete="off" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
                    </div>
                    </div>
                    <Input label="Subject" placeholder="How can we help?" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required />
                    <TextArea label="Message" placeholder="Tell us more about your inquiry..." rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} required />
                    <Button type="submit" className="w-full" size="md">
                      <Send className="w-4 h-4" /> Send Message
                    </Button>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Quick answers */}
      <section className="s-section bg-slate-50 dark:bg-dark-bg/50">
        <div className="s-inner max-w-3xl mx-auto">
          <div className="s-header text-center">
            <span className="inline-block text-xs font-semibold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase mb-3">Quick Answers</span>
            <h2 className="font-heading text-slate-900 dark:text-white text-3xl sm:text-4xl font-bold">Before You Reach Out</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto text-[0.9375rem] leading-relaxed">Answers to the questions we hear most often.</p>
          </div>
          <div className="flex flex-col gap-3">
            {quickFaqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className={`rounded-2xl border transition-all duration-200 ${isOpen ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm'}`}>
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 text-left px-5 py-4"
                  >
                    <span className="font-heading font-semibold text-sm text-slate-900 dark:text-white leading-snug">{faq.q}</span>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${isOpen ? 'bg-emerald-500 text-white rotate-180' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                      <Plus className="w-4 h-4" />
                    </span>
                  </button>
                  <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed px-5 pb-5">{faq.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="s-section bg-white dark:bg-dark-bg">
        <div className="s-inner max-w-5xl mx-auto">
          <div className="rounded-3xl bg-slate-50 dark:bg-slate-950 relative overflow-hidden text-center px-6 py-12 sm:px-12 border border-slate-200 dark:border-slate-800">
            <div className="absolute -top-24 -left-16 w-64 h-64 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden />
            <div className="absolute -bottom-24 -right-16 w-64 h-64 rounded-full bg-teal-500/15 blur-3xl" aria-hidden />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20" style={{ marginBottom: '1rem' }}>
                Prefer to skip the form?
              </div>
              <h3 className="font-heading text-slate-900 dark:text-white" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.75rem' }}>Get help right now</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto" style={{ marginBottom: '1.75rem' }}>
                Open a ticket and our AI starts diagnosing your issue immediately.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/login"><Button size="lg"><ArrowRight className="w-4 h-4" /> Open a Ticket</Button></Link>
                <Link to="/services">
                  <Button variant="ghost" size="lg" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800">Browse Services</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
