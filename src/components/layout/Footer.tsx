import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Zap } from 'lucide-react';
import Logo from '../ui/Logo';

const platform = [
  { to: '/services', label: 'Services' },
  { to: '/pricing',  label: 'Pricing' },
  { to: '/about',    label: 'About Us' },
  { to: '/faq',      label: 'FAQ' },
  { to: '/contact',  label: 'Contact' },
];

const services = ['Computer Repair', 'Networking', 'Printer Support', 'CCTV & Security', 'Server Support', 'Remote Assistance'];

export default function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

          {/* Brand */}
          <div className="md:col-span-4">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <Logo size={36} />
              <span className="font-heading text-xl font-bold text-white tracking-tight">TICKSERA</span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-xs">
              Enterprise IT support platform built for speed, reliability, and scale. Trusted by 500+ businesses across Africa.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" /> 99.9% Uptime SLA
            </div>
          </div>

          {/* Platform links */}
          <div className="md:col-span-2">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-5">Platform</h4>
            <ul className="space-y-3">
              {platform.map(li => (
                <li key={li.to}>
                  <Link to={li.to} className="text-sm text-slate-400 hover:text-emerald-400 transition-colors">
                    {li.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-5">Services</h4>
            <ul className="space-y-3">
              {services.map(s => (
                <li key={s} className="text-sm text-slate-400">{s}</li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="md:col-span-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-5">Contact</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 mb-0.5">Email</p>
                  <p className="text-sm text-slate-300">support@ticksera.com</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 mb-0.5">Phone</p>
                  <p className="text-sm text-slate-300">+234 800 FIX ORA</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 mb-0.5">Location</p>
                  <p className="text-sm text-slate-300">Lagos, Nigeria</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-slate-500">© {new Date().getFullYear()} TICKSERA Technologies Ltd. All rights reserved.</span>
          <div className="flex items-center gap-6 text-xs text-slate-500">
            <Link to="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
            <Link to="/docs#security" className="hover:text-slate-300 transition-colors">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
