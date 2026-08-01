import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Ticket, Booking, ChatMessage, ContactMessage, Payment, KBArticle, Notification, TicketCategory } from '../types';
import { v4 as uuid } from 'uuid';
import { buildTriageGreeting, getTriageFlow, getDiagnosticResponse } from '../utils/triage';
import { importedKBArticles } from '../data/kbContent';
import { isSupabaseConfigured, getSupabase } from '../lib/supabase';
import { isUuid, remoteLoadUserData, remoteSaveUserData } from '../lib/sync';

export interface SignupResult {
  ok: boolean;
  needsEmailConfirm?: boolean;
  error?: string;
}

interface AuthUserLike {
  id: string;
  email?: string | null;
  created_at?: string;
  user_metadata?: Record<string, string | null | undefined>;
}

async function buildProfileFromAuthUser(authUser: AuthUserLike): Promise<User> {
  const meta = authUser.user_metadata ?? {};
  const fallback: User = {
    id: authUser.id,
    email: authUser.email ?? '',
    name: meta.name ?? authUser.email?.split('@')[0] ?? 'User',
    role: (meta.role as User['role']) ?? 'customer',
    organization: meta.organization ?? undefined,
    createdAt: authUser.created_at ?? new Date().toISOString(),
  };
  try {
    const client = getSupabase();
    await client
      .from('profiles')
      .upsert(
        {
          id: authUser.id,
          email: authUser.email ?? '',
          name: fallback.name,
          organization: fallback.organization ?? null,
        },
        { onConflict: 'id' }
      );
    const { data } = await client.from('profiles').select('*').eq('id', authUser.id).single();
    if (data) {
      return {
        ...fallback,
        name: data.name ?? fallback.name,
        role: (data.role as User['role']) ?? fallback.role,
        organization: data.organization ?? fallback.organization,
        avatar: data.avatar ?? undefined,
        phone: data.phone ?? undefined,
        location: data.location ?? undefined,
        bio: data.bio ?? undefined,
      };
    }
  } catch {
    // profiles table may not exist yet — fall back to auth metadata
  }
  return fallback;
}

function genRef(): string {
  const hex = Math.random().toString(16).substring(2, 8).toUpperCase();
  return `FIXORA-${hex}`;
}

let syncing = false;

const day   = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
const hours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

const SLA_HOURS: Record<string, number> = { low: 5, medium: 3, high: 1, critical: 0.25 };

// Seed data
const seedUsers: User[] = [
  { id: '1', email: 'admin@fixora.com',    name: 'Ibrahim O. Akande', role: 'super_admin',      password: 'fixora123', phone: '+234 800 000 0001', location: 'Lagos, NG',        bio: 'Platform administrator',   createdAt: day(-90) },
  { id: '2', email: 'manager@fixora.com',  name: 'Sarah Chen',     role: 'support_manager',  password: 'fixora123', phone: '+234 800 000 0002', location: 'Lagos, NG',        bio: 'Support team lead',        createdAt: day(-60) },
  { id: '3', email: 'tech@fixora.com',     name: 'Mike Obi',       role: 'technician',       password: 'fixora123', phone: '+234 800 000 0003', location: 'Abuja, NG',        bio: 'Senior technician',        createdAt: day(-45) },
  { id: '4', email: 'field@fixora.com',    name: 'Grace Adeyemi',  role: 'field_technician', password: 'fixora123', phone: '+234 800 000 0004', location: 'Port Harcourt, NG', bio: 'Field support specialist', createdAt: day(-30) },
  { id: '5', email: 'customer@fixora.com', name: 'David Okonkwo',  role: 'customer',         password: 'fixora123', phone: '+234 800 000 0005', location: 'Lagos, NG',        bio: 'Business owner',           createdAt: day(-20) },
  { id: '6', email: 'jane@company.com',    name: 'Jane Doe',       role: 'customer',         password: 'fixora123', phone: '+234 800 000 0006', location: 'Kano, NG',         bio: 'IT Manager',               createdAt: day(-15) },
  { id: '7', email: 'tech2@fixora.com',    name: 'Emeka Nwosu',    role: 'technician',       password: 'fixora123', phone: '+234 800 000 0007', location: 'Lagos, NG',        bio: 'Network specialist',       createdAt: day(-40) },
];

const seedTickets: Ticket[] = [
  { id: 't1', title: 'Laptop not booting after Windows update', description: 'My laptop shows a blue screen after the latest Windows update. Error code: 0x0000007B. Need urgent help as this is my work laptop.', category: 'computer_repair', priority: 'high', status: 'open', screenshotUrls: [], assignedTo: undefined, createdBy: '5', createdByName: 'David Okonkwo', escalationLevel: 0, triageStatus: 'needs_technician', triageStep: 3, slaDeadline: hours(1.5), activityLogs: [{ id: 'al1', user: 'David Okonkwo', action: 'Created ticket', entityType: 'ticket', entityId: 't1', timestamp: day(-2) }], createdAt: day(-2), updatedAt: day(-2) },
  { id: 't2', title: 'Office network keeps dropping', description: 'The WiFi network in our office keeps disconnecting every 30 minutes. About 20 employees affected.', category: 'networking', priority: 'critical', status: 'in_progress', screenshotUrls: [], assignedTo: '3', assignedRole: 'technician', createdBy: '6', createdByName: 'Jane Doe', escalationLevel: 1, slaDeadline: hours(-1), estimatedResolutionTime: '4 hours', activityLogs: [{ id: 'al2', user: 'Jane Doe', action: 'Created ticket', entityType: 'ticket', entityId: 't2', timestamp: day(-3) }, { id: 'al3', user: 'Sarah Chen', action: 'Assigned to Mike Obi', entityType: 'ticket', entityId: 't2', timestamp: day(-2) }], createdAt: day(-3), updatedAt: day(-1) },
  { id: 't3', title: 'Printer not responding to print commands', description: 'HP LaserJet Pro M404n is showing as online but nothing prints. Already tried restarting.', category: 'printer', priority: 'medium', status: 'assigned', screenshotUrls: [], assignedTo: '7', assignedRole: 'technician', createdBy: '5', createdByName: 'David Okonkwo', escalationLevel: 0, slaDeadline: hours(9), activityLogs: [], createdAt: day(-1), updatedAt: day(-1) },
  { id: 't4', title: 'CCTV system offline after power outage', description: 'Our 8-camera CCTV system went offline after a power outage. DVR shows no signal on any channel.', category: 'cctv', priority: 'high', status: 'escalated', screenshotUrls: [], assignedTo: '4', assignedRole: 'field_technician', createdBy: '6', createdByName: 'Jane Doe', escalationLevel: 2, slaDeadline: hours(-5), activityLogs: [], createdAt: day(-4), updatedAt: day(-1) },
  { id: 't5', title: 'Microsoft 365 license activation issue', description: 'Cannot activate Microsoft 365 Business Premium. Getting error: "Your account does not have a valid license."', category: 'microsoft365', priority: 'medium', status: 'resolved', screenshotUrls: [], assignedTo: '3', assignedRole: 'technician', createdBy: '5', createdByName: 'David Okonkwo', resolutionNotes: 'Re-assigned license through admin portal and cleared credential cache.', rating: 5, ratingComment: 'Quick and professional resolution!', escalationLevel: 0, activityLogs: [], createdAt: day(-7), updatedAt: day(-5) },
  { id: 't6', title: 'Website loading very slowly', description: 'Our company website takes over 15 seconds to load. Need performance optimization.', category: 'website', priority: 'medium', status: 'pending', screenshotUrls: [], createdBy: '6', createdByName: 'Jane Doe', escalationLevel: 0, slaDeadline: hours(14), activityLogs: [], createdAt: day(-1), updatedAt: day(-1) },
  { id: 't7', title: 'VPN connection fails on remote workers', description: 'Multiple remote employees cannot connect to company VPN since server migration.', category: 'networking', priority: 'high', status: 'waiting_customer', screenshotUrls: [], assignedTo: '7', assignedRole: 'technician', createdBy: '5', createdByName: 'David Okonkwo', escalationLevel: 0, slaDeadline: hours(0.5), activityLogs: [], createdAt: day(-2), updatedAt: day(-1) },
  { id: 't8', title: 'Software installation request - AutoCAD', description: 'Need AutoCAD 2024 installed on 5 workstations for engineering department.', category: 'software', priority: 'low', status: 'closed', screenshotUrls: [], assignedTo: '3', assignedRole: 'technician', createdBy: '6', createdByName: 'Jane Doe', resolutionNotes: 'Installed AutoCAD 2024 on all 5 workstations and verified licensing.', rating: 4, ratingComment: 'Good job, took a bit longer than expected.', escalationLevel: 0, activityLogs: [], createdAt: day(-14), updatedAt: day(-10) },
];

const seedBookings: Booking[] = [
  { id: 'b1', serviceType: 'Computer Repair', preferredDate: day(2).split('T')[0], preferredTime: '10:00', description: 'Desktop PC needs hardware diagnostic', status: 'confirmed', contactPhone: '+234 800 000 0005', assignedTechnician: '3', sessionType: 'onsite', createdBy: '5', createdAt: day(-1) },
  { id: 'b2', serviceType: 'Network Setup', preferredDate: day(4).split('T')[0], preferredTime: '14:00', description: 'New office network configuration', status: 'pending', contactPhone: '+234 800 000 0006', sessionType: 'onsite', createdBy: '6', createdAt: day(0) },
  { id: 'b3', serviceType: 'Remote Assistance', preferredDate: day(1).split('T')[0], preferredTime: '09:00', description: 'Help with email migration', status: 'confirmed', contactPhone: '+234 800 000 0005', assignedTechnician: '7', sessionType: 'remote', createdBy: '5', createdAt: day(-2) },
];

const seedMessages: ChatMessage[] = [
  { id: 'm1', ticketId: 't2', senderEmail: 'jane@company.com', senderName: 'Jane Doe', senderRole: 'customer', message: 'The network dropped again just now. This is really affecting our work.', isAdmin: false, createdAt: day(-2) },
  { id: 'm2', ticketId: 't2', senderEmail: 'tech@fixora.com', senderName: 'Mike Obi', senderRole: 'technician', message: 'I understand the urgency. I\'m checking the router logs now. Can you confirm if the issue happens on both 2.4GHz and 5GHz bands?', isAdmin: true, createdAt: day(-2) },
  { id: 'm3', ticketId: 't2', senderEmail: 'jane@company.com', senderName: 'Jane Doe', senderRole: 'customer', message: 'It happens on both bands. We have an Ubiquiti UniFi setup.', isAdmin: false, createdAt: day(-1) },
  { id: 'm4', ticketId: 't1', senderEmail: 'customer@fixora.com', senderName: 'David Okonkwo', senderRole: 'customer', message: 'How long will this take to fix? I need my laptop for a presentation tomorrow.', isAdmin: false, createdAt: day(-1) },
  { id: 'm5', ticketId: 't1', senderEmail: 'bot@fixora.com', senderName: 'FIXORA BOT', senderRole: 'bot', message: 'Hello David, welcome to Fixora. I\'m **FIXORA**, your AI support assistant.\n\nLet\'s diagnose your laptop boot issue together.\n\n**First question:**\n\nDoes the computer turn on at all? Do you see any lights or hear fans?', isAdmin: true, createdAt: day(-2) },
  { id: 'm6', ticketId: 't1', senderEmail: 'customer@fixora.com', senderName: 'David Okonkwo', senderRole: 'customer', message: 'It powers on but I get a blue screen with error code 0x0000007B.', isAdmin: false, createdAt: day(-2) },
  { id: 'm7', ticketId: 't1', senderEmail: 'bot@fixora.com', senderName: 'FIXORA BOT', senderRole: 'bot', message: 'A blue screen with **0x0000007B** usually points to a boot-device issue.\n\n**You can try this now:**\n\n• Boot into Safe Mode.\n• Run System Restore to a point before the Windows update.\n\n**Next question:**\n\nWhen did this issue start? Was it after a specific event?', isAdmin: true, createdAt: day(-1) },
  { id: 'm8', ticketId: 't1', senderEmail: 'customer@fixora.com', senderName: 'David Okonkwo', senderRole: 'customer', message: 'Yes, it started right after the latest Windows update.', isAdmin: false, createdAt: day(-1) },
  { id: 'm9', ticketId: 't1', senderEmail: 'bot@fixora.com', senderName: 'FIXORA BOT', senderRole: 'bot', message: 'Thanks, David. A blue screen with **0x0000007B** right after a Windows update points to a boot-device or driver conflict.\n\n**Step-by-step fix:**\n\n1. Boot into Safe Mode.\n2. Run System Restore to a point before the Windows update.\n3. If that doesn\'t help, check the disk drive connection in your BIOS.\n\n**Related guides:**\n\n• How to troubleshoot boot issues\n• Windows blue screen error guide\n\nTry the steps above and let me know if your issue is resolved.\n\nIf you\'re still having trouble, you can request a technician below — I\'ve prepared your case for them.', isAdmin: true, createdAt: day(-1) },
];

const seedContacts: ContactMessage[] = [
  { id: 'c1', name: 'John Smith', email: 'john@example.com', subject: 'Partnership inquiry', message: 'We are interested in becoming a reseller for FIXORA services.', isRead: false, createdAt: day(-3) },
  { id: 'c2', name: 'Mary Johnson', email: 'mary@startup.io', subject: 'Enterprise pricing', message: 'Looking for custom enterprise pricing for 200+ employees.', isRead: true, createdAt: day(-5) },
];

const seedPayments: Payment[] = [
  { id: 'p1', plan: 'Professional', amount: 15000, status: 'completed', reference: genRef(), paymentMethod: 'card', renewalDate: day(30), transactionId: `TXN-${uuid().substring(0, 8).toUpperCase()}`, userId: '5', createdAt: day(-30) },
  { id: 'p2', plan: 'Basic', amount: 5000, status: 'completed', reference: genRef(), paymentMethod: 'bank_transfer', renewalDate: day(15), transactionId: `TXN-${uuid().substring(0, 8).toUpperCase()}`, userId: '6', createdAt: day(-15) },
  { id: 'p3', plan: 'Business', amount: 50000, status: 'completed', reference: genRef(), paymentMethod: 'card', renewalDate: day(30), transactionId: `TXN-${uuid().substring(0, 8).toUpperCase()}`, userId: '5', createdAt: day(-5) },
];

const seedKB: KBArticle[] = [
  { id: 'kb1', title: 'How to troubleshoot slow internet connection', content: '## Step 1: Check your speed\nRun a speed test at speedtest.net.\n\n## Step 2: Restart your router\nUnplug the router, wait 30 seconds, plug it back in.\n\n## Step 3: Check for interference\nMove your router away from other electronic devices.\n\n## Step 4: Update firmware\nCheck your router manufacturer\'s website for firmware updates.\n\n## Step 5: Contact your ISP\nIf issues persist, contact your Internet Service Provider.', category: 'Internet', tags: ['internet', 'wifi', 'troubleshooting'], isPublished: true, helpfulCount: 42, createdBy: '3', createdAt: day(-30) },
  { id: 'kb2', title: 'Setting up Microsoft 365 Business email', content: '## Prerequisites\n- Microsoft 365 Business subscription\n- Domain name\n- Admin access\n\n## Steps\n1. Go to admin.microsoft.com\n2. Navigate to Setup\n3. Add your domain\n4. Verify domain ownership\n5. Add DNS records\n6. Create user accounts\n7. Assign licenses\n8. Configure Outlook on devices', category: 'Microsoft 365', tags: ['email', 'microsoft', 'setup'], isPublished: true, helpfulCount: 38, createdBy: '3', createdAt: day(-25) },
  { id: 'kb3', title: 'Printer troubleshooting guide', content: '## Common issues\n\n### Printer offline\n1. Check USB/network connection\n2. Restart print spooler service\n3. Remove and re-add printer\n\n### Paper jam\n1. Turn off printer\n2. Open all access panels\n3. Carefully remove jammed paper\n4. Check for torn pieces\n\n### Poor print quality\n1. Run cleaning cycle\n2. Align print heads\n3. Replace cartridges if low', category: 'Printers', tags: ['printer', 'troubleshooting', 'hardware'], isPublished: true, helpfulCount: 25, createdBy: '7', createdAt: day(-20) },
  { id: 'kb4', title: 'VPN Setup Guide for Remote Workers', content: '## Overview\nThis guide covers setting up VPN access for remote work.\n\n## Requirements\n- VPN client software\n- Company credentials\n- Internet connection\n\n## Setup Steps\n1. Download the VPN client\n2. Import configuration file\n3. Enter your credentials\n4. Connect and verify', category: 'Networking', tags: ['vpn', 'remote', 'networking'], isPublished: true, helpfulCount: 31, createdBy: '3', createdAt: day(-15) },
  ...importedKBArticles,
];

const seedNotifications: Notification[] = [
  { id: 'n1', userEmail: 'admin@fixora.com', title: 'New ticket submitted', message: 'David Okonkwo submitted a new ticket: Laptop not booting', type: 'ticket', isRead: false, link: '/tickets/t1', createdAt: day(-2) },
  { id: 'n2', userEmail: 'tech@fixora.com', title: 'Ticket assigned to you', message: 'You have been assigned ticket: Office network keeps dropping', type: 'assignment', isRead: false, link: '/tickets/t2', createdAt: day(-2) },
  { id: 'n3', userEmail: 'customer@fixora.com', title: 'Ticket resolved', message: 'Your ticket "Microsoft 365 license activation" has been resolved', type: 'ticket', isRead: true, link: '/tickets/t5', createdAt: day(-5) },
  { id: 'n4', userEmail: 'admin@fixora.com', title: 'New payment received', message: 'Payment of ₦15,000 received for Professional plan', type: 'payment', isRead: true, createdAt: day(-30) },
  { id: 'n5', userEmail: 'manager@fixora.com', title: 'SLA breach warning', message: 'Ticket t4 is approaching SLA deadline', type: 'system', isRead: false, link: '/tickets/t4', createdAt: day(-1) },
];

interface AppState {
  // Theme
  darkMode: boolean;
  toggleDarkMode: () => void;

  // Auth
  currentUser: User | null;
  initAuth: () => Promise<void>;
  loadRemoteData: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  demoLogin: (email: string) => boolean;
  resetPassword: (email: string, newPassword: string) => boolean;
  signup: (name: string, email: string, password: string, organization?: string) => Promise<SignupResult>;
  logout: () => void;

  // Users
  users: User[];
  updateUser: (id: string, data: Partial<User>) => void;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  deleteUser: (id: string) => void;

  // Tickets
  tickets: Ticket[];
  addTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'activityLogs' | 'escalationLevel' | 'triageStatus'>) => string;
  updateTicket: (id: string, data: Partial<Ticket>) => void;
  resolveViaTriage: (id: string) => void;
  requestTechnician: (id: string, reason: string) => void;
  submitTriageAnswer: (id: string, answer: string) => void;

  // Bookings
  bookings: Booking[];
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => void;
  updateBooking: (id: string, data: Partial<Booking>) => void;

  // Chat
  chatMessages: ChatMessage[];
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'createdAt'>) => void;

  // Contact
  contactMessages: ContactMessage[];
  addContactMessage: (msg: Omit<ContactMessage, 'id' | 'createdAt' | 'isRead'>) => void;
  markContactRead: (id: string) => void;

  // Payments
  payments: Payment[];
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt' | 'reference' | 'transactionId'>) => void;
  updatePayment: (id: string, data: Partial<Payment>) => void;
  changePlan: (userId: string, plan: string, amount: number) => void;

  // Knowledge Base
  kbArticles: KBArticle[];
  addKBArticle: (article: Omit<KBArticle, 'id' | 'createdAt' | 'helpfulCount'>) => void;
  updateKBArticle: (id: string, data: Partial<KBArticle>) => void;
  voteHelpful: (id: string) => void;

  // Notifications
  notifications: Notification[];
  addNotification: (notif: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => void;
  markNotifRead: (id: string) => void;
  markAllNotifsRead: () => void;

  // Chat visit tracking
  chatLastVisit: string;
  setChatLastVisit: () => void;

  // Typing indicators
  typingUsers: { ticketId: string; email: string; name: string; expiresAt: number }[];
  startTyping: (ticketId: string, email: string, name: string) => void;
  stopTyping: (ticketId: string, email: string) => void;

  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Active sessions
  activeSessions: { id: string; device: string; browser: string; location: string; ip: string; lastActive: string; current: boolean }[];
  addSession: (session: Omit<AppState['activeSessions'][0], 'id' | 'lastActive'>) => void;
  revokeSession: (id: string) => void;
  revokeAllOtherSessions: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      darkMode: true,
      toggleDarkMode: () => set(s => ({ darkMode: !s.darkMode })),

      currentUser: null,
      loadRemoteData: async () => {
        const { currentUser } = get();
        if (!currentUser || !isSupabaseConfigured() || !isUuid(currentUser.id)) return;
        const remote = await remoteLoadUserData(currentUser.id);
        if (!remote || typeof remote !== 'object') return;
        const r = remote as Partial<Pick<AppState, 'tickets' | 'chatMessages' | 'bookings' | 'payments'>>;
        syncing = true;
        try {
          set(s => ({
            tickets: Array.isArray(r.tickets) ? r.tickets : s.tickets,
            chatMessages: Array.isArray(r.chatMessages) ? r.chatMessages : s.chatMessages,
            bookings: Array.isArray(r.bookings) ? r.bookings : s.bookings,
            payments: Array.isArray(r.payments) ? r.payments : s.payments,
          }));
        } finally {
          syncing = false;
        }
      },
      initAuth: async () => {
        if (!isSupabaseConfigured()) return;
        try {
          const { data } = await getSupabase().auth.getSession();
          if (data.session?.user) {
            const profile = await buildProfileFromAuthUser(data.session.user);
            set({ currentUser: profile });
            await get().loadRemoteData();
          }
        } catch { /* ignore */ }
      },
      login: async (email: string, password: string) => {
        const normalised = email.trim().toLowerCase();
        if (isSupabaseConfigured()) {
          try {
            const { data, error } = await getSupabase().auth.signInWithPassword({ email: normalised, password });
            if (error || !data.user) return false;
            const profile = await buildProfileFromAuthUser(data.user);
            set({ currentUser: profile });
            await get().loadRemoteData();
            return true;
          } catch { return false; }
        }
        const user = get().users.find(u => u.email === normalised);
        if (user && user.password === password) {
          set({ currentUser: user });
          return true;
        }
        return false;
      },
      demoLogin: (email: string) => {
        const user = get().users.find(u => u.email === email);
        if (user) {
          set({ currentUser: user });
          return true;
        }
        return false;
      },
      resetPassword: (email: string, newPassword: string) => {
        const normalised = email.trim().toLowerCase();
        const user = get().users.find(u => u.email === normalised);
        if (!user) return false;
        set(s => ({ users: s.users.map(u => u.id === user.id ? { ...u, password: newPassword } : u) }));
        return true;
      },
      signup: async (name: string, email: string, password: string, organization?: string) => {
        const normalised = email.trim().toLowerCase();
        if (isSupabaseConfigured()) {
          try {
            const { data, error } = await getSupabase().auth.signUp({
              email: normalised,
              password,
              options: {
                data: { name: name.trim(), role: 'customer', organization: organization?.trim() || null },
                emailRedirectTo: `${window.location.origin}/login`,
              },
            });
            if (error) return { ok: false, error: error.message };
            if (data.session && data.user) {
              const profile = await buildProfileFromAuthUser(data.user);
              set({ currentUser: profile });
              await get().loadRemoteData();
              return { ok: true };
            }
            if (data.user) return { ok: true, needsEmailConfirm: true };
            return { ok: false, error: 'Sign-up failed. Please try again.' };
          } catch {
            return { ok: false, error: 'Unable to reach the sign-up service. Please try again.' };
          }
        }
        const exists = get().users.find(u => u.email === normalised);
        if (exists) return { ok: false, error: 'An account with this email already exists.' };
        const newUser: User = {
          id: uuid(),
          email: normalised,
          name: name.trim(),
          role: 'customer',
          password,
          organization,
          createdAt: new Date().toISOString(),
        };
        set(s => ({ users: [...s.users, newUser], currentUser: newUser }));
        return { ok: true };
      },
      logout: () => {
        if (isSupabaseConfigured()) {
          try { void getSupabase().auth.signOut(); } catch { /* ignore */ }
        }
        set({ currentUser: null });
      },

      users: seedUsers,
      updateUser: (id, data) => set(s => ({ users: s.users.map(u => u.id === id ? { ...u, ...data } : u), currentUser: s.currentUser?.id === id ? { ...s.currentUser, ...data } : s.currentUser })),
      addUser: (userData) => set(s => ({ users: [...s.users, { ...userData, id: uuid(), createdAt: new Date().toISOString() }] })),
      deleteUser: (id) => set(s => ({ users: s.users.filter(u => u.id !== id) })),

      tickets: seedTickets,
      addTicket: (ticketData) => {
        const id = `t${Date.now()}`;
        const slaMs = (SLA_HOURS[ticketData.priority] ?? 24) * 3_600_000;
        const slaDeadline = ticketData.slaDeadline ?? new Date(Date.now() + slaMs).toISOString();
        const now = new Date().toISOString();
        const isCustomer = get().users.find(u => u.id === ticketData.createdBy)?.role === 'customer'
          || get().currentUser?.id === ticketData.createdBy;
        const triageActive = isCustomer && ticketData.priority !== 'critical';
        const triageGreeting = triageActive
          ? buildTriageGreeting(ticketData.category as TicketCategory, ticketData.createdByName)
          : `Your ticket has been received and flagged as **${ticketData.priority} priority**. A technician will respond shortly.`;
        set(s => ({
          tickets: [...s.tickets, {
            ...ticketData,
            id,
            slaDeadline,
            escalationLevel: 0,
            triageStatus: triageActive ? 'ai_diagnosing' : undefined,
            triageStep: triageActive ? 0 : undefined,
            activityLogs: [{ id: uuid(), user: ticketData.createdByName, action: 'Created ticket', entityType: 'ticket', entityId: id, timestamp: now }],
            createdAt: now,
            updatedAt: now,
          }],
          chatMessages: [...s.chatMessages, {
            id: `m${Date.now()}`,
            ticketId: id,
            senderEmail: 'bot@fixora.com',
            senderName: 'FIXORA BOT',
            senderRole: 'bot' as const,
            message: triageGreeting,
            isAdmin: true,
            createdAt: now,
          }],
        }));
        return id;
      },
      updateTicket: (id, data) => set(s => ({
        tickets: s.tickets.map(t => t.id === id ? { ...t, ...data, updatedAt: new Date().toISOString() } : t)
      })),
      resolveViaTriage: (id: string) => set(s => {
        const ticket = s.tickets.find(t => t.id === id);
        if (!ticket) return s;
        const now = new Date().toISOString();
        return {
          tickets: s.tickets.map(t =>
            t.id === id
              ? { ...t, triageStatus: undefined, status: 'resolved' as const, resolutionNotes: 'Resolved via AI self-service triage', updatedAt: now, activityLogs: [...t.activityLogs, { id: uuid(), user: t.createdByName, action: 'Resolved via AI triage — no technician needed', entityType: 'ticket', entityId: id, timestamp: now }] }
              : t
          ),
          chatMessages: [...s.chatMessages, {
            id: `m${Date.now()}`,
            ticketId: id,
            senderEmail: 'bot@fixora.com',
            senderName: 'FIXORA BOT',
            senderRole: 'bot' as const,
            message: "That's wonderful to hear. Your issue is now resolved, and your ticket has been marked accordingly.\n\nIf you ever need help again, you can reach us anytime — just create a new ticket. Take care!",
            isAdmin: true,
            createdAt: now,
          }],
        };
      }),
      requestTechnician: (id: string, reason: string) => set(s => {
        const ticket = s.tickets.find(t => t.id === id);
        if (!ticket) return s;
        if (ticket.triageStatus === 'ai_diagnosing') return s;
        const now = new Date().toISOString();
        return {
          tickets: s.tickets.map(t =>
            t.id === id
              ? { ...t, triageStatus: 'escalated_to_technician' as const, status: 'open' as const, updatedAt: now, activityLogs: [...t.activityLogs, { id: uuid(), user: t.createdByName, action: `Requested technician support: ${reason}`, entityType: 'ticket', entityId: id, timestamp: now }] }
              : t
          ),
          chatMessages: [...s.chatMessages, {
            id: `m${Date.now()}`,
            ticketId: id,
            senderEmail: 'bot@fixora.com',
            senderName: 'FIXORA BOT',
            senderRole: 'bot' as const,
            message: "Your request has been received.\n\nA technician will be assigned to your ticket shortly, and you'll be notified here the moment they pick it up. Your case details and diagnostic summary have been shared with them.",
            isAdmin: true,
            createdAt: now,
          }],
          notifications: [...s.notifications, {
            id: `n${Date.now()}`,
            userEmail: 'admin@fixora.com',
            title: 'Technician requested',
            message: `${ticket.createdByName} requested a technician for: ${ticket.title}`,
            type: 'assignment',
            isRead: false,
            link: `/tickets/${id}`,
            createdAt: now,
          }],
        };
      }),
      submitTriageAnswer: (id: string, answer: string) => {
        const ticket = get().tickets.find(t => t.id === id);
        if (!ticket || !ticket.category) return;
        const flow = getTriageFlow(ticket.category);
        const step = ticket.triageStep ?? 0;
        const nextIndex = step + 1;
        const now = new Date().toISOString();
        const user = get().users.find(u => u.id === ticket.createdBy);
        const botReply = getDiagnosticResponse(ticket.category, step, answer, get().kbArticles);
        const triageComplete = nextIndex >= flow.questions.length;
        set(s => ({
          tickets: s.tickets.map(t =>
            t.id === id
              ? {
                  ...t,
                  triageStep: nextIndex,
                  triageStatus: triageComplete ? ('needs_technician' as const) : t.triageStatus,
                  updatedAt: now,
                  activityLogs: [...t.activityLogs, { id: uuid(), user: t.createdByName, action: `AI triage: answered "${answer}"`, entityType: 'ticket', entityId: id, timestamp: now }],
                }
              : t
          ),
          chatMessages: [
            ...s.chatMessages,
            {
              id: `m${Date.now()}a`,
              ticketId: id,
              senderEmail: user?.email || 'customer@fixora.com',
              senderName: user?.name || ticket.createdByName,
              senderRole: user?.role || ('customer' as const),
              message: answer,
              isAdmin: false,
              createdAt: now,
            },
          ],
        }));
        const botEmail = 'bot@fixora.com';
        const botName = 'FIXORA BOT';
        set(s => ({
          typingUsers: [...s.typingUsers.filter(t => !(t.ticketId === id && t.email === botEmail)), { ticketId: id, email: botEmail, name: botName, expiresAt: Date.now() + 5600 }],
        }));
        setTimeout(() => {
          set(s => ({
            chatMessages: [
              ...s.chatMessages,
              {
                id: `m${Date.now()}b`,
                ticketId: id,
                senderEmail: botEmail,
                senderName: botName,
                senderRole: 'bot' as const,
                message: botReply,
                isAdmin: true,
                createdAt: new Date().toISOString(),
              },
            ],
            typingUsers: s.typingUsers.filter(t => !(t.ticketId === id && t.email === botEmail)),
          }));
        }, 5000);
      },

      bookings: seedBookings,
      addBooking: (bookingData) => set(s => ({ bookings: [...s.bookings, { ...bookingData, id: `b${Date.now()}`, createdAt: new Date().toISOString() }] })),
      updateBooking: (id, data) => set(s => ({ bookings: s.bookings.map(b => b.id === id ? { ...b, ...data } : b) })),

      chatMessages: seedMessages,
      addChatMessage: (msg) => set(s => ({ chatMessages: [...s.chatMessages, { ...msg, id: `m${Date.now()}`, createdAt: new Date().toISOString() }] })),

      contactMessages: seedContacts,
      addContactMessage: (msg) => set(s => ({ contactMessages: [...s.contactMessages, { ...msg, id: `c${Date.now()}`, createdAt: new Date().toISOString(), isRead: false }] })),
      markContactRead: (id) => set(s => ({ contactMessages: s.contactMessages.map(c => c.id === id ? { ...c, isRead: true } : c) })),

      payments: seedPayments,
      addPayment: (payment) => set(s => ({
        payments: [...s.payments, {
          ...payment,
          id: `p${Date.now()}`,
          reference: genRef(),
          transactionId: `TXN-${uuid().substring(0, 8).toUpperCase()}`,
          createdAt: new Date().toISOString(),
        }]
      })),
      updatePayment: (id, data) => set(s => ({ payments: s.payments.map(p => p.id === id ? { ...p, ...data } : p) })),
      changePlan: (userId, plan, amount) => {
        const user = get().users.find(u => u.id === userId);
        const activePmt = get().payments
          .filter(p => p.userId === userId && p.status === 'completed')
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        const oldPlan = activePmt?.plan ?? 'None';
        set(s => ({
          payments: [...s.payments, {
            id: `p${Date.now()}`,
            plan,
            amount,
            status: 'completed',
            reference: genRef(),
            paymentMethod: 'admin',
            renewalDate: day(30),
            transactionId: `TXN-${uuid().substring(0, 8).toUpperCase()}`,
            userId,
            createdAt: new Date().toISOString(),
          }],
          notifications: user ? [...s.notifications, {
            id: `n${Date.now()}`,
            userEmail: user.email,
            title: 'Subscription updated',
            message: `Your plan was changed from ${oldPlan} to ${plan}`,
            type: 'payment',
            isRead: false,
            createdAt: new Date().toISOString(),
          }] : s.notifications,
        }));
      },

      kbArticles: seedKB,
      addKBArticle: (article) => set(s => ({ kbArticles: [...s.kbArticles, { ...article, id: `kb${Date.now()}`, createdAt: new Date().toISOString(), helpfulCount: 0 }] })),
      updateKBArticle: (id, data) => set(s => ({ kbArticles: s.kbArticles.map(a => a.id === id ? { ...a, ...data } : a) })),
      voteHelpful: (id) => set(s => ({ kbArticles: s.kbArticles.map(a => a.id === id ? { ...a, helpfulCount: a.helpfulCount + 1 } : a) })),

      notifications: seedNotifications,
      addNotification: (notif) => set(s => ({ notifications: [...s.notifications, { ...notif, id: `n${Date.now()}`, createdAt: new Date().toISOString(), isRead: false }] })),
      markNotifRead: (id) => set(s => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, isRead: true } : n) })),
      markAllNotifsRead: () => set(s => ({ notifications: s.notifications.map(n => ({ ...n, isRead: true })) })),

      chatLastVisit: new Date(0).toISOString(),
      setChatLastVisit: () => set({ chatLastVisit: new Date().toISOString() }),

      typingUsers: [],
      startTyping: (ticketId, email, name) => set(s => ({
        typingUsers: [
          ...s.typingUsers.filter(t => !(t.ticketId === ticketId && t.email === email)),
          { ticketId, email, name, expiresAt: Date.now() + 3000 },
        ]
      })),
      stopTyping: (ticketId, email) => set(s => ({
        typingUsers: s.typingUsers.filter(t => !(t.ticketId === ticketId && t.email === email))
      })),

      sidebarOpen: false,
      toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      activeSessions: [
        { id: 's1', device: 'MacBook Pro', browser: 'Chrome 124', location: 'Lagos, Nigeria', ip: '197.211.58.12', lastActive: new Date().toISOString(), current: true },
        { id: 's2', device: 'iPhone 15 Pro', browser: 'Safari 17', location: 'Lagos, Nigeria', ip: '197.211.58.13', lastActive: new Date(Date.now() - 2 * 3600000).toISOString(), current: false },
        { id: 's3', device: 'Windows 11 PC', browser: 'Edge 123', location: 'Abuja, Nigeria', ip: '105.113.22.40', lastActive: new Date(Date.now() - 24 * 3600000).toISOString(), current: false },
      ],
      addSession: (session) => set(s => ({
        activeSessions: [...s.activeSessions, { ...session, id: `s${Date.now()}`, lastActive: new Date().toISOString() }],
      })),
      revokeSession: (id) => set(s => ({ activeSessions: s.activeSessions.filter(sess => sess.id !== id) })),
      revokeAllOtherSessions: () => set(s => ({ activeSessions: s.activeSessions.filter(sess => sess.current) })),
    }),
    {
      name: 'fixora-store',
      version: 5,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;
        if (version < 3) {
          state.activeSessions = [
            { id: 's1', device: 'MacBook Pro', browser: 'Chrome 124', location: 'Lagos, Nigeria', ip: '197.211.58.12', lastActive: new Date().toISOString(), current: true },
            { id: 's2', device: 'iPhone 15 Pro', browser: 'Safari 17', location: 'Lagos, Nigeria', ip: '197.211.58.13', lastActive: new Date(Date.now() - 2 * 3600000).toISOString(), current: false },
            { id: 's3', device: 'Windows 11 PC', browser: 'Edge 123', location: 'Abuja, Nigeria', ip: '105.113.22.40', lastActive: new Date(Date.now() - 24 * 3600000).toISOString(), current: false },
          ];
        }
        if (version < 4) {
          const users = state.users as Array<Record<string, unknown>> | undefined;
          if (Array.isArray(users)) {
            users.forEach(u => {
              if (u.role === 'super_admin' && u.name === 'Alex Johnson') {
                u.name = 'Ibrahim O. Akande';
              }
            });
          }
          const currentUser = state.currentUser as Record<string, unknown> | null | undefined;
          if (currentUser && currentUser.role === 'super_admin' && currentUser.name === 'Alex Johnson') {
            currentUser.name = 'Ibrahim O. Akande';
          }
        }
        if (version < 5) {
          const kbArticles = state.kbArticles as unknown[] | undefined;
          state.kbArticles = [...(Array.isArray(kbArticles) ? kbArticles : []), ...importedKBArticles];
          const tickets = state.tickets as Array<Record<string, unknown>> | undefined;
          if (Array.isArray(tickets)) {
            tickets.forEach(t => {
              if (t.id === 't1' && t.triageStatus === 'ai_diagnosing') {
                t.triageStatus = 'needs_technician';
                t.triageStep = 3;
              } else if (t.triageStatus === 'ai_diagnosing' && typeof t.triageStep !== 'number') {
                t.triageStep = 0;
              } else if (t.triageStatus && t.triageStatus !== 'ai_diagnosing' && typeof t.triageStep !== 'number') {
                t.triageStep = 3;
              }
            });
          }
        }
        return state;
      },
    }
  )
);

let saveTimer: ReturnType<typeof setTimeout> | null = null;
useStore.subscribe((s, prev) => {
  const changed =
    s.currentUser?.id !== prev.currentUser?.id ||
    s.tickets !== prev.tickets ||
    s.chatMessages !== prev.chatMessages ||
    s.bookings !== prev.bookings ||
    s.payments !== prev.payments;
  if (!changed || syncing) return;
  const uid = s.currentUser?.id;
  if (!uid || !isSupabaseConfigured() || !isUuid(uid)) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const latest = useStore.getState();
    remoteSaveUserData(latest.currentUser?.id ?? uid, {
      tickets: latest.tickets,
      chatMessages: latest.chatMessages,
      bookings: latest.bookings,
      payments: latest.payments,
    });
  }, 600);
});
