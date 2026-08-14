import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  BookOpen, Zap, Ticket, MessageSquare, Calendar, BarChart2,
  Shield, ChevronRight, Users, CreditCard, Settings,
  Search, Plus, Sparkles, Bell, Layers, LifeBuoy, HelpCircle,
} from 'lucide-react';

const quickLinks = [
  { icon: Zap,           label: 'Getting Started',   id: 'getting-started' },
  { icon: Ticket,        label: 'Ticket Management', id: 'tickets' },
  { icon: Sparkles,      label: 'AI Triage',         id: 'ai' },
  { icon: MessageSquare, label: 'Live Chat',         id: 'chat' },
  { icon: Calendar,      label: 'Bookings',          id: 'booking' },
  { icon: BarChart2,     label: 'Dashboard',         id: 'analytics' },
  { icon: BookOpen,      label: 'Knowledge Base',    id: 'knowledge-base' },
  { icon: Users,         label: 'Team Management',   id: 'team' },
  { icon: CreditCard,    label: 'Billing & Plans',   id: 'billing' },
  { icon: Shield,        label: 'Security',          id: 'security' },
  { icon: Bell,          label: 'Notifications',     id: 'notifications' },
  { icon: Settings,      label: 'Account Settings',  id: 'settings' },
  { icon: Layers,        label: 'Admin Panel',       id: 'admin' },
];

const WIZARD_STEPS = [
  'Client Type',
  'Industry (Business)',
  'Core Category',
  'Product / Item',
  'Issue Trigger',
  'Priority',
];

const sections = [
  {
    id: 'getting-started',
    icon: Zap,
    title: 'Getting Started',
    intro: 'Get up and running with TICKSERA in minutes, from creating your account to submitting your first ticket.',
    items: [
      {
        q: 'Creating your account',
        a: 'Open the Sign Up page and choose an account type: Personal (Basic or Professional) or Business / Organization (Business or Enterprise). Enter your full name, email, and a password of at least 8 characters, then confirm. New accounts start without a plan, so after signing up you\'re guided to the Billing page to pick one.',
      },
      {
        q: 'Using a demo account',
        a: 'This is a demo build; every seeded account signs in with the password ticksera123. Type the email and password on the Login page: admin@ticksera.com (Super Admin), manager@ticksera.com (Support Manager), tech@ticksera.com (Technician), field@ticksera.com (Field Technician), or customer@ticksera.com (Customer).',
      },
      {
        q: 'Choosing the right plan',
        a: 'TICKSERA offers four plans: Basic (₦5,000/mo), Professional (₦15,000/mo, most popular), Business (₦50,000/mo, up to 15 team seats), and Enterprise (custom pricing). New customers pick a plan on the Billing page; existing customers can upgrade or downgrade any time from My Plan. Payment methods are Card, Bank Transfer, USSD, and Mobile Pay.',
      },
      {
        q: 'Setting up your profile',
        a: 'Open Profile from the dashboard sidebar. You can update your phone number, location, and bio, and upload an avatar photo. Your name and email are fixed to your account.',
      },
      {
        q: 'Submitting your first ticket',
        a: 'Click Get IT Help on the dashboard to open the guided wizard. Personal tickets have 5 steps: Client Type, Core Category, Product, Issue, and Priority; business tickets add an Industry step. Choose the option closest to your problem; pick Other to type your own product or issue. Set a priority, then open the ticket form to review and submit.',
      },
      {
        q: 'What happens after I sign in?',
        a: 'Staff members go straight to the dashboard, and so do customers with an active plan. Customers without a completed payment are redirected to the Billing page to choose a plan before they can use the dashboard.',
      },
      {
        q: 'Navigating the dashboard',
        a: 'Your dashboard shows stat cards tailored to your role, a Ticket Activity chart, a Status Breakdown donut, and a Recent Tickets table. Customers see My Tickets, Open, Resolved, and Bookings; staff see Assigned, Pending, In Progress, and Resolved; admins see Total Tickets, Total Users, Revenue, and Escalated.',
      },
    ],
  },
  {
    id: 'tickets',
    icon: Ticket,
    title: 'Ticket Management',
    intro: 'Every support request is tracked as a ticket with an activity timeline, SLA tracking, and a built-in discussion thread.',
    items: [
      {
        q: 'Priority levels explained',
        a: 'Four priorities drive your response SLA: Critical (15-minute SLA, full outage or data-loss risk), High (60-minute SLA, major issue affecting productivity), Medium (3-hour SLA, partial disruption with a workaround), and Low (5-hour SLA, minor, non-urgent).',
      },
      {
        q: 'Ticket statuses',
        a: 'Open: awaiting the first message. In Progress: a conversation has started, so the ticket moves out of Open automatically. Pending: awaiting initial action. Assigned: a technician is allocated. Waiting for Customer: we need information from you. Escalated: flagged for a manager. Resolved: fixed and verified. Closed: archived, usually after the customer rates the resolution or closes the ticket.',
      },
      {
        q: 'AI triage on new tickets',
        a: 'Non-critical tickets opened by customers start in AI triage. The TICKSERA BOT greets you in the discussion thread and walks you through diagnostic questions. Answer in chat to progress the triage; when it needs a human, it routes to a technician. You can also request a technician directly at any time.',
      },
      {
        q: 'SLA tracking',
        a: 'Every ticket card in the Support Queue and My Tickets shows a live SLA countdown. It stays emerald while healthy, turns amber below 35% of the target remaining, and red below 15% or once breached. Breached tickets also get a red border and an SLA Breached badge.',
      },
      {
        q: 'Discussion & attachments',
        a: 'Use the Discussion section to message your technician in real time. A typing indicator shows when the other side is composing. Click the paperclip to attach images, PDFs, or Office documents, a preview appears before you send, and images open full-screen.',
      },
      {
        q: 'Updating status (staff)',
        a: 'Technicians assigned to a ticket and admins can move it through statuses with the Update Status control. The Mark Resolved button asks for resolution notes, which are recorded on the ticket. Every status change notifies the ticket creator.',
      },
      {
        q: 'Escalating a ticket',
        a: 'If a ticket isn\'t progressing, open it and use the Request Escalation card. Enter a reason and confirm; the ticket moves to Escalated, the escalation level increases, the reason is logged, and all support managers and admins are notified.',
      },
      {
        q: 'Assigning a technician (admins)',
        a: 'Admins use the Assign Technician dropdown on the ticket page to allocate a technician. Assigning sets the ticket to Assigned and automatically confirms any linked bookings. Unassigning returns it to Open.',
      },
      {
        q: 'Rating & closing tickets',
        a: 'Once your ticket is Resolved, the creator is asked to rate the resolution; the rating targets whoever fixed it, the TICKSERA BOT or the technician. Submitting the rating closes the ticket, and a Close Ticket button is also available if you\'d rather skip the rating. You can close a ticket from its page any time after a conversation has started. Every close is recorded in the activity timeline.',
      },
      {
        q: 'Exporting tickets',
        a: 'From the tickets list, use Export CSV or Export PDF to download the currently filtered tickets. The export respects your active search, status, and priority filters, and the CSV includes ID, title, category, priority, status, assignee, and SLA deadline.',
      },
    ],
  },
  {
    id: 'ai',
    icon: Sparkles,
    title: 'AI Triage & Assistant',
    intro: 'TICKSERA uses AI to speed up diagnosis and help staff find answers fast.',
    items: [
      {
        q: 'AI triage on tickets',
        a: 'Non-critical customer tickets enter AI triage automatically. The TICKSERA BOT posts diagnostic questions in the ticket\'s discussion thread, reads your answers to steer the diagnosis, and shares step-by-step troubleshooting. It tries to resolve the issue before any technician is involved. The ticket is only auto-routed to a technician when you say the BOT\'s help didn\'t resolve it; tap "Not Resolved: Request Technician" and a specialist takes over with your full diagnostic history. Critical issues and staff-created tickets bypass the BOT and route directly.',
      },
      {
        q: 'Who decides the ticket status?',
        a: 'The TICKSERA BOT reads each conversation and moves the ticket to the status it believes fits: In Progress while you\'re being helped, Resolved when you confirm a fix worked, Escalated when the issue isn\'t getting fixed, and Closed when you ask to close it. Every AI status change is logged in the activity timeline. Admins and assigned technicians can always override any status manually from the Update Status control.',
      },
      {
        q: 'The AI Assistant (staff)',
        a: 'Open AI Assistant from the sidebar and ask questions in plain English, such as "How do I reset a password?" or "Network is slow; what should I check?". It searches the knowledge base by keyword and returns up to three matching articles. If nothing matches, it suggests opening a ticket or booking a session.',
      },
      {
        q: 'Improving answers',
        a: 'The Assistant searches the knowledge base, so answers improve as your team adds articles. Admins can publish new guides from the Knowledge Base page; the Assistant picks them up immediately.',
      },
    ],
  },
  {
    id: 'chat',
    icon: MessageSquare,
    title: 'Live Chat',
    intro: 'Live Chat is built around your tickets: real-time messaging with the technician handling your request.',
    items: [
      {
        q: 'Starting a conversation',
        a: 'Open Live Chat from the sidebar. The conversation list shows your tickets that have messages or aren\'t yet closed. Click a conversation to view and send messages; sending routes straight into that ticket\'s discussion thread.',
      },
      {
        q: 'Sharing files & screenshots',
        a: 'Click the paperclip in the chat input to attach images, PDFs, or Office documents. A preview chip appears before you send, and images open full-screen when clicked.',
      },
      {
        q: 'Typing indicators & unread badges',
        a: 'A live typing indicator appears when the other side is composing a message, and the Live Chat item in the sidebar carries an unread badge when you have new messages.',
      },
      {
        q: 'AI triage quick replies',
        a: 'While a ticket is in AI triage, the chat shows the current diagnostic question with quick-reply options, so you can answer with a single tap instead of typing.',
      },
    ],
  },
  {
    id: 'booking',
    icon: Calendar,
    title: 'Bookings & Calendar',
    intro: 'Book dedicated remote or on-site time with a technician, then manage it all from your calendar.',
    items: [
      {
        q: 'Booking a session',
        a: 'Open Book Session. Choose a service type (Computer Repair, Networking, Printer Support, CCTV Installation, Internet Setup, Microsoft 365, Server Support, Website Support, Software Installation, or Remote Assistance), pick Remote or Onsite, select a date (today or later), a 30-minute time slot between 08:00 and 18:00, and add your phone number. A description is optional.',
      },
      {
        q: 'Booking from a ticket',
        a: 'On a ticket that needs hands-on help, the "Not getting the help you need?" card includes a Book Session button that pre-fills the service and references the ticket. If the ticket already has an assigned technician, the booking is confirmed immediately and pre-assigned to them.',
      },
      {
        q: 'Booking statuses',
        a: 'Bookings start as Pending. An admin or manager confirms them by assigning a technician, which moves them to Confirmed. Technicians and admins can then progress them to In Progress and Completed.',
      },
      {
        q: 'The calendar',
        a: 'The Calendar is a read-only month view of your bookings, colour-coded by status, with an Upcoming list of your next sessions. Use the Book Session button on the page, or on any individual day, to schedule more.',
      },
    ],
  },
  {
    id: 'analytics',
    icon: BarChart2,
    title: 'Dashboard & Analytics',
    intro: 'Real-time visibility into your support activity, tailored to your role.',
    items: [
      {
        q: 'Stat cards',
        a: 'Metric cards adapt to your role. Customers see My Tickets, Open, Resolved, and Bookings. Technicians see Assigned, Pending, In Progress, and Resolved. Admins see Total Tickets, Total Users, Revenue, and Escalated.',
      },
      {
        q: 'Ticket Activity chart',
        a: 'An area chart plots tickets created against tickets resolved across the current week, so you can spot peak demand and resolution trends at a glance.',
      },
      {
        q: 'Status Breakdown donut',
        a: 'The donut shows your current ticket mix by status: Open, In Progress, Resolved, and Escalated, with a colour legend. A healthy queue is dominated by Resolved.',
      },
      {
        q: 'Recent Tickets',
        a: 'The Recent Tickets table lists your latest tickets with priority, status, and date. Click View all to jump to the full queue.',
      },
      {
        q: 'Reports (admins)',
        a: 'Admins get a Reports tab in the Admin panel with revenue trends, the ticket-status donut, user growth, technician workload, and top requested services.',
      },
    ],
  },
  {
    id: 'knowledge-base',
    icon: BookOpen,
    title: 'Knowledge Base',
    intro: 'Self-serve troubleshooting guides and step-by-step articles for common issues.',
    items: [
      {
        q: 'Searching & browsing',
        a: 'Search matches article titles, content, categories, and tags. Category chips above the list filter to a specific topic.',
      },
      {
        q: 'Reading & voting',
        a: 'Expand an article to read the full step-by-step content. Found it useful? Hit the Helpful button to bump its score.',
      },
      {
        q: 'Adding articles (admins)',
        a: 'Admins can publish new guides with the New Article button; give it a title, markdown content, a category, and comma-separated tags. Published articles are immediately searchable by staff and by the AI Assistant.',
      },
    ],
  },
  {
    id: 'team',
    icon: Users,
    title: 'Team Management',
    intro: 'Business and Enterprise plans let an organisation owner add their team and control access.',
    items: [
      {
        q: 'Access & seats',
        a: 'Team Management (Company Users) is available when the organisation owner has an active Business or Enterprise plan. Business includes up to 15 seats; Enterprise up to 100. Without a qualifying plan, the page shows an upgrade prompt.',
      },
      {
        q: 'Adding members',
        a: 'As the organisation owner, click Add Member, then enter a full name, a work email on your company\'s domain, and an initial password (minimum 8 characters). Members are created as customer accounts and can sign in immediately. You\'ll see their credentials with a Copy button to share securely.',
      },
      {
        q: 'Managing members',
        a: 'Remove a member with the X button on their row. Team members see a read-only "Your Team" list; only the organisation owner can add or remove people.',
      },
      {
        q: 'Roles & permissions',
        a: 'Roles control access across the platform. Customer: own tickets, chat, and bookings. Technician / Field Technician: assigned tickets and the support queue. Support Manager: full ticket management plus team oversight. Super Admin: full platform access including the admin panel. Staff employee accounts are created by admins from the Technicians tab.',
      },
    ],
  },
  {
    id: 'billing',
    icon: CreditCard,
    title: 'Billing & Plans',
    intro: 'Manage your subscription, plans, and payment history.',
    items: [
      {
        q: 'Current plan & renewal',
        a: 'My Plan shows your active plan, price, renewal date, and payment method, with feature chips for what\'s included.',
      },
      {
        q: 'Changing plans',
        a: 'Pick a new plan and choose Upgrade or Downgrade, confirm in the modal, select a payment method, and complete the (demo) payment. Changes take effect immediately; downgrading cancels your current plan right away, so you lose access to higher-tier features immediately.',
      },
      {
        q: 'Payment methods',
        a: 'Four methods are supported: Card, Bank Transfer, USSD, and Mobile Pay. This is a demo; no real charges are made.',
      },
      {
        q: 'Payment history',
        a: 'Every transaction appears in the Payment History table on My Plan, with reference, plan, amount, status, and date.',
      },
      {
        q: 'Admin-managed subscriptions',
        a: 'Admins manage customer subscriptions from the Plans tab in the Admin panel, using the Manage Subscriptions list to move customers between plans.',
      },
    ],
  },
  {
    id: 'security',
    icon: Shield,
    title: 'Security',
    intro: 'Full visibility and control over who can access your account.',
    items: [
      {
        q: 'Active session management',
        a: 'Your Profile page lists every active login session: device, browser, location, IP, and last-active time, with the current session marked. Sign out any session individually, or sign out all other sessions in one click.',
      },
      {
        q: 'Role-based access control',
        a: 'Feature and data access is enforced by role. Customers see only their own tickets and bookings. Technicians see only tickets assigned to them plus open tickets. Admins have platform-wide access.',
      },
      {
        q: 'Demo build data',
        a: 'This is a demo build; all data is stored locally in your browser under the ticksera-store localStorage key. Clearing your site data resets the demo to its seeded state.',
      },
    ],
  },
  {
    id: 'notifications',
    icon: Bell,
    title: 'Notifications',
    intro: 'Stay on top of ticket, assignment, booking, and payment activity.',
    items: [
      {
        q: 'The notification bell',
        a: 'The bell in the dashboard\'s top bar shows an unread dot when something needs attention. Open it to see your latest notifications with an unread count.',
      },
      {
        q: 'Notification types',
        a: 'Notifications cover tickets (new, resolved), assignments, bookings, payments, chat, and system events such as SLA breach warnings.',
      },
      {
        q: 'Reading & clearing',
        a: 'Click a notification to jump to the related ticket or page; it\'s marked read automatically. Use Mark all read to clear everything at once.',
      },
    ],
  },
  {
    id: 'settings',
    icon: Settings,
    title: 'Account Settings',
    intro: 'Manage your personal details, appearance, and session.',
    items: [
      {
        q: 'Editing your profile',
        a: 'On the Profile page, click Edit to update your phone number, location, and bio, then Save Changes. You can also upload or remove an avatar.',
      },
      {
        q: 'Dark mode',
        a: 'Toggle light and dark mode with the sun/moon button in the dashboard\'s top-right bar (and on the public site\'s navigation). Your preference is saved automatically.',
      },
      {
        q: 'Signing out & switching accounts',
        a: 'Open the user menu in the top-right corner of the dashboard and choose Sign Out. To explore other roles, sign in with a demo account using the password ticksera123.',
      },
    ],
  },
  {
    id: 'admin',
    icon: Layers,
    title: 'Admin Panel',
    intro: 'Super Admins and Support Managers run the whole platform from one panel.',
    items: [
      {
        q: 'Accessing the admin panel',
        a: 'The Admin panel is available to Super Admins and Support Managers. Sidebar links like Support Queue, Reports, Organizations, Technicians, Plans, and Audit Logs open the panel on the matching tab.',
      },
      {
        q: 'Support Queue & assignments',
        a: 'Every ticket in one place. Assign any ticket to a technician directly from the queue; the ticket moves to Assigned and the technician is notified.',
      },
      {
        q: 'Technicians & staff accounts',
        a: 'Add employee accounts with roles of Super Admin, Support Manager, Technician, or Field Technician. Change a staff member\'s role or remove them at any time.',
      },
      {
        q: 'Organizations & customers',
        a: 'Organizations shows each business account with its plan, members, seat usage, and open tickets. The Customers page lists every customer with their plan and activity.',
      },
      {
        q: 'Payments, bookings & messages',
        a: 'Payments lists all transactions. Bookings lets you assign a technician to a pending request to confirm it. Messages collects contact-form submissions from the Contact page; mark them read as you handle them.',
      },
      {
        q: 'Plans & subscriptions',
        a: 'Plans shows the plan catalog with subscriber counts. Manage Subscriptions lets you move any customer between plans.',
      },
      {
        q: 'Audit logs',
        a: 'Audit Logs lists the most recent ticket activity events with the user and timestamp, so you can trace what happened and when.',
      },
    ],
  },
];

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl border transition-all duration-200 ${open ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 text-left px-5 py-4"
      >
        <span className="font-heading font-semibold text-sm text-slate-900 dark:text-white leading-snug">{q}</span>
        <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${open ? 'bg-emerald-500 text-white rotate-180' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
          <Plus className="w-4 h-4" />
        </span>
      </button>
      <div className={`grid transition-all duration-300 ease-in-out ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed px-5 pb-5">{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function Docs() {
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState('getting-started');

  useEffect(() => {
    const onScroll = () => {
      const current = sections
        .map(s => {
          const el = document.getElementById(s.id);
          return { id: s.id, top: el ? el.getBoundingClientRect().top : Infinity };
        })
        .filter(o => o.top <= 180)
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

  const q = search.trim().toLowerCase();
  const filtered = sections.map(s => ({
    ...s,
    items: s.items.filter(i => !q || i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)),
  })).filter(s => !q || s.items.length > 0);

  return (
    <div className="bg-white dark:bg-dark-bg min-h-screen">

      {/* Header */}
      <section className="relative overflow-hidden bg-slate-50 dark:bg-dark-bg/60 border-b border-slate-200 dark:border-dark-border">
        <div className="absolute inset-0 premium-surface" aria-hidden />
        <div className="s-inner max-w-7xl mx-auto relative z-10" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
          <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500" style={{ marginBottom: '1.5rem' }}>
            <Link to="/" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-600 dark:text-slate-300">Documentation</span>
          </div>
          <div className="flex flex-col lg:flex-row lg:items-end gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4" style={{ marginBottom: '0.75rem' }}>
                <div className="chip-icon bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="font-heading text-slate-900 dark:text-white" style={{ fontSize: '2rem', fontWeight: 700 }}>Documentation</h1>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Everything you need to use TICKSERA.</p>
                </div>
              </div>
            </div>
            <div className="lg:w-80 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search documentation…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-xl text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                style={{ paddingLeft: '2.5rem', paddingRight: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem' }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="s-inner max-w-7xl mx-auto" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
        <div className="flex flex-col lg:flex-row gap-10">

          {/* Sidebar */}
          <aside className="lg:w-60 flex-shrink-0">
            <div className="sticky top-24">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest" style={{ marginBottom: '0.875rem' }}>Sections</p>
              <nav className="space-y-1">
                {quickLinks.map(ql => (
                  <button
                    key={ql.id}
                    onClick={() => jumpTo(ql.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${activeId === ql.id
                      ? 'bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'}`}
                  >
                    <ql.icon className="w-3.5 h-3.5 flex-shrink-0" />
                    {ql.label}
                  </button>
                ))}
              </nav>

              <div className="mt-8 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2" style={{ marginBottom: '0.375rem' }}>
                  <LifeBuoy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Need help?</p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed" style={{ marginBottom: '0.75rem' }}>Can't find the answer? Our team is ready.</p>
                <Link to="/contact" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                  Contact support <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {q && (
              <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-900 dark:text-white">{filtered.reduce((n, s) => n + s.items.length, 0)}</span> result{filtered.reduce((n, s) => n + s.items.length, 0) !== 1 ? 's' : ''} for <span className="font-semibold text-slate-900 dark:text-white">"{search.trim()}"</span>
                </p>
                <button onClick={() => setSearch('')} className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">Clear search</button>
              </div>
            )}

            {q && filtered.length === 0 && (
              <div className="text-center py-20">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center" style={{ marginBottom: '1rem' }}>
                  <Search className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-slate-500 dark:text-slate-400">No results for "<strong>{search}</strong>"</p>
                <button onClick={() => setSearch('')} className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline mt-2">Clear search</button>
              </div>
            )}

            <div className="space-y-16">
              {filtered.map(section => (
                <div key={section.id} id={section.id} className="scroll-mt-28">
                  <div className="flex items-center gap-3" style={{ marginBottom: '0.75rem' }}>
                    <div className="chip-icon bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800">
                      <section.icon className="w-4 h-4" />
                    </div>
                    <h2 className="font-heading text-slate-900 dark:text-white" style={{ fontSize: '1.375rem', fontWeight: 700 }}>{section.title}</h2>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed" style={{ marginBottom: '1.25rem', paddingLeft: '3rem' }}>{section.intro}</p>

                  {section.id === 'getting-started' && (
                    <div className="rounded-2xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-card p-5" style={{ marginBottom: '1.25rem', marginLeft: '3rem' }}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500" style={{ marginBottom: '0.75rem' }}>The ticket wizard walks you through</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {WIZARD_STEPS.map((step, i) => (
                          <span key={step} className="inline-flex items-center gap-1.5">
                            <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-dark-border text-slate-600 dark:text-slate-300">
                              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">{i + 1}</span>
                              {step}
                            </span>
                            {i < WIZARD_STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3" style={{ marginLeft: '3rem' }}>
                    {section.items.map((item, j) => (
                      <AccordionItem key={j} q={item.q} a={item.a} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* End CTA */}
            <div className="rounded-3xl bg-slate-50 dark:bg-slate-950 relative overflow-hidden text-center px-6 py-12 sm:px-12 border border-slate-200 dark:border-slate-800" style={{ marginTop: '4rem' }}>
              <div className="absolute -top-24 -left-16 w-64 h-64 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden />
              <div className="absolute -bottom-24 -right-16 w-64 h-64 rounded-full bg-teal-500/15 blur-3xl" aria-hidden />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20" style={{ marginBottom: '1rem' }}>
                  <HelpCircle className="w-3.5 h-3.5" />
                  Still stuck?
                </div>
                <h3 className="font-heading text-slate-900 dark:text-white" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Didn't find what you need?</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto" style={{ marginBottom: '1.5rem' }}>
                  Browse common questions or reach our team; we're happy to help.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link to="/faq" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">Browse the FAQ <ChevronRight className="w-4 h-4" /></Link>
                  <Link to="/contact" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">Contact support <ChevronRight className="w-4 h-4" /></Link>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
