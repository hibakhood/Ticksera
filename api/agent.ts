// FIXORA AI Agent — Vercel serverless function (Edge runtime).
// Provider-agnostic: calls any OpenAI-compatible /chat/completions endpoint.
//
// Env vars (set in Vercel):
//   AI_API_KEY   required to enable (e.g. OpenRouter sk-or-...)
//   AI_BASE_URL  default https://openrouter.ai/api/v1
//   AI_MODEL     default qwen/qwen3-32b (change to any :free model to use a free tier)
//
// When AI_API_KEY is missing this returns { enabled: false } and the client
// falls back to the deterministic rule-based bot.

export const config = {
  runtime: 'edge',
  maxDuration: 30,
};

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'qwen/qwen3-32b';
const KB_LIMIT = 3;
const TRANSCRIPT_LIMIT = 12;

interface AgentBody {
  mode: 'triage' | 'chat' | 'auto-route';
  ticket?: {
    title?: string;
    description?: string;
    category?: string;
    priority?: string;
    productItem?: string;
    issueTrigger?: string;
    triageStep?: number;
    coreCategory?: string;
    escalated?: boolean;
    slaDeadline?: string;
  };
  transcript?: { senderRole?: string; isAdmin?: boolean; message?: string }[];
  answer?: string;
  kb?: { title: string; content: string }[];
  technicians?: {
    id: string;
    name: string;
    role: string;
    location?: string;
    bio?: string;
    skills?: string[];
    load: number;
  }[];
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function buildSystemPrompt(body: AgentBody, kbContext: string): string {
  const t = body.ticket ?? {};
  const meta = [
    `Ticket title: ${t.title ?? '—'}`,
    `Description: ${t.description ?? '—'}`,
    `Category: ${t.category ?? '—'}`,
    `Priority: ${t.priority ?? '—'}`,
    t.productItem ? `Product: ${t.productItem}` : '',
    t.issueTrigger ? `Trigger: ${t.issueTrigger}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  if (body.mode === 'triage') {
    return [
      'You are FIXORA, the friendly AI support assistant for Fixora IT Support.',
      'A customer opened a ticket and you are diagnosing it step by step.',
      '',
      meta,
      '',
      kbContext,
      '',
      'Rules:',
      '- Keep replies short, warm and under 130 words.',
      '- Ask exactly ONE clear question at a time (max 3 follow-up questions total).',
      '- After each answer: acknowledge it briefly, suggest ONE concrete step to try now (from the KB when relevant), then ask the next question.',
      '- When you have enough information, give a concise step-by-step fix and finish.',
      '- If the issue seems urgent or beyond self-service (hardware failure, security breach, outage), say a technician may be needed.',
      '- Use **bold** and bullet points where helpful. Never claim to be human.',
      '',
      'Respond with VALID JSON only, exactly this shape:',
      '{"reply": "message for the customer", "completed": true|false, "escalate": true|false}',
      'Set completed:true only when you gave the step-by-step fix and need no more questions. Set escalate:true if a technician is definitely required.',
    ].join('\n');
  }

  if (body.mode === 'auto-route') {
    const roster = (body.technicians ?? [])
      .map(t =>
        [
          `- ${t.id} | ${t.name} | ${t.role.replace(/_/g, ' ')} | ${t.location ?? '—'}` +
          (t.skills?.length ? ` | skills: ${t.skills.join(', ')}` : '') +
          (t.bio ? ` | ${t.bio}` : '') +
          ` | active tickets: ${t.load}`,
        ].join('')
      )
      .join('\n');
    return [
      'You are the Fixora ticket routing engine. Route incoming tickets to the most suitable technician.',
      'A new or escalated ticket arrived and needs classification + assignment.',
      '',
      meta,
      `Escalated already: ${body.ticket?.escalated ? 'yes' : 'no'}`,
      `SLA deadline: ${body.ticket?.slaDeadline ?? '—'}`,
      '',
      'Available technicians:',
      roster || '(none)',
      '',
      'Rules:',
      '- Suggest a category (one of: computer_repair, networking, printer, cctv, internet, microsoft365, server, website, software, remote) and a priority (low/medium/high/critical).',
      '- Pick the technician whose skills/bio best match the issue, preferring the least-loaded one (fewest active tickets).',
      '- For onsite-style work (cctv, printer, computer_repair) prefer a field_technician; for remote work (remote, software, microsoft365) prefer a technician.',
      '- If the issue is urgent, a security breach, or a full outage, set action to "escalate" so managers are alerted (you may still assign a technician).',
      '- Set technicianId to exactly one id from the roster above. Set it to null only if no technician is suitable or one is clearly required for management review.',
      '- Write a concise reason (under 80 words) explaining the choice.',
      '',
      'Respond with VALID JSON only, exactly this shape:',
      '{"category": "category", "priority": "priority", "technicianId": "id or null", "action": "assign"|"escalate", "reason": "short explanation"}',
    ].join('\n');
  }

  return [
    'You are FIXORA, the friendly AI support assistant for Fixora IT Support.',
    'A customer is chatting with you inside a support ticket. Help them conversationally: answer questions, suggest next steps, or reassure them a human technician will join if needed.',
    '',
    meta,
    '',
    kbContext,
    '',
    'Rules:',
    '- Keep replies short, warm and under 100 words.',
    '- Use **bold** and bullet points where helpful. Never claim to be human.',
    '- If the issue is urgent or out of scope, suggest requesting a technician.',
    '',
    'Respond with plain text only (no JSON).',
  ].join('\n');
}

function extractJson(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  if (start < 0) return null;
  try {
    return JSON.parse(candidate.slice(start));
  } catch {
    // fall through
  }
  return null;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const apiKey = (process.env.AI_API_KEY ?? '').trim();
  if (!apiKey) return json({ enabled: false });

  let body: AgentBody;
  try {
    body = (await req.json()) as AgentBody;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const base = (process.env.AI_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const model = (process.env.AI_MODEL ?? DEFAULT_MODEL).trim();

  const kbContext =
    Array.isArray(body.kb) && body.kb.length > 0
      ? 'Relevant knowledge base articles:\n' +
        body.kb.slice(0, KB_LIMIT).map(a => `- ${a.title}: ${a.content}`).join('\n')
      : 'Knowledge base: (none available)';

  const transcript = Array.isArray(body.transcript)
    ? body.transcript.slice(-TRANSCRIPT_LIMIT).map(m => {
        const isAssistant = m.isAdmin || m.senderRole === 'bot' || m.senderRole === 'technician' || m.senderRole === 'support_manager';
        return { role: isAssistant ? ('assistant' as const) : ('user' as const), content: m.message ?? '' };
      })
    : [];

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: buildSystemPrompt(body, kbContext) },
    ...transcript,
    { role: 'user', content: body.answer ?? '' },
  ];

  try {
    const upstream = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
        'http-referer': 'https://fixora-enterprise.vercel.app',
        'x-title': 'FIXORA',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        max_tokens: 700,
      }),
    });

    if (!upstream.ok) {
      const text = (await upstream.text()).slice(0, 300);
      return json({ enabled: true, error: `upstream ${upstream.status}: ${text}` }, 200);
    }

    const data = (await upstream.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return json({ enabled: true, error: 'empty completion' }, 200);

    if (body.mode === 'triage') {
      const parsed = extractJson(content);
      if (parsed) {
        return json({
          enabled: true,
          reply: typeof parsed.reply === 'string' ? parsed.reply : content,
          completed: parsed.completed === true,
          escalate: parsed.escalate === true,
        });
      }
      return json({ enabled: true, reply: content });
    }

    if (body.mode === 'auto-route') {
      const parsed = extractJson(content);
      if (parsed) {
        const validIds = new Set((body.technicians ?? []).map(t => t.id));
        const validCategories = new Set(['computer_repair', 'networking', 'printer', 'cctv', 'internet', 'microsoft365', 'server', 'website', 'software', 'remote']);
        const validPriorities = new Set(['low', 'medium', 'high', 'critical']);
        const category = typeof parsed.category === 'string' && validCategories.has(parsed.category) ? parsed.category : (body.ticket?.category ?? 'computer_repair');
        const priority = typeof parsed.priority === 'string' && validPriorities.has(parsed.priority) ? parsed.priority : (body.ticket?.priority ?? 'medium');
        const rawTech = typeof parsed.technicianId === 'string' ? parsed.technicianId : '';
        const technicianId = validIds.has(rawTech) ? rawTech : null;
        const action = parsed.action === 'escalate' ? 'escalate' : 'assign';
        return json({
          enabled: true,
          category,
          priority,
          technicianId,
          action,
          reason: typeof parsed.reason === 'string' && parsed.reason.trim() ? parsed.reason.trim() : 'AI routing completed.',
        });
      }
      return json({ enabled: true, error: 'invalid auto-route response' }, 200);
    }

    return json({ enabled: true, reply: content });
  } catch (err) {
    return json({ enabled: true, error: err instanceof Error ? err.message : 'upstream error' }, 200);
  }
}
