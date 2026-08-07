import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Ticket, Booking, ChatMessage, Conversation, ContactMessage, Payment, KBArticle, Notification, TicketCategory } from '../types';
import { v4 as uuid } from 'uuid';
import { buildTriageGreeting, buildHandoffGreeting, getTriageFlow, getDiagnosticResponse } from '../utils/triage';
import { importedKBArticles } from '../data/kbContent';
import { isSupabaseConfigured, getSupabase } from '../lib/supabase';
import { loadSharedState, saveSharedState, type SharedState } from '../lib/sync';
import { loadDbCollections } from '../lib/db';
import { requestAgentReply, buildAgentPayload, runAutoRoute, getTechnicianLoad, type AgentStatus } from '../lib/agent';

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
  const email = (authUser.email ?? '').toLowerCase();
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
        role: resolveProfileRole(email, data.role ?? fallback.role),
        organization: data.organization ?? fallback.organization,
        avatar: data.avatar ?? undefined,
        phone: data.phone ?? undefined,
        location: data.location ?? undefined,
        bio: data.bio ?? undefined,
      };
    }
  } catch {
    // profiles table may not exist yet; fall back to auth metadata
  }
  return { ...fallback, role: resolveProfileRole(email, fallback.role) };
}

function resolveProfileRole(email: string, dbRole: string): User['role'] {
  const adminEmails = (import.meta.env.VITE_SUPER_ADMIN_EMAIL ?? '')
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.includes(email)) return 'super_admin';
  return (dbRole as User['role']) ?? 'customer';
}

function genRef(): string {
  const hex = Math.random().toString(16).substring(2, 8).toUpperCase();
  return `FIXORA-${hex}`;
}

let syncing = false;
let recoveryPending = false;
let mfaPending: { factorId: string; challengeId: string } | null = null;

const POLL_MS = 10_000;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastLocalMutation = 0;
let focusHandler: (() => void) | null = null;
let lastSharedVersion: number | null = null;

const day   = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
const hours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

const SLA_HOURS: Record<string, number> = { low: 5, medium: 3, high: 1, critical: 0.25 };

// Seed data
const seedUsers: User[] = [
  { id: '1', email: 'admin@fixora.com',    name: 'Ibrahim O. Akande', role: 'super_admin',      password: 'fixora123', phone: '+234 800 000 0001', location: 'Lagos, NG',        bio: 'Platform administrator',   createdAt: day(-90) },
  { id: '2', email: 'manager@fixora.com',  name: 'Sarah Chen',     role: 'support_manager',  password: 'fixora123', phone: '+234 800 000 0002', location: 'Lagos, NG',        bio: 'Support team lead',        createdAt: day(-60) },
  { id: '3', email: 'tech@fixora.com',     name: 'Mike Obi',       role: 'technician',       password: 'fixora123', phone: '+234 800 000 0003', location: 'Abuja, NG',        bio: 'Senior technician',        skills: ['computer_repair', 'microsoft365', 'server', 'software', 'remote'], createdAt: day(-45) },
  { id: '4', email: 'field@fixora.com',    name: 'Grace Adeyemi',  role: 'field_technician', password: 'fixora123', phone: '+234 800 000 0004', location: 'Port Harcourt, NG', bio: 'Field support specialist', skills: ['cctv', 'printer', 'computer_repair', 'networking', 'internet'], createdAt: day(-30) },
  { id: '5', email: 'customer@fixora.com', name: 'David Okonkwo',  role: 'customer',         password: 'fixora123', phone: '+234 800 000 0005', location: 'Lagos, NG',        bio: 'Business owner',           createdAt: day(-20) },
  { id: '6', email: 'jane@company.com',    name: 'Jane Doe',       role: 'customer',         password: 'fixora123', phone: '+234 800 000 0006', location: 'Kano, NG',         bio: 'IT Manager',               createdAt: day(-15) },
  { id: '7', email: 'tech2@fixora.com',    name: 'Emeka Nwosu',    role: 'technician',       password: 'fixora123', phone: '+234 800 000 0007', location: 'Lagos, NG',        bio: 'Network specialist',       skills: ['networking', 'internet', 'printer', 'cctv', 'server'], createdAt: day(-40) },
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

const seedConversations: Conversation[] = [
  { id: 'conv1', type: 'group', title: 'Ops Squad', participantIds: ['1', '2', '3', '4', '7'], createdBy: '1', createdAt: day(-6), lastMessageAt: day(-1) },
  { id: 'conv2', type: 'direct', title: 'Sarah Chen', participantIds: ['1', '2'], createdBy: '1', createdAt: day(-4), lastMessageAt: day(-2) },
  { id: 'conv3', type: 'direct', title: 'Mike Obi', participantIds: ['1', '3'], createdBy: '1', createdAt: day(-3), lastMessageAt: day(-2) },
  { id: 'conv4', type: 'group', title: 'Field Crew', participantIds: ['1', '2', '4'], createdBy: '2', createdAt: day(-5), lastMessageAt: day(-1) },
];

const seedMessages: ChatMessage[] = [
  { id: 'm1', ticketId: 't2', senderEmail: 'jane@company.com', senderName: 'Jane Doe', senderRole: 'customer', message: 'The network dropped again just now. This is really affecting our work.', isAdmin: false, createdAt: day(-2) },
  { id: 'm2', ticketId: 't2', senderEmail: 'tech@fixora.com', senderName: 'Mike Obi', senderRole: 'technician', message: 'I understand the urgency. I\'m checking the router logs now. Can you confirm if the issue happens on both 2.4GHz and 5GHz bands?', isAdmin: true, createdAt: day(-2) },
  { id: 'm3', ticketId: 't2', senderEmail: 'jane@company.com', senderName: 'Jane Doe', senderRole: 'customer', message: 'It happens on both bands. We have an Ubiquiti UniFi setup.', isAdmin: false, createdAt: day(-1) },
  { id: 'm4', ticketId: 't1', senderEmail: 'customer@fixora.com', senderName: 'David Okonkwo', senderRole: 'customer', message: 'How long will this take to fix? I need my laptop for a presentation tomorrow.', isAdmin: false, createdAt: day(-1) },
  { id: 'm5', ticketId: 't1', senderEmail: 'bot@fixora.com', senderName: 'FIXORA', senderRole: 'bot', message: 'Hello David, welcome to Fixora. I\'m **FIXORA**, your AI support assistant.\n\nLet\'s diagnose your laptop boot issue together.\n\n**First question:**\n\nDoes the computer turn on at all? Do you see any lights or hear fans?', isAdmin: true, createdAt: day(-2) },
  { id: 'm6', ticketId: 't1', senderEmail: 'customer@fixora.com', senderName: 'David Okonkwo', senderRole: 'customer', message: 'It powers on but I get a blue screen with error code 0x0000007B.', isAdmin: false, createdAt: day(-2) },
  { id: 'm7', ticketId: 't1', senderEmail: 'bot@fixora.com', senderName: 'FIXORA', senderRole: 'bot', message: 'A blue screen with **0x0000007B** usually points to a boot-device issue.\n\n**You can try this now:**\n\n• Boot into Safe Mode.\n• Run System Restore to a point before the Windows update.\n\n**Next question:**\n\nWhen did this issue start? Was it after a specific event?', isAdmin: true, createdAt: day(-1) },
  { id: 'm8', ticketId: 't1', senderEmail: 'customer@fixora.com', senderName: 'David Okonkwo', senderRole: 'customer', message: 'Yes, it started right after the latest Windows update.', isAdmin: false, createdAt: day(-1) },
  { id: 'm9', ticketId: 't1', senderEmail: 'bot@fixora.com', senderName: 'FIXORA', senderRole: 'bot', message: 'Thanks, David. A blue screen with **0x0000007B** right after a Windows update points to a boot-device or driver conflict.\n\n**Step-by-step fix:**\n\n1. Boot into Safe Mode.\n2. Run System Restore to a point before the Windows update.\n3. If that doesn\'t help, check the disk drive connection in your BIOS.\n\n**Related guides:**\n\n• How to troubleshoot boot issues\n• Windows blue screen error guide\n\nTry the steps above and let me know if your issue is resolved.\n\nIf you\'re still having trouble, you can request a technician below; I\'ve prepared your case for them.', isAdmin: true, createdAt: day(-1) },
  { id: 'm10', conversationId: 'conv1', senderEmail: 'tech@fixora.com', senderName: 'Mike Obi', senderRole: 'technician', message: 'Anyone free to take the CCTV outage in Port Harcourt tomorrow?', isAdmin: true, createdAt: day(-1) },
  { id: 'm11', conversationId: 'conv1', senderEmail: 'manager@fixora.com', senderName: 'Sarah Chen', senderRole: 'support_manager', message: 'Grace, can you cover it?', isAdmin: true, createdAt: day(-1) },
  { id: 'm12', conversationId: 'conv2', senderEmail: 'admin@fixora.com', senderName: 'Ibrahim O. Akande', senderRole: 'super_admin', message: 'Review the AI routing logs when you get a chance.', isAdmin: true, createdAt: day(-2) },
  { id: 'm13', conversationId: 'conv4', senderEmail: 'field@fixora.com', senderName: 'Grace Adeyemi', senderRole: 'field_technician', message: 'Confirming I can cover Port Harcourt tomorrow.', isAdmin: true, createdAt: day(-1) },
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
  recoveryMode: boolean;
  initAuth: () => Promise<void>;
  loadSharedData: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ ok: boolean; mfaRequired?: boolean }>;
  verifyMfa: (code: string) => Promise<boolean>;
  demoLogin: (email: string) => boolean;
  resetPassword: (email: string, newPassword: string) => boolean;
  completePasswordReset: (password: string) => Promise<boolean>;
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
  autoRouteTicket: (id: string) => Promise<import('../lib/agent').AutoRouteResult | null>;

  // Bookings
  bookings: Booking[];
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => void;
  updateBooking: (id: string, data: Partial<Booking>) => void;

  // Chat
  chatMessages: ChatMessage[];
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'createdAt'>) => void;
  aiChatReply: (ticketId: string, text: string) => void;

  // Staff chats
  conversations: Conversation[];
  createConversation: (participantIds: string[], title?: string) => string | null;
  staffChatReply: (conversationId: string, text: string) => void;

  // Contact
  contactMessages: ContactMessage[];
  addContactMessage: (msg: Omit<ContactMessage, 'id' | 'createdAt' | 'isRead'>) => void;
  markContactRead: (id: string) => void;

  // Payments
  payments: Payment[];
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt' | 'reference' | 'transactionId'> & Partial<Pick<Payment, 'id' | 'createdAt' | 'reference' | 'transactionId'>>) => void;
  updatePayment: (id: string, data: Partial<Payment>) => void;
  changePlan: (userId: string, plan: string, amount: number) => void;

  // Sync health
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncedAt: string | null;

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

const BOT_EMAIL = 'bot@fixora.com';
const BOT_NAME = 'FIXORA';

// Bounded recovery attempts: after the knowledge-base fix fails, the AI gets up
// to this many chances to reason through an alternative solution before the
// ticket is handed to a technician.
const MAX_BOT_RECOVERY_TRIES = 2;

function setBotTyping(ticketId: string, active: boolean) {
  useStore.setState(s => ({
    typingUsers: active
      ? [...s.typingUsers.filter(t => !(t.ticketId === ticketId && t.email === BOT_EMAIL)), { ticketId, email: BOT_EMAIL, name: BOT_NAME, expiresAt: Date.now() + 30000 }]
      : s.typingUsers.filter(t => !(t.ticketId === ticketId && t.email === BOT_EMAIL)),
  }));
}

function fallbackReply(mode: 'triage' | 'chat' | 'recovery', category: TicketCategory, step: number, answer: string): string {
  if (mode === 'triage') {
    return getDiagnosticResponse(category, step, answer, useStore.getState().kbArticles);
  }
  if (mode === 'recovery') {
    return "I'm sorry the suggested steps didn't fix it. I've passed your case to a technician who will take over shortly.";
  }
  return "Thanks, I've noted your message. A Fixora specialist will get back to you shortly. If it's urgent, request a technician to escalate.";
}

// Strong signals that the customer is unhappy with the BOT's help. Used only for
// post-triage tickets so auto-routing stays driven by explicit dissatisfaction.
function isCustomerDissatisfied(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  const signals = [
    'need a technician', 'need a person', 'need a human', 'talk to a technician',
    'talk to a person', 'talk to a human', 'speak to a technician', 'speak to a person',
    'transfer me', 'transfer to a technician', 'not resolved', 'not fixed yet',
    'still broken', 'still not working', 'still having the issue', "didn't help",
    'did not help', 'not satisfied', 'please escalate', 'escalate this', 'no luck fixing',
  ];
  return signals.some(s => t.includes(s));
}

// Strong signals that the customer is happy with the BOT's help / the issue is fixed.
function isResolvedSignal(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  return [
    'it worked', 'that worked', 'this worked', "it's fixed", 'it is fixed', 'issue fixed',
    'fixed it', 'that did it', 'that sorted it', 'working now', 'working again',
    'problem solved', 'that helped', 'solved the issue', 'got it working', "it's working",
    'fixed now', 'all good now', 'no longer an issue', 'no more issue', 'resolved, thanks',
    'issue resolved', 'resolved now', 'all sorted', 'perfect, thanks', 'great, thanks',
    'thank you, that', 'thanks, that', 'appreciate the help', 'thanks for the help',
  ].some(s => t.includes(s));
}

// The customer explicitly asks for the ticket to be closed.
function isCloseSignal(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  return [
    'close the ticket', 'close it', 'close this ticket', 'close my ticket',
    'you can close', 'please close', 'mark it closed', 'mark as closed',
    'close now', 'close the ticket please',
  ].some(s => t.includes(s));
}

const AI_STATUSES: ReadonlySet<string> = new Set(['open', 'in_progress', 'resolved', 'closed', 'escalated']);

// Deterministic status inference used when the live AI isn't configured or is offline.
function inferSuggestedStatus(text: string): AgentStatus {
  if (isCloseSignal(text)) return 'closed';
  if (isCustomerDissatisfied(text)) return 'escalated';
  if (isResolvedSignal(text)) return 'resolved';
  return 'in_progress';
}

// Staff conversations: the bot only joins when called by its name (FIXORA).
function isBotMentioned(text: string): boolean {
  return /\bfixora\b/i.test(text || '');
}

function staffRoster(users: User[]): { name: string; role: string }[] {
  return users
    .filter(u => u.role !== 'customer' && u.role !== 'bot')
    .map(u => ({ name: u.name, role: u.role }));
}

function staffFallbackReply(text: string): string {
  const kb = useStore.getState().kbArticles.filter(a => a.isPublished);
  const words = (text || '').toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const hits = kb.filter(a => {
    const hay = `${a.title} ${a.category} ${(a.tags ?? []).join(' ')}`.toLowerCase();
    return words.some(w => hay.includes(w));
  }).slice(0, 2);
  if (hits.length > 0) {
    return 'I found these in the knowledge base that may help:\n\n' +
      hits.map(a => `• **${a.title}**`).join('\n') +
      '\n\nAsk me and I can pull up the full guide.';
  }
  return "I'm FIXORA. I don't have a perfect answer in my knowledge base for that right now. If it's urgent, tag a technician to pick it up directly.";
}

async function runStaffTurn(conversationId: string, text: string) {
  const snapshot = useStore.getState();
  const conv = snapshot.conversations.find(c => c.id === conversationId);
  if (!conv) {
    setBotTyping(conversationId, false);
    return;
  }
  const transcript = snapshot.chatMessages
    .filter(m => m.conversationId === conversationId)
    .slice(-12)
    .map(m => ({ senderRole: m.senderRole, isAdmin: m.isAdmin, message: m.message }));
  const staff = staffRoster(snapshot.users);
  const participants = conv.participantIds
    .map(id => snapshot.users.find(u => u.id === id))
    .filter((u): u is User => Boolean(u))
    .map(u => ({ name: u.name, role: u.role }));
  const kb = snapshot.kbArticles.slice(0, 3).map(a => ({ title: a.title, content: a.content }));

  let reply: string;
  if (isSupabaseConfigured()) {
    const result = await requestAgentReply({
      mode: 'staff',
      conversation: { title: conv.title, participants },
      staff,
      transcript,
      answer: text,
      kb,
    });
    reply = result?.enabled && result.reply ? result.reply : staffFallbackReply(text);
  } else {
    reply = staffFallbackReply(text);
  }

  const now = new Date().toISOString();
  useStore.setState(s => ({
    chatMessages: [
      ...s.chatMessages,
      {
        id: `m${Date.now()}b`,
        conversationId,
        senderEmail: BOT_EMAIL,
        senderName: 'FIXORA',
        senderRole: 'bot' as const,
        message: reply,
        isAdmin: true,
        createdAt: now,
      },
    ],
    conversations: s.conversations.map(c => c.id === conversationId ? { ...c, lastMessageAt: now } : c),
    typingUsers: s.typingUsers.filter(t => !(t.ticketId === conversationId && t.email === BOT_EMAIL)),
  }));
}

async function runAgentTurn(ticketId: string, step: number, answer: string, mode: 'triage' | 'chat' | 'recovery') {
  const snapshot = useStore.getState();
  const ticket = snapshot.tickets.find(t => t.id === ticketId);
  if (!ticket || !ticket.category) {
    setBotTyping(ticketId, false);
    return;
  }
  const transcript = snapshot.chatMessages
    .filter(m => m.ticketId === ticketId)
    .slice(-12)
    .map(m => ({ senderRole: m.senderRole, isAdmin: m.isAdmin, message: m.message }));

  let reply: string;
  let completed = false;
  let aiStatus: AgentStatus | undefined;
  let aiEscalate = false;
  let aiReplyAvailable = false;
  if (isSupabaseConfigured()) {
    const result = await requestAgentReply(
      buildAgentPayload(
        {
          id: ticketId,
          title: ticket.title,
          description: ticket.description,
          category: ticket.category,
          priority: ticket.priority,
          productItem: ticket.productItem,
          issueTrigger: ticket.issueTrigger,
          triageStep: step,
        },
        transcript,
        answer,
        mode,
        snapshot.kbArticles,
        staffRoster(snapshot.users)
      )
    );
    if (result?.enabled && result.reply) {
      reply = result.reply;
      aiReplyAvailable = true;
      completed = result.completed === true;
      aiStatus = result.status;
      aiEscalate = result.escalate === true;
    } else {
      reply = fallbackReply(mode, ticket.category, step, answer);
      if (mode === 'triage') completed = step + 1 >= getTriageFlow(ticket.category).questions.length;
    }
  } else {
    reply = fallbackReply(mode, ticket.category, step, answer);
    if (mode === 'triage') completed = step + 1 >= getTriageFlow(ticket.category).questions.length;
  }

  // Recovery mode: the knowledge-base fix already failed. The AI gets one solid
  // attempt to reason through the best alternative solution; if it can't help
  // (or the live AI is unavailable), hand off to a technician instead of
  // looping the customer back through more self-service.
  if (mode === 'recovery') {
    setBotTyping(ticketId, false);
    if (!aiReplyAvailable || aiEscalate) {
      useStore.getState().requestTechnician(ticketId, `${BOT_NAME} exhausted self-service options: "${answer.trim()}"`);
      return;
    }
  }

  if (mode === 'triage' && completed) {
    reply = `${reply}\n\n**Did these steps resolve your issue?**\nIf not, tap **"Not Resolved: Request Technician"** below and a specialist will take over immediately. If it's fixed, tap **"Issue Fixed: No Need"** and we'll close the ticket.`;
  }

  // The AI determines which status the ticket should move to.
  let suggestedStatus: AgentStatus | undefined;
  if (mode === 'chat') {
    suggestedStatus = aiStatus && AI_STATUSES.has(aiStatus) ? aiStatus : inferSuggestedStatus(answer);
  }

  const now = new Date().toISOString();
  useStore.setState(s => ({
    tickets: s.tickets.map(t =>
      t.id === ticketId && mode === 'triage'
        ? {
            ...t,
            triageStep: (t.triageStep ?? 0) + 1,
            triageStatus: completed ? ('needs_technician' as const) : t.triageStatus,
            updatedAt: now,
          }
        : t.id === ticketId && mode === 'chat' && suggestedStatus && suggestedStatus !== t.status
          ? {
              ...t,
              status: suggestedStatus,
              triageStatus: ['resolved', 'closed', 'escalated'].includes(suggestedStatus) ? undefined : t.triageStatus,
              resolvedBy: suggestedStatus === 'resolved' ? BOT_NAME : t.resolvedBy,
              resolutionNotes: suggestedStatus === 'resolved'
                ? (t.resolutionNotes ?? `Resolved via ${BOT_NAME} conversation`)
                : t.resolutionNotes,
              escalationLevel: suggestedStatus === 'escalated' ? (t.escalationLevel ?? 0) + 1 : t.escalationLevel,
              updatedAt: now,
              activityLogs: [...t.activityLogs, { id: uuid(), user: t.createdByName, action: `${BOT_NAME} moved ticket to ${suggestedStatus.replace(/_/g, ' ')}`, entityType: 'ticket', entityId: t.id, timestamp: now }],
            }
          : t
    ),
    chatMessages: [
      ...s.chatMessages,
      {
        id: `m${Date.now()}b`,
        ticketId,
        senderEmail: BOT_EMAIL,
        senderName: 'FIXORA',
        senderRole: 'bot' as const,
        message: reply,
        isAdmin: true,
        createdAt: now,
      },
    ],
    typingUsers: s.typingUsers.filter(t => !(t.ticketId === ticketId && t.email === BOT_EMAIL)),
  }));

  if (suggestedStatus === 'escalated') {
    const latest = useStore.getState();
    const escalated = latest.tickets.find(t => t.id === ticketId);
    if (escalated && escalated.status === 'escalated') {
      latest.users
        .filter(u => u.role === 'super_admin' || u.role === 'support_manager')
        .forEach(admin => {
          latest.addNotification({
            userEmail: admin.email,
            title: `Ticket escalated by ${BOT_NAME}`,
            message: `The ${BOT_NAME} marked "${escalated.title}" as escalated after the conversation indicated the issue wasn't resolved.`,
            type: 'ticket',
            link: `/tickets/${ticketId}`,
          });
        });
    }
  }

  // NOTE: no auto-route here. The FIXORA BOT resolves the issue first; the ticket is
  // only routed to a technician when the customer explicitly says it isn't resolved
  // (requestTechnician) or when the ticket bypasses the BOT entirely (critical / staff).
}

// ---------------------------------------------------------------------------
// Shared state helpers; every role reads and writes the SAME data through a
// single Supabase row (see src/lib/sync.ts + migrations/0003_shared_state.sql)
// so the admin, technician, and customer dashboards stay correlated.
// ---------------------------------------------------------------------------

function buildSharedState(
  s: Pick<AppState, 'tickets' | 'chatMessages' | 'conversations' | 'bookings' | 'payments' | 'users' | 'contactMessages' | 'notifications' | 'kbArticles'>
): SharedState {
  // In live mode the demo seed rows must never leave the browser: the DB tables
  // are the source of truth and charts must reflect real rows only.
  const strip = isSupabaseConfigured()
    ? <T extends { id: string }>(items: T[]): T[] => stripDemoBusiness(items)
    : <T,>(items: T[]): T[] => items;
  return {
    tickets: strip(s.tickets),
    chatMessages: strip(s.chatMessages),
    conversations: strip(s.conversations),
    bookings: strip(s.bookings),
    payments: strip(s.payments),
    users: s.users
      .filter(u => !isSupabaseConfigured() || !DEMO_SEED_IDS.has(u.id))
      .map(u => {
        const { password: _pw, ...rest } = u;
        return rest;
      }),
    contactMessages: strip(s.contactMessages),
    notifications: strip(s.notifications),
    kbArticles: s.kbArticles,
  };
}

/**
 * Merge remote (database) items with local items by id. Remote wins for
 * matching ids; local-only items are kept so they persist on the next save.
 * `preserve` copies a local field onto a remote item when the remote lacks it
 * (e.g. the demo seed password that must not be written to the database).
 * Returns the original `local` array when nothing actually changed.
 */
function mergeById<T extends { id: string }>(
  local: T[],
  remote: T[] | undefined,
  preserve: (keyof T)[] = []
): T[] {
  if (!remote || remote.length === 0) return local;
  const out: T[] = [];
  const seen = new Set<string>();
  let changed = false;
  for (const r of remote) {
    seen.add(r.id);
    const l = local.find(x => x.id === r.id);
    if (!l) {
      changed = true;
      out.push(r);
      continue;
    }
    let item: T = r;
    for (const k of preserve) {
      if (l[k] !== undefined) item = { ...item, [k]: l[k] };
    }
    if (JSON.stringify(item) !== JSON.stringify(l)) {
      changed = true;
      out.push(item);
    } else {
      out.push(l);
    }
  }
  for (const l of local) {
    if (!seen.has(l.id)) {
      changed = true;
      out.push(l);
    }
  }
  return changed ? out : local;
}

/** Keep the store's user directory in sync with everyone who signs in. */
function ensureUserInStore(user: User): void {
  const { users } = useStore.getState();
  const existing = users.find(u => u.id === user.id);
  if (existing) {
    if (JSON.stringify(existing) !== JSON.stringify(user)) {
      useStore.setState(s => ({ users: s.users.map(u => (u.id === user.id ? { ...u, ...user } : u)) }));
    }
  } else {
    useStore.setState(s => ({ users: [...s.users, user] }));
  }
}

/** Demo seed accounts that must never appear in a live (Supabase) deployment. */
const DEMO_SEED_IDS = new Set(['1', '2', '3', '4', '5', '6', '7']);

/**
 * Demo seed business rows (tickets/bookings/payments/chat/notifications/contact).
 * In live mode these must never be mirrored to the database; the DB tables are
 * the source of truth and stay empty until real activity, so dashboard charts
 * correlate with actual rows instead of sample data.
 */
const DEMO_BUSINESS_IDS = new Set<string>([
  ...seedTickets, ...seedBookings, ...seedPayments, ...seedMessages, ...seedConversations, ...seedNotifications, ...seedContacts,
].map(x => x.id));

function stripDemoBusiness<T extends { id: string }>(items: T[]): T[] {
  return items.filter(i => !DEMO_BUSINESS_IDS.has(i.id));
}

interface DbProfile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  organization: string | null;
  org_owner_email?: string | null;
  avatar?: string | null;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  created_at?: string;
}

/** Map a public.profiles row onto the app's User shape (identity fields only). */
function mapProfileToUser(p: DbProfile): User {
  const email = (p.email ?? '').toLowerCase();
  return {
    id: p.id,
    email: p.email ?? '',
    name: p.name ?? p.email?.split('@')[0] ?? 'User',
    role: resolveProfileRole(email, (p.role as User['role']) ?? 'customer'),
    organization: p.organization ?? undefined,
    orgOwnerEmail: p.org_owner_email ?? undefined,
    avatar: p.avatar ?? undefined,
    phone: p.phone ?? undefined,
    location: p.location ?? undefined,
    bio: p.bio ?? undefined,
    createdAt: p.created_at ?? new Date().toISOString(),
  };
}

/**
 * Reconcile the store's user directory with the real registered users in the
 * database (profiles mirrors auth.users). Demo seed accounts are dropped so the
 * admin dashboard correlates with the database; admin-added employees and other
 * store-only users that aren't in the database are kept. Existing fields on a
 * matching user (password, skills, ...) are preserved.
 */
function reconcileUsersWithDb(users: User[], profiles: DbProfile[]): User[] {
  const out: User[] = [];
  const seenEmails = new Set<string>();
  for (const p of profiles) {
    const email = (p.email ?? '').toLowerCase();
    if (!email || seenEmails.has(email)) continue;
    seenEmails.add(email);
    const ex = users.find(u => u.id === p.id);
    out.push(ex ? { ...ex, ...mapProfileToUser(p) } : mapProfileToUser(p));
  }
  for (const u of users) {
    if (DEMO_SEED_IDS.has(u.id)) continue;
    const email = (u.email ?? '').toLowerCase();
    if (!email || seenEmails.has(email)) continue;
    seenEmails.add(email);
    out.push(u);
  }
  return out;
}

/**
 * Fetch the real registered users from the database. Staff (with migration
 * 0004 applied) read every profile; other roles read only their own row, which
 * still lets the shared state drop the demo seeds on every live device.
 * Returns null when not in live mode or the query fails.
 */
async function loadDbProfiles(): Promise<DbProfile[] | null> {
  if (!isSupabaseConfigured()) return null;
  if (!useStore.getState().currentUser) return null;
  try {
    const { data } = await getSupabase().from('profiles').select('*').limit(2000);
    return (data ?? []) as unknown as DbProfile[];
  } catch {
    return null;
  }
}

async function loadDbContactMessages(): Promise<ContactMessage[] | null> {
  try {
    const { data } = await getSupabase().from('contact_messages').select('*').limit(500);
    if (!data) return null;
    return (data as Array<Record<string, unknown>>).map(r => ({
      id: String(r.id ?? ''),
      name: String(r.name ?? ''),
      email: String(r.email ?? ''),
      subject: String(r.subject ?? ''),
      message: String(r.message ?? ''),
      isRead: Boolean(r.read ?? false),
      createdAt: String(r.created_at ?? new Date().toISOString()),
    }));
  } catch {
    return null;
  }
}

function startSharedPolling(): void {
  stopSharedPolling();
  pollTimer = setInterval(() => {
    const s = useStore.getState();
    if (!s.currentUser || !isSupabaseConfigured()) return;
    if (Date.now() - lastLocalMutation < 2_000) return;
    void s.loadSharedData();
  }, POLL_MS);
  focusHandler = () => {
    const s = useStore.getState();
    if (!s.currentUser || !isSupabaseConfigured()) return;
    if (Date.now() - lastLocalMutation < 2_000) return;
    void s.loadSharedData();
  };
  window.addEventListener('focus', focusHandler);
}

function stopSharedPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (focusHandler) {
    window.removeEventListener('focus', focusHandler);
    focusHandler = null;
  }
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      darkMode: true,
      toggleDarkMode: () => set(s => ({ darkMode: !s.darkMode })),

      currentUser: null,
      recoveryMode: false,
      syncStatus: 'idle' as const,
      lastSyncedAt: null,
      loadSharedData: async () => {
        if (!isSupabaseConfigured()) return;
        set({ syncStatus: 'syncing' });
        try {
          const loaded = await loadSharedState();
          const shared = loaded?.data ?? null;
          if (loaded) lastSharedVersion = loaded.version;
          const profiles = await loadDbProfiles();
          const isStaff = ['super_admin', 'support_manager', 'technician', 'field_technician'].includes(get().currentUser?.role ?? '');
          const [dbContacts, db] = await Promise.all([
            isStaff ? loadDbContactMessages() : Promise.resolve(null),
            loadDbCollections(),
          ]);
          syncing = true;
          try {
            set(s => {
              if (!shared) {
                // First run: seed the shared row from the current store state.
                const seeded = buildSharedState(s);
                if (profiles) seeded.users = (seeded.users as User[]).filter(u => !DEMO_SEED_IDS.has(u.id));
                void saveSharedState(seeded);
                if (profiles) return { users: reconcileUsersWithDb(s.users, profiles) };
                return {};
              }
              let users = mergeById(s.users, shared.users as User[], ['password']);
              if (profiles) users = reconcileUsersWithDb(users, profiles);
              const contactMessages = dbContacts
                ? mergeById(mergeById(s.contactMessages, dbContacts), shared.contactMessages as ContactMessage[])
                : mergeById(s.contactMessages, shared.contactMessages as ContactMessage[]);
              // DB rows are merged last so the business tables win (authoritative).
              // Demo seed rows are stripped so live charts show real data only.
              return {
                tickets: stripDemoBusiness(mergeById(mergeById(s.tickets, shared.tickets as Ticket[]), db?.tickets)),
                chatMessages: stripDemoBusiness(mergeById(mergeById(s.chatMessages, shared.chatMessages as ChatMessage[]), db?.chatMessages)),
                conversations: stripDemoBusiness(mergeById(s.conversations, shared.conversations as Conversation[])),
                bookings: stripDemoBusiness(mergeById(mergeById(s.bookings, shared.bookings as Booking[]), db?.bookings)),
                payments: stripDemoBusiness(mergeById(mergeById(s.payments, shared.payments as Payment[]), db?.payments)),
                users,
                contactMessages: stripDemoBusiness(contactMessages),
                notifications: stripDemoBusiness(mergeById(mergeById(s.notifications, shared.notifications as Notification[]), db?.notifications)),
                kbArticles: mergeById(mergeById(s.kbArticles, shared.kbArticles as KBArticle[]), db?.kbArticles),
              };
            });
          } finally {
            syncing = false;
          }
          set({ syncStatus: 'idle', lastSyncedAt: new Date().toISOString() });
        } catch {
          set({ syncStatus: 'error' });
        }
      },
      initAuth: async () => {
        if (!isSupabaseConfigured()) return;
        getSupabase().auth.onAuthStateChange((event, session) => {
          if (event === 'PASSWORD_RECOVERY') {
            recoveryPending = true;
            set({ recoveryMode: true, currentUser: null });
            return;
          }
          if (event === 'SIGNED_OUT') {
            recoveryPending = false;
            stopSharedPolling();
            set({ currentUser: null, recoveryMode: false, syncStatus: 'idle', lastSyncedAt: null });
            return;
          }
          if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user && !recoveryPending && !get().recoveryMode) {
            void (async () => {
              try {
                const profile = await buildProfileFromAuthUser(session.user);
                ensureUserInStore(profile);
                set({ currentUser: profile });
                await get().loadSharedData();
                startSharedPolling();
              } catch { /* ignore */ }
            })();
          }
        });
        try {
          const { data } = await getSupabase().auth.getSession();
          if (data.session?.user && !recoveryPending && !get().recoveryMode) {
            const profile = await buildProfileFromAuthUser(data.session.user);
            ensureUserInStore(profile);
            set({ currentUser: profile });
            await get().loadSharedData();
            startSharedPolling();
          }
        } catch { /* ignore */ }
      },
      login: async (email: string, password: string) => {
        const normalised = email.trim().toLowerCase();
          if (isSupabaseConfigured()) {
            try {
              const { data, error } = await getSupabase().auth.signInWithPassword({ email: normalised, password });
              if (error || !data.session) {
                // A valid sign-in that still needs its second factor. If the
                // user has a verified TOTP factor, start a challenge and ask
                // for the code.
                if (data.user && !data.session) {
                  try {
                    const factors = await getSupabase().auth.mfa.listFactors();
                    const factor = factors.data?.totp?.find(f => f.status === 'verified');
                    if (factor) {
                      const challenge = await getSupabase().auth.mfa.challenge({ factorId: factor.id });
                      if (challenge.data?.id) {
                        mfaPending = { factorId: factor.id, challengeId: challenge.data.id };
                        return { ok: false, mfaRequired: true };
                      }
                    }
                  } catch { /* fall through to generic failure */ }
                }
                return { ok: false };
              }
              recoveryPending = false;
              set({ recoveryMode: false });
              const profile = await buildProfileFromAuthUser(data.session.user);
              ensureUserInStore(profile);
              set({ currentUser: profile });
              await get().loadSharedData();
              startSharedPolling();
              return { ok: true };
            } catch { return { ok: false }; }
          }
        const user = get().users.find(u => u.email === normalised);
        if (user && user.password === password) {
          set({ currentUser: user });
          return { ok: true };
        }
        return { ok: false };
      },
      verifyMfa: async (code: string) => {
        if (!mfaPending) return false;
        try {
          const { error } = await getSupabase().auth.mfa.verify({
            factorId: mfaPending.factorId,
            challengeId: mfaPending.challengeId,
            code: code.trim(),
          });
          if (error) return false;
          mfaPending = null;
          recoveryPending = false;
          set({ recoveryMode: false });
          const { data: sessionData } = await getSupabase().auth.getSession();
          const user = sessionData.session?.user;
          if (!user) return false;
          const profile = await buildProfileFromAuthUser(user);
          ensureUserInStore(profile);
          set({ currentUser: profile });
          await get().loadSharedData();
          startSharedPolling();
          return true;
        } catch {
          return false;
        }
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
              ensureUserInStore(profile);
              set({ currentUser: profile });
              await get().loadSharedData();
              startSharedPolling();
              return { ok: true };
            }
            if (data.user) {
              const profile = await buildProfileFromAuthUser(data.user);
              ensureUserInStore(profile);
              return { ok: true, needsEmailConfirm: true };
            }
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
        recoveryPending = false;
        stopSharedPolling();
        set({ currentUser: null, recoveryMode: false });
      },
      completePasswordReset: async (password: string) => {
        if (!isSupabaseConfigured()) return false;
        try {
          const { error } = await getSupabase().auth.updateUser({ password });
          if (error) return false;
          await getSupabase().auth.signOut();
          recoveryPending = false;
          set({ recoveryMode: false, currentUser: null });
          return true;
        } catch { return false; }
      },

      users: seedUsers,
      updateUser: (id, data) => {
        set(s => ({ users: s.users.map(u => u.id === id ? { ...u, ...data } : u), currentUser: s.currentUser?.id === id ? { ...s.currentUser, ...data } : s.currentUser }));
        if (data.role && isSupabaseConfigured()) {
          void (async () => {
            try {
              await fetch('/api/role', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ userId: id, role: data.role }),
              });
            } catch { /* offline; store state still reflects the change */ }
          })();
        }
      },
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
          : buildHandoffGreeting(ticketData.createdByName, ticketData.priority, ticketData.title);
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
            senderName: 'FIXORA',
            senderRole: 'bot' as const,
            message: triageGreeting,
            isAdmin: true,
            createdAt: now,
          }],
        }));
        if (!triageActive) {
          setTimeout(() => void useStore.getState().autoRouteTicket(id), 1200);
        }
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
              ? { ...t, triageStatus: undefined, status: 'resolved' as const, resolvedBy: BOT_NAME, resolutionNotes: 'Resolved via AI self-service triage', updatedAt: now, activityLogs: [...t.activityLogs, { id: uuid(), user: t.createdByName, action: 'Resolved via AI triage, no technician needed', entityType: 'ticket', entityId: id, timestamp: now }] }
              : t
          ),
          chatMessages: [...s.chatMessages, {
            id: `m${Date.now()}`,
            ticketId: id,
            senderEmail: 'bot@fixora.com',
            senderName: 'FIXORA',
            senderRole: 'bot' as const,
            message: "That's wonderful to hear. Your issue is now resolved, and your ticket has been marked accordingly.\n\nIf you ever need help again, you can reach us anytime; just create a new ticket. Take care!",
            isAdmin: true,
            createdAt: now,
          }],
        };
      }),
      requestTechnician: (id: string, reason: string) => {
        const res = set(s => {
          const ticket = s.tickets.find(t => t.id === id);
          if (!ticket) return s;
          if (ticket.triageStatus === 'ai_diagnosing') return s;
          const now = new Date().toISOString();
          return {
            tickets: s.tickets.map(t =>
              t.id === id
                ? { ...t, triageStatus: 'escalated_to_technician' as const, status: 'in_progress' as const, updatedAt: now, activityLogs: [...t.activityLogs, { id: uuid(), user: t.createdByName, action: `Requested technician support: ${reason}`, entityType: 'ticket', entityId: id, timestamp: now }] }
                : t
            ),
            chatMessages: [...s.chatMessages, {
              id: `m${Date.now()}`,
              ticketId: id,
              senderEmail: 'bot@fixora.com',
              senderName: 'FIXORA',
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
        });
        const wasDiagnosing = get().tickets.find(t => t.id === id)?.triageStatus === 'ai_diagnosing';
        if (!wasDiagnosing) {
          setTimeout(() => void useStore.getState().autoRouteTicket(id), 400);
        }
        return res;
      },
      autoRouteTicket: async (id) => {
        const s = useStore.getState();
        const ticket = s.tickets.find(t => t.id === id);
        if (!ticket || ticket.assignedTo || ticket.status === 'resolved' || ticket.status === 'closed') return null;
        const technicians = s.users
          .filter(u => u.role === 'technician' || u.role === 'field_technician')
          .map(u => ({
            id: u.id,
            name: u.name,
            role: u.role as 'technician' | 'field_technician',
            location: u.location,
            bio: u.bio,
            skills: u.skills,
            load: getTechnicianLoad(s.tickets, u.id),
          }));
        if (technicians.length === 0) {
          s.addNotification({
            userEmail: 'admin@fixora.com',
            title: 'No technicians available',
            message: `Ticket "${ticket.title}" needs routing but the technician roster is empty.`,
            type: 'system',
            link: `/tickets/${id}`,
          });
          return null;
        }
        const result = await runAutoRoute(
          {
            id: ticket.id,
            title: ticket.title,
            description: ticket.description,
            category: ticket.category,
            priority: ticket.priority,
            productItem: ticket.productItem,
            issueTrigger: ticket.issueTrigger,
            coreCategory: ticket.coreCategory,
            escalated: ticket.escalationLevel > 0,
            slaDeadline: ticket.slaDeadline,
          },
          technicians
        );
        if (!result) return null;

        const now = new Date().toISOString();
        const latest = useStore.getState();
        const current = latest.tickets.find(t => t.id === id);
        if (!current || current.assignedTo || current.status === 'resolved' || current.status === 'closed') return result;
        const midTriage = current.triageStatus === 'ai_diagnosing';

        const tech = result.technicianId ? technicians.find(t => t.id === result.technicianId) : undefined;

        const patch: Partial<Ticket> = {
          aiRoutingReason: result.reason,
          updatedAt: now,
          activityLogs: [
            ...current.activityLogs,
            {
              id: uuid(),
              user: 'FIXORA AI',
              action: `Auto-routed (${result.enabled ? 'AI' : 'rules'}): ${tech ? `assigned to ${tech.name}` : 'unassigned'}, ${result.reason}`,
              entityType: 'ticket',
              entityId: id,
              timestamp: now,
            },
          ],
        };
        if (!midTriage) {
          if (result.category && result.category !== current.category) patch.category = result.category;
          if (result.priority && result.priority !== current.priority) patch.priority = result.priority;
        }
        if (tech) {
          patch.assignedTo = tech.id;
          patch.assignedRole = tech.role;
          patch.status = 'assigned';
        }
        useStore.setState(st => ({
          tickets: st.tickets.map(t => (t.id === id ? { ...t, ...patch } : t)),
        }));

        if (tech) {
          const techUser = latest.users.find(u => u.id === tech.id);
          if (techUser) {
            useStore.getState().addNotification({
              userEmail: techUser.email,
              title: 'Ticket assigned to you (AI routing)',
              message: `You have been assigned: ${current.title}`,
              type: 'assignment',
              link: `/tickets/${id}`,
            });
          }
          latest.bookings
            .filter(b => b.ticketId === id)
            .forEach(b => useStore.getState().updateBooking(b.id, { assignedTechnician: tech.id, status: 'confirmed' }));
        }

        const managers = latest.users.filter(u => u.role === 'super_admin' || u.role === 'support_manager');
        if (result.action === 'escalate' || result.priority === 'critical') {
          managers.forEach(m => {
            useStore.getState().addNotification({
              userEmail: m.email,
              title: 'Ticket escalated by AI routing',
              message: `${current.title} (${result.priority}): ${result.reason}`,
              type: 'system',
              link: `/tickets/${id}`,
            });
          });
        } else if (tech) {
          managers.forEach(m => {
            useStore.getState().addNotification({
              userEmail: m.email,
              title: 'AI routed ticket',
              message: `${current.title} → ${tech.name}. ${result.reason}`,
              type: 'assignment',
              link: `/tickets/${id}`,
            });
          });
        }

        return result;
      },
      submitTriageAnswer: (id: string, answer: string) => {
        const ticket = get().tickets.find(t => t.id === id);
        if (!ticket || !ticket.category) return;
        const step = ticket.triageStep ?? 0;
        const now = new Date().toISOString();
        const user = get().users.find(u => u.id === ticket.createdBy);
        const started = ticket.status === 'open';
        set(s => ({
          tickets: s.tickets.map(t =>
            t.id === id
              ? {
                  ...t,
                  status: started ? ('in_progress' as const) : t.status,
                  updatedAt: now,
                  activityLogs: [
                    ...(started ? [{ id: uuid(), user: t.createdByName, action: 'Conversation started, ticket moved to In Progress', entityType: 'ticket' as const, entityId: id, timestamp: now }] : []),
                    ...t.activityLogs,
                    { id: uuid(), user: t.createdByName, action: `AI triage: answered "${answer}"`, entityType: 'ticket', entityId: id, timestamp: now },
                  ],
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
        setBotTyping(id, true);
        void runAgentTurn(id, step, answer, 'triage');
      },

      aiChatReply: (ticketId: string, text: string) => {
        const ticket = get().tickets.find(t => t.id === ticketId);
        if (!ticket) return;
        if (ticket.assignedTo || ['resolved', 'closed', 'escalated'].includes(ticket.status) || ticket.triageStatus === 'escalated_to_technician') return;
        // After the BOT's resolution attempt, the customer says the knowledge-base
        // fix didn't work: give the AI a chance to reason through the best
        // alternative solution before routing to a technician. Bounded so a
        // dissatisfied customer can't loop through bot-only recovery forever.
        if (ticket.triageStatus === 'needs_technician' && isCustomerDissatisfied(text)) {
          if ((ticket.botRecoveryTries ?? 0) >= MAX_BOT_RECOVERY_TRIES) {
            get().requestTechnician(ticketId, `Customer reported the BOT did not resolve the issue: "${text.trim()}"`);
            return;
          }
          set(s => ({
            tickets: s.tickets.map(t =>
              t.id === ticketId
                ? { ...t, botRecoveryTries: (t.botRecoveryTries ?? 0) + 1, updatedAt: new Date().toISOString() }
                : t
            ),
          }));
          setBotTyping(ticketId, true);
          void runAgentTurn(ticketId, ticket.triageStep ?? 0, text, 'recovery');
          return;
        }
        const step = ticket.triageStep ?? 0;
        setBotTyping(ticketId, true);
        void runAgentTurn(ticketId, step, text, 'chat');
      },

      createConversation: (participantIds, title) => {
        const me = get().currentUser;
        if (!me || (me.role !== 'super_admin' && me.role !== 'support_manager')) return null;
        const ids = Array.from(new Set([me.id, ...participantIds]));
        if (ids.length < 2) return null;
        const now = new Date().toISOString();
        const id = `conv${Date.now()}`;
        const other = ids.filter(i => i !== me.id);
        const isDirect = other.length === 1;
        const fallbackTitle = isDirect
          ? get().users.find(u => u.id === other[0])?.name || 'Direct chat'
          : title?.trim() || 'Group chat';
        set(s => ({
          conversations: [...s.conversations, {
            id,
            type: isDirect ? 'direct' as const : 'group' as const,
            title: fallbackTitle,
            participantIds: ids,
            createdBy: me.id,
            createdAt: now,
            lastMessageAt: now,
          }],
        }));
        return id;
      },

      staffChatReply: (conversationId, text) => {
        const conversation = get().conversations.find(c => c.id === conversationId);
        if (!conversation) return;
        if (!isBotMentioned(text)) return;
        const me = get().currentUser;
        if (!me || !conversation.participantIds.includes(me.id)) return;
        setBotTyping(conversationId, true);
        void runStaffTurn(conversationId, text);
      },

      bookings: seedBookings,
      addBooking: (bookingData) => set(s => ({ bookings: [...s.bookings, { ...bookingData, id: `b${Date.now()}`, createdAt: new Date().toISOString() }] })),
      updateBooking: (id, data) => set(s => ({ bookings: s.bookings.map(b => b.id === id ? { ...b, ...data } : b) })),

      chatMessages: seedMessages,
      conversations: seedConversations,
      addChatMessage: (msg) => set(s => {
        const ticket = s.tickets.find(t => t.id === msg.ticketId);
        const started = ticket?.status === 'open';
        const now = new Date().toISOString();
        const message = { ...msg, id: `m${Date.now()}`, createdAt: now };
        return {
          chatMessages: [...s.chatMessages, message],
          tickets: started
            ? s.tickets.map(t => t.id === msg.ticketId
              ? { ...t, status: 'in_progress' as const, updatedAt: now, activityLogs: [...t.activityLogs, { id: uuid(), user: msg.senderName || t.createdByName, action: 'Conversation started, ticket moved to In Progress', entityType: 'ticket', entityId: t.id, timestamp: now }] }
              : t)
            : s.tickets,
          conversations: msg.conversationId
            ? s.conversations.map(c => c.id === msg.conversationId ? { ...c, lastMessageAt: now } : c)
            : s.conversations,
        };
      }),

      contactMessages: seedContacts,
      addContactMessage: (msg) => {
        const id = `c${Date.now()}`;
        const createdAt = new Date().toISOString();
        set(s => ({ contactMessages: [...s.contactMessages, { ...msg, id, createdAt, isRead: false }] }));
        void (async () => {
          try {
            await fetch('/api/contact', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(msg),
            });
          } catch { /* offline / demo mode; message stays local */ }
        })();
      },
      markContactRead: (id) => {
        set(s => ({ contactMessages: s.contactMessages.map(c => c.id === id ? { ...c, isRead: true } : c) }));
        if (isSupabaseConfigured()) {
          void (async () => {
            try { await getSupabase().from('contact_messages').update({ read: true }).eq('id', id); } catch { /* ignore */ }
          })();
        }
      },

      payments: seedPayments,
      addPayment: (payment) => set(s => ({
        payments: [...s.payments, {
          ...payment,
          id: payment.id ?? `p${Date.now()}`,
          reference: payment.reference ?? genRef(),
          transactionId: payment.transactionId ?? `TXN-${uuid().substring(0, 8).toUpperCase()}`,
          createdAt: payment.createdAt ?? new Date().toISOString(),
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
      markAllNotifsRead: () => set(s => ({
        notifications: s.notifications.map(n =>
          n.userEmail === s.currentUser?.email ? { ...n, isRead: true } : n
        ),
      })),

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
      version: 7,
      partialize: (state) => {
        if (isSupabaseConfigured()) {
          // Live mode: never persist tenant collections (tickets, chats,
          // payments, users, contact messages, KB...) to localStorage; they
          // contain PII and are already authoritative in Supabase. Only keep
          // the signed-in user's identity so a refresh restores the session.
          return Object.fromEntries(
            (Object.entries(state) as Array<[string, unknown]>).filter(([k]) => k === 'currentUser')
          );
        }
        return Object.fromEntries(
          (Object.entries(state) as Array<[string, unknown]>).filter(([k]) => k !== 'recoveryMode')
        );
      },
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;
        if (version < 7 && isSupabaseConfigured()) {
          const sensitive = ['tickets', 'chatMessages', 'bookings', 'payments', 'users', 'contactMessages', 'notifications', 'kbArticles'];
          sensitive.forEach(k => { delete state[k]; });
        }
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
        if (version < 6) {
          const users = state.users as Array<Record<string, unknown>> | undefined;
          const DEFAULT_SKILLS: Record<string, string[]> = {
            'tech@fixora.com': ['computer_repair', 'microsoft365', 'server', 'software', 'remote'],
            'field@fixora.com': ['cctv', 'printer', 'computer_repair', 'networking', 'internet'],
            'tech2@fixora.com': ['networking', 'internet', 'printer', 'cctv', 'server'],
          };
          if (Array.isArray(users)) {
            users.forEach(u => {
              if ((u.role === 'technician' || u.role === 'field_technician') && !Array.isArray(u.skills)) {
                const email = String(u.email ?? '');
                const skills = DEFAULT_SKILLS[email];
                if (skills) u.skills = skills;
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

/** Publish the current store to the shared row, retrying once on a stale-version conflict. */
async function persistShared(): Promise<void> {
  useStore.setState({ syncStatus: 'syncing' });
  const base = lastSharedVersion;
  const first = await saveSharedState(buildSharedState(useStore.getState()), base);
  if (first.conflict) {
    // Another writer landed first: reload, re-merge local state, then retry.
    await useStore.getState().loadSharedData();
    const second = await saveSharedState(buildSharedState(useStore.getState()), lastSharedVersion);
    if (second.ok && typeof second.version === 'number') {
      lastSharedVersion = second.version;
      useStore.setState({ syncStatus: 'idle', lastSyncedAt: new Date().toISOString() });
    }
    return;
  }
  if (first.ok && typeof first.version === 'number') {
    lastSharedVersion = first.version;
    useStore.setState({ syncStatus: 'idle', lastSyncedAt: new Date().toISOString() });
  }
}

useStore.subscribe((s, prev) => {
  const changed =
    s.currentUser?.id !== prev.currentUser?.id ||
    s.tickets !== prev.tickets ||
    s.chatMessages !== prev.chatMessages ||
    s.bookings !== prev.bookings ||
    s.payments !== prev.payments ||
    s.users !== prev.users ||
    s.contactMessages !== prev.contactMessages ||
    s.notifications !== prev.notifications ||
    s.kbArticles !== prev.kbArticles;
  if (!changed || syncing) return;
  lastLocalMutation = Date.now();
  if (!isSupabaseConfigured()) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void persistShared();
  }, 600);
});
