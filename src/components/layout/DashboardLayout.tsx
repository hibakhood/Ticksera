import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useStore } from '../../store';
import { useShallow } from 'zustand/react/shallow';
import {
  LayoutDashboard, Ticket, MessageSquare, BookOpen,
  User, Menu, X, Sun, Moon, Bell,
  LogOut, ChevronDown, ChevronRight, CalendarCheck, CalendarDays, LayoutGrid,
  Building2, Layers, Users, Wrench, Sparkles, ScrollText, BarChart3, Inbox,
  RefreshCw, AlertTriangle, Check
} from 'lucide-react';
import Logo from '../ui/Logo';
import { hasActivePlanFor } from '../../utils/plans';
import { isSupabaseConfigured } from '../../lib/supabase';

type NavItem = { to: string; search?: string; icon: typeof LayoutDashboard; label: string };

const staffTechNav: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tickets',   icon: Inbox,           label: 'Support Queue' },
  { to: '/chat',      icon: MessageSquare,   label: 'Live Chat' },
  { to: '/kanban',    icon: LayoutGrid,      label: 'My Assignments' },
  { to: '/booking',   icon: CalendarCheck,   label: 'Bookings' },
  { to: '/calendar',  icon: CalendarDays,    label: 'Calendar' },
  { to: '/assistant', icon: Sparkles,        label: 'AI Assistant' },
];

const staffResourceNav: NavItem[] = [
  { to: '/customers',      icon: Users,    label: 'Customers' },
  { to: '/knowledge-base', icon: BookOpen, label: 'Knowledge Base' },
];

const adminWorkspaceNav: NavItem[] = [
  { to: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin',          icon: Ticket,          label: 'Support Queue',    search: 'tab=tickets' },
  { to: '/chat',           icon: MessageSquare,   label: 'Live Chat' },
  { to: '/admin',          icon: BarChart3,       label: 'Reports',          search: 'tab=overview' },
  { to: '/knowledge-base', icon: BookOpen,        label: 'Knowledge Base' },
];

const adminManageNav: NavItem[] = [
  { to: '/customers',      icon: Users,     label: 'Customers' },
  { to: '/admin',          icon: Building2, label: 'Organizations', search: 'tab=organizations' },
  { to: '/admin',          icon: Wrench,    label: 'Technicians',   search: 'tab=technicians' },
  { to: '/admin',          icon: Layers,    label: 'Plans',         search: 'tab=plans' },
];

const adminSystemNav: NavItem[] = [
  { to: '/admin', icon: ScrollText, label: 'Audit Logs', search: 'tab=activity' },
];

const pathTitles: Record<string, string> = {
  '/dashboard':      'Dashboard',
  '/tickets':        'Support Queue',
  '/tickets/new':    'Get IT Help',
  '/chat':           'Live Chat',
  '/booking':        'Bookings',
  '/calendar':       'Calendar',
  '/knowledge-base': 'Knowledge Base',
  '/profile':        'Profile',
  '/plan':           'My Plan',
  '/kanban':         'My Assignments',
  '/admin':          'Admin Panel',
  '/company-users':  'Team Members',
  '/customers':      'Customers',
  '/assistant':      'AI Assistant',
};

function getPageTitle(pathname: string, role?: string): string {
  if (pathname === '/tickets' && role === 'customer') return 'My Tickets';
  if (pathTitles[pathname]) return pathTitles[pathname];
  if (pathname.startsWith('/tickets/')) return 'Ticket Detail';
  if (pathname.startsWith('/admin')) return 'Admin Panel';
  return 'Dashboard';
}

export default function DashboardLayout() {
  const {
    currentUser, darkMode, toggleDarkMode, logout,
    notifications, markNotifRead, markAllNotifsRead,
    sidebarOpen, setSidebarOpen,
    chatMessages, tickets, chatLastVisit, conversations,
    payments, users, syncStatus, lastSyncedAt,
  } = useStore(
    useShallow(s => ({
      currentUser: s.currentUser, darkMode: s.darkMode, toggleDarkMode: s.toggleDarkMode,
      logout: s.logout, notifications: s.notifications, markNotifRead: s.markNotifRead,
      markAllNotifsRead: s.markAllNotifsRead, sidebarOpen: s.sidebarOpen,
      setSidebarOpen: s.setSidebarOpen, chatMessages: s.chatMessages,
      tickets: s.tickets, chatLastVisit: s.chatLastVisit, conversations: s.conversations,
      payments: s.payments, users: s.users,
      syncStatus: s.syncStatus, lastSyncedAt: s.lastSyncedAt,
    }))
  );
  const location = useLocation();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const unreadNotifs = notifications.filter(n => n.userEmail === currentUser?.email && !n.isRead);
  const taskNotifTypes = ['ticket', 'assignment', 'booking'];
  const userNotifs = notifications
    .filter(n => n.userEmail === currentUser?.email)
    .sort((a, b) => {
      const aTask = taskNotifTypes.includes(a.type) ? 1 : 0;
      const bTask = taskNotifTypes.includes(b.type) ? 1 : 0;
      if (aTask !== bTask) return bTask - aTask;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 8);
  const isAdmin      = currentUser?.role === 'super_admin' || currentUser?.role === 'support_manager';
  const isTech       = currentUser?.role === 'technician' || currentUser?.role === 'field_technician';
  const pageTitle    = getPageTitle(location.pathname, currentUser?.role);

  const myTicketIds = new Set(
    tickets
      .filter(t => currentUser?.role === 'customer'
        ? t.createdBy === currentUser.id
        : t.assignedTo === currentUser?.id || isAdmin)
      .map(t => t.id)
  );
  const myConversationIds = new Set(
    conversations
      .filter(c => currentUser && c.participantIds.includes(currentUser.id))
      .map(c => c.id)
  );
  const unreadChatCount = chatMessages.filter(m =>
    m.senderEmail !== currentUser?.email &&
    (m.ticketId ? myTicketIds.has(m.ticketId) : myConversationIds.has(m.conversationId ?? '')) &&
    new Date(m.createdAt) > new Date(chatLastVisit)
  ).length;

  const isCustomer = currentUser?.role === 'customer';
  const hasTeamPlan = isCustomer && hasActivePlanFor(payments, currentUser?.id ?? '', ['Business', 'Enterprise']);
  const isCompanyMember = Boolean(currentUser?.orgOwnerEmail);
  const orgOwner = isCompanyMember ? users.find(u => u.email === currentUser?.orgOwnerEmail) : null;
  const orgOwnerHasTeamPlan = orgOwner
    ? hasActivePlanFor(payments, orgOwner.id, ['Business', 'Enterprise'])
    : false;
  const showTeamNav = hasTeamPlan || (isCompanyMember && orgOwnerHasTeamPlan);

  let navSections: { title?: string; items: NavItem[] }[] = [];
  if (isTech) {
    navSections = [
      { items: staffTechNav },
      { title: 'Resources', items: staffResourceNav },
    ];
  } else if (isAdmin) {
    navSections = [
      { items: adminWorkspaceNav },
      { title: 'Manage', items: adminManageNav },
      { title: 'System', items: adminSystemNav },
    ];
  } else {
    navSections = [
      { items: [
        { to: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/tickets',        icon: Ticket,          label: 'My Tickets' },
        { to: '/chat',           icon: MessageSquare,   label: 'Live Chat' },
        { to: '/booking',        icon: CalendarCheck,   label: 'Book Session' },
        { to: '/calendar',       icon: CalendarDays,    label: 'Calendar' },
        { to: '/knowledge-base', icon: BookOpen,        label: 'Knowledge Base' },
        ...(showTeamNav ? [{ to: '/company-users', icon: Building2, label: 'Team Members' } as NavItem] : []),
        { to: '/plan',           icon: Layers,          label: 'My Plan' },
      ] },
    ];
  }

  const isActiveNav = (item: NavItem) => {
    if (item.search) {
      return location.pathname === item.to && location.search === `?${item.search}`;
    }
    return location.pathname === item.to ||
      (item.to !== '/dashboard' && location.pathname.startsWith(item.to));
  };

  const handleLogout = () => { logout(); navigate('/'); };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname, setSidebarOpen]);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-dark-bg">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-dvh w-64 bg-slate-900 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-800 flex-shrink-0">
          <Logo size={32} className="flex-shrink-0" />
          <span className="font-heading text-lg font-bold text-white tracking-tight">TICKSERA</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-slate-500 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-0.5">
          {navSections.map((section, si) => (
            <div key={si}>
              {section.title && (
                <div className="px-3.5 pt-4 pb-1">
                  <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">{section.title}</span>
                </div>
              )}
              {section.items.map(item => {
                const active = isActiveNav(item);
                return (
                  <Link
                    key={item.to + (item.search ?? '')}
                    to={item.search ? { pathname: item.to, search: `?${item.search}` } : item.to}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                      active
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.to === '/chat' && unreadChatCount > 0 && !active && (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                        {unreadChatCount > 99 ? '99+' : unreadChatCount}
                      </span>
                    )}
                    {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors cursor-default">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md shadow-emerald-500/20 overflow-hidden">
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                currentUser?.name?.charAt(0) || 'U'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-none mb-0.5">{currentUser?.name}</p>
              <p className="text-[11px] text-slate-500 truncate capitalize">{currentUser?.role?.replace(/_/g, ' ')}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top header */}
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-dark-card border-b border-slate-200 dark:border-dark-border flex items-center px-5 lg:px-7 gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden lg:flex items-center gap-1.5">
            <span className="text-xs text-slate-400">TICKSERA</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="font-semibold text-slate-900 dark:text-white text-sm">{pageTitle}</span>
          </div>

          <div className="flex-1" />

          {/* Sync health */}
          {isSupabaseConfigured() && (
            <div
              className="hidden md:flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border"
              title={lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString()}` : 'Not synced yet'}
              aria-live="polite"
            >
              {syncStatus === 'syncing' && (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/10">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Syncing…
                </span>
              )}
              {syncStatus === 'error' && (
                <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/10">
                  <AlertTriangle className="w-3 h-3" /> Sync error
                </span>
              )}
              {syncStatus === 'idle' && (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-900/10">
                  <Check className="w-3 h-3" /> Synced
                </span>
              )}
            </div>
          )}

          <button
            onClick={toggleDarkMode}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
          >
            {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 relative transition-colors"
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadNotifs.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-dark-card animate-pulse-glow" />
              )}
            </button>

            {notifOpen && (
              <div className="fixed right-4 top-[72px] w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl shadow-xl overflow-hidden z-50 animate-fade-in sm:absolute sm:right-0 sm:top-12">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-dark-border">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    Notifications
                    {unreadNotifs.length > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full">
                        {unreadNotifs.length}
                      </span>
                    )}
                  </span>
                  {unreadNotifs.length > 0 && (
                    <button onClick={() => markAllNotifsRead()} className="text-xs text-emerald-500 hover:text-emerald-600 font-semibold">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {userNotifs.length === 0 ? (
                    <div className="text-center py-10">
                      <Bell className="w-7 h-7 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">All caught up!</p>
                    </div>
                  ) : userNotifs.map(n => (
                    <div
                      key={n.id}
                      onClick={() => { markNotifRead(n.id); if (n.link) navigate(n.link); setNotifOpen(false); }}
                      className={`px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!n.isRead ? 'bg-emerald-50/60 dark:bg-emerald-900/10' : ''}`}
                    >
                      <div className="flex items-start gap-2.5">
                        {!n.isRead && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />}
                        <div className={!n.isRead ? '' : 'ml-4'}>
                          <p className="text-sm font-medium text-slate-900 dark:text-white leading-snug">{n.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{n.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-bold shadow-sm overflow-hidden">
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  currentUser?.name?.charAt(0)
                )}
              </div>
              <span className="hidden sm:block text-sm font-semibold text-slate-700 dark:text-slate-300 max-w-[100px] truncate">
                {currentUser?.name?.split(' ')[0]}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-12 w-52 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl shadow-xl overflow-hidden z-50 animate-fade-in">
                <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{currentUser?.name}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{currentUser?.email}</p>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <User className="w-4 h-4" /> Profile Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors border-t border-slate-100 dark:border-slate-800"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
