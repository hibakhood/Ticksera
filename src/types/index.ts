export type UserRole = 'super_admin' | 'support_manager' | 'technician' | 'field_technician' | 'customer' | 'bot';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  password?: string;
  orgOwnerEmail?: string;
  organization?: string;
  avatar?: string;
  phone?: string;
  location?: string;
  bio?: string;
  createdAt: string;
}

export type TicketStatus = 'open' | 'pending' | 'assigned' | 'in_progress' | 'waiting_customer' | 'escalated' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type TicketCategory = 'computer_repair' | 'networking' | 'printer' | 'cctv' | 'internet' | 'microsoft365' | 'server' | 'website' | 'software' | 'remote';
export type TriageStatus = 'ai_diagnosing' | 'needs_technician' | 'escalated_to_technician';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  screenshotUrls: string[];
  assignedTo?: string;
  assignedRole?: UserRole;
  createdBy: string;
  createdByName: string;
  resolutionNotes?: string;
  rating?: number;
  ratingComment?: string;
  slaDeadline?: string;
  escalationLevel: number;
  triageStatus?: TriageStatus;
  triageStep?: number;
  estimatedResolutionTime?: string;
  activityLogs: ActivityLog[];
  createdAt: string;
  updatedAt: string;
  // Routing wizard metadata
  clientSegment?: 'personal' | 'business';
  industryType?: string;
  coreCategory?: string;
  productItem?: string;
  issueTrigger?: string;
}

export interface Booking {
  id: string;
  serviceType: string;
  preferredDate: string;
  preferredTime: string;
  description: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  contactPhone: string;
  assignedTechnician?: string;
  sessionType: 'remote' | 'onsite';
  createdBy: string;
  createdAt: string;
  ticketId?: string;
}

export interface ChatMessage {
  id: string;
  ticketId: string;
  senderEmail: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  isAdmin: boolean;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  plan: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  reference: string;
  paymentMethod: string;
  renewalDate?: string;
  invoiceUrl?: string;
  transactionId: string;
  userId: string;
  createdAt: string;
}

export interface KBArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isPublished: boolean;
  helpfulCount: number;
  createdBy: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userEmail: string;
  title: string;
  message: string;
  type: 'ticket' | 'chat' | 'assignment' | 'booking' | 'payment' | 'system';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface Plan {
  name: string;
  price: number;
  currency: string;
  features: string[];
  ticketLimit: number | 'unlimited';
  recommended?: boolean;
}
