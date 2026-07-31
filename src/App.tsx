import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { useStore } from './store';
import { useShallow } from 'zustand/react/shallow';

// Layouts
import PublicNavbar from './components/layout/PublicNavbar';
import Footer from './components/layout/Footer';
import DashboardLayout from './components/layout/DashboardLayout';
import PageLoader from './components/ui/PageLoader';

// ─── Lazy-loaded Public Pages ────────────────────────────────────────────────
const Landing       = lazy(() => import('./pages/Landing'));
const About         = lazy(() => import('./pages/About'));
const Services      = lazy(() => import('./pages/Services'));
const Pricing       = lazy(() => import('./pages/Pricing'));
const FAQ           = lazy(() => import('./pages/FAQ'));
const Contact       = lazy(() => import('./pages/Contact'));
const Docs          = lazy(() => import('./pages/Docs'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService= lazy(() => import('./pages/TermsOfService'));
const Login         = lazy(() => import('./pages/Login'));
const Signup        = lazy(() => import('./pages/Signup'));
const Billing       = lazy(() => import('./pages/Billing'));

// ─── Lazy-loaded Dashboard Pages ─────────────────────────────────────────────
const Dashboard     = lazy(() => import('./pages/dashboard/Dashboard'));
const Tickets       = lazy(() => import('./pages/dashboard/Tickets'));
const NewTicket     = lazy(() => import('./pages/dashboard/NewTicket'));
const TicketDetail  = lazy(() => import('./pages/dashboard/TicketDetail'));
const Chat          = lazy(() => import('./pages/dashboard/Chat'));
const Booking       = lazy(() => import('./pages/dashboard/Booking'));
const CalendarPage  = lazy(() => import('./pages/dashboard/CalendarPage'));
const Kanban        = lazy(() => import('./pages/dashboard/Kanban'));
const KnowledgeBase = lazy(() => import('./pages/dashboard/KnowledgeBase'));
const Profile       = lazy(() => import('./pages/dashboard/Profile'));
const Admin         = lazy(() => import('./pages/dashboard/Admin'));
const CompanyUsers  = lazy(() => import('./pages/dashboard/CompanyUsers'));
const PlanSettings  = lazy(() => import('./pages/dashboard/PlanSettings'));
const Customers     = lazy(() => import('./pages/dashboard/Customers'));
const Assistant     = lazy(() => import('./pages/dashboard/Assistant'));

const STAFF_ROLES = ['super_admin', 'support_manager', 'technician', 'field_technician'];

function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-dark-bg">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function ProtectedRoute() {
  const { currentUser, payments, users } = useStore(
    useShallow(s => ({ currentUser: s.currentUser, payments: s.payments, users: s.users }))
  );

  if (!currentUser) return <Navigate to="/login" replace />;

  const isStaff = STAFF_ROLES.includes(currentUser.role);
  if (!isStaff) {
    if (currentUser.orgOwnerEmail) {
      const owner = users.find(u => u.email === currentUser.orgOwnerEmail);
      const ownerHasEnterprise = owner
        ? payments.some(p => p.userId === owner.id && p.plan === 'Enterprise' && p.status === 'completed')
        : false;
      if (!ownerHasEnterprise) return <Navigate to="/billing" replace />;
    } else {
      const hasActivePlan = payments.some(
        p => p.userId === currentUser.id && p.status === 'completed'
      );
      if (!hasActivePlan) return <Navigate to="/billing" replace />;
    }
  }

  return <DashboardLayout />;
}

function BillingRoute() {
  const { currentUser, payments, users } = useStore(
    useShallow(s => ({ currentUser: s.currentUser, payments: s.payments, users: s.users }))
  );
  if (!currentUser) return <Navigate to="/login" replace />;
  if (STAFF_ROLES.includes(currentUser.role)) return <Navigate to="/dashboard" replace />;
  if (currentUser.orgOwnerEmail) {
    const owner = users.find(u => u.email === currentUser.orgOwnerEmail);
    const ownerHasEnterprise = owner
      ? payments.some(p => p.userId === owner.id && p.plan === 'Enterprise' && p.status === 'completed')
      : false;
    if (ownerHasEnterprise) return <Navigate to="/dashboard" replace />;
  }
  const hasActivePlan = payments.some(p => p.userId === currentUser.id && p.status === 'completed');
  if (hasActivePlan) return <Navigate to="/dashboard" replace />;
  return (
    <Suspense fallback={<PageLoader />}>
      <Billing />
    </Suspense>
  );
}

function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const darkMode = useStore(s => s.darkMode);

  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [darkMode]);

  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeWrapper>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicLayout />}>
              <Route path="/"        element={<Landing />} />
              <Route path="/about"   element={<About />} />
              <Route path="/services" element={<Services />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/faq"     element={<FAQ />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/docs"    element={<Docs />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms"   element={<TermsOfService />} />
            </Route>

            <Route path="/login"   element={<Login />} />
            <Route path="/signup"  element={<Signup />} />
            <Route path="/billing" element={<BillingRoute />} />

            {/* Protected dashboard routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard"    element={<Dashboard />} />
              <Route path="/tickets"      element={<Tickets />} />
              <Route path="/tickets/new"  element={<NewTicket />} />
              <Route path="/tickets/:id"  element={<TicketDetail />} />
              <Route path="/chat"         element={<Chat />} />
              <Route path="/booking"      element={<Booking />} />
              <Route path="/calendar"     element={<CalendarPage />} />
              <Route path="/kanban"       element={<Kanban />} />
              <Route path="/knowledge-base" element={<KnowledgeBase />} />
              <Route path="/profile"      element={<Profile />} />
              <Route path="/plan"         element={<PlanSettings />} />
              <Route path="/admin"        element={<Admin />} />
              <Route path="/company-users" element={<CompanyUsers />} />
              <Route path="/customers"    element={<Customers />} />
              <Route path="/assistant"    element={<Assistant />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </ThemeWrapper>
  );
}
