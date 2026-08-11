import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../../store';
import { Menu, X, Sun, Moon } from 'lucide-react';
import Button from '../ui/Button';
import Logo from '../ui/Logo';

const links = [
  { to: '/about',    label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/pricing',  label: 'Pricing' },
  { to: '/faq',      label: 'FAQ' },
  { to: '/contact',  label: 'Contact' },
  { to: '/docs',     label: 'Docs' },
];

export default function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { darkMode, toggleDarkMode, currentUser } = useStore();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white dark:bg-dark-bg border-b border-slate-100 dark:border-dark-border shadow-sm">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center h-16">
          <Link to="/" className="flex items-center gap-3 flex-shrink-0">
            <Logo size={34} />
            <span className="font-heading text-2xl font-black text-slate-900 dark:text-white tracking-tight">TICKSERA</span>
          </Link>

          <div className="hidden md:flex items-center justify-center gap-0.5 flex-1">
            {links.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive(l.to)
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {currentUser ? (
              <Link to="/dashboard">
                <Button size="sm">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Sign In
                </Link>
                <Link to="/login">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-100 dark:border-dark-border bg-white dark:bg-dark-bg px-4 pb-4 pt-2 space-y-1">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMobileOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(l.to)
                  ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
