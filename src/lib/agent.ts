import type { KBArticle, TicketCategory, TicketPriority, Ticket } from '../types';
import { findKbArticles } from '../utils/triage';

export interface AgentReply {
  enabled: boolean;
  reply?: string;
  completed?: boolean;
  escalate?: boolean;
}

export interface AgentPayload {
  mode: 'triage' | 'chat';
  ticket: {
    id: string;
    title: string;
    description?: string;
    category?: TicketCategory;
    priority?: string;
    productItem?: string;
    issueTrigger?: string;
    triageStep?: number;
  };
  transcript: { senderRole?: string; isAdmin?: boolean; message?: string }[];
  answer: string;
  kb?: { title: string; content: string }[];
}

export function buildAgentPayload(
  ticket: AgentPayload['ticket'],
  transcript: AgentPayload['transcript'],
  answer: string,
  mode: AgentPayload['mode'],
  kbArticles: KBArticle[] = []
): AgentPayload {
  const kb = ticket.category ? findKbArticles(kbArticles, ticket.category, 4).map(a => ({ title: a.title, content: a.content })) : [];
  return { mode, ticket, transcript, answer, kb };
}

const CLIENT_TIMEOUT_MS = 25000;

export async function requestAgentReply(payload: AgentPayload): Promise<AgentReply | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as AgentReply;
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface TechnicianRouteInfo {
  id: string;
  name: string;
  role: 'technician' | 'field_technician';
  location?: string;
  bio?: string;
  skills?: string[];
  load: number;
}

export interface AutoRouteResult {
  enabled: boolean;
  category?: TicketCategory;
  priority?: TicketPriority;
  technicianId: string | null;
  action: 'assign' | 'escalate';
  reason: string;
}

export interface AutoRoutePayload {
  mode: 'auto-route';
  ticket: {
    id: string;
    title: string;
    description?: string;
    category?: TicketCategory;
    priority?: TicketPriority;
    productItem?: string;
    issueTrigger?: string;
    coreCategory?: string;
    escalated?: boolean;
    slaDeadline?: string;
  };
  technicians: TechnicianRouteInfo[];
}

const ACTIVE_STATUSES = new Set(['open', 'pending', 'assigned', 'in_progress', 'waiting_customer', 'escalated']);

export function getTechnicianLoad(tickets: Ticket[], techId: string): number {
  return tickets.filter(t => t.assignedTo === techId && ACTIVE_STATUSES.has(t.status)).length;
}

export function buildAutoRoutePayload(
  ticket: AutoRoutePayload['ticket'],
  technicians: TechnicianRouteInfo[]
): AutoRoutePayload {
  return { mode: 'auto-route', ticket, technicians };
}

export async function requestAutoRoute(payload: AutoRoutePayload): Promise<AutoRouteResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as AutoRouteResult;
    if (!data || typeof data !== 'object') return null;
    const validTechIds = new Set(payload.technicians.map(t => t.id));
    if (data.technicianId && !validTechIds.has(data.technicianId)) return null;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const CATEGORY_KEYWORDS: Record<TicketCategory, string[]> = {
  computer_repair: ['repair', 'computer', 'laptop', 'pc', 'desktop', 'hardware', 'boot', 'screen', 'battery'],
  networking: ['network', 'router', 'switch', 'vpn', 'wifi', 'wireless', 'unifi', 'access point'],
  printer: ['printer', 'print', 'toner', 'laserjet', 'cartridge'],
  cctv: ['cctv', 'camera', 'surveillance', 'dvr', 'nvr', 'recorder'],
  internet: ['internet', 'isp', 'connection', 'speed', 'broadband', 'drop', 'offline'],
  microsoft365: ['microsoft', '365', 'office', 'outlook', 'exchange', 'license', 'teams'],
  server: ['server', 'active directory', 'domain', 'backup', 'hyper-v', 'migration'],
  website: ['website', 'web', 'hosting', 'wordpress', 'domain', 'slow'],
  software: ['software', 'installation', 'autocad', 'install', 'application', 'license'],
  remote: ['remote', 'remote assistance', 'remote access', 'anydesk', 'teamviewer', 'vpn access'],
};

const ONSITE_CATEGORIES = new Set<TicketCategory>(['cctv', 'printer', 'computer_repair']);
const URGENT_HINTS = ['urgent', 'asap', 'emergency', 'down', 'offline', 'outage', 'outage', 'cannot work', "can't work", 'stopped', 'stop', 'crash', 'unavailable', 'breach'];

function normalize(s: string): string {
  return (s ?? '').toLowerCase();
}

export function deterministicAutoRoute(payload: AutoRoutePayload): AutoRouteResult {
  const { ticket, technicians } = payload;
  const category = ticket.category ?? 'computer_repair';
  const keywords = CATEGORY_KEYWORDS[category] ?? [category];

  const scored = technicians.map(t => {
    const haystack = normalize([t.name, t.bio, ...(t.skills ?? [])].join(' '));
    let score = keywords.reduce((acc, kw) => (haystack.includes(kw) ? acc + 1 : acc), 0);
    if (ONSITE_CATEGORIES.has(category) && t.role === 'field_technician') score += 2;
    if (!ONSITE_CATEGORIES.has(category) && t.role === 'technician') score += 1;
    return { t, score };
  });

  scored.sort((a, b) => (b.score - a.score) || (a.t.load - b.t.load));
  const best = scored[0];
  const technicianId = best ? best.t.id : null;

  const haystack = normalize(`${ticket.title} ${ticket.description ?? ''}`);
  const urgent = URGENT_HINTS.some(h => haystack.includes(h));
  const suggestHigh = urgent && (ticket.priority === 'low' || ticket.priority === 'medium');
  const priority: TicketPriority = suggestHigh ? 'high' : (ticket.priority ?? 'medium');

  const slaBreached = ticket.slaDeadline ? new Date(ticket.slaDeadline).getTime() < Date.now() : false;
  const escalated = ticket.escalated === true || ticket.priority === 'critical' || slaBreached;
  const action: 'assign' | 'escalate' = escalated ? 'escalate' : 'assign';

  let reason: string;
  if (!technicianId) {
    reason = 'No technician is currently available to handle this ticket.';
  } else if (best.score > 0) {
    const matched = best.t.skills?.length
      ? best.t.skills.filter(s => keywords.some(k => normalize(s).includes(k))).join(', ')
      : 'experience';
    reason = `Skill match: ${matched || best.t.name} (${best.t.load} active tickets).`;
  } else {
    reason = `Least-loaded technician (${best.t.load} active tickets); no exact skill match.`;
  }
  if (action === 'escalate') {
    reason = `Escalated: ${reason}`;
  }
  return { enabled: false, category, priority, technicianId, action, reason };
}

export async function runAutoRoute(
  ticket: AutoRoutePayload['ticket'],
  technicians: TechnicianRouteInfo[]
): Promise<AutoRouteResult> {
  const payload = buildAutoRoutePayload(ticket, technicians);
  if (technicians.length === 0) {
    return { enabled: false, technicianId: null, action: 'assign', reason: 'No technicians are available on the roster.' };
  }
  const ai = await requestAutoRoute(payload);
  if (ai) return { ...ai, technicianId: ai.technicianId ?? null };
  return deterministicAutoRoute(payload);
}
