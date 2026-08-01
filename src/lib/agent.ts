import type { KBArticle, TicketCategory } from '../types';
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

const CLIENT_TIMEOUT_MS = 12000;

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
