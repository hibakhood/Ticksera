import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../store';
import { Link } from 'react-router-dom';
import { Sparkles, Send, Shield, RefreshCw, Zap, BookOpen, Ticket, CalendarCheck } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';

const STAFF_ROLES = ['super_admin', 'support_manager', 'technician', 'field_technician'];

const quickPrompts = [
  'How do I reset a password?',
  'Network is slow — what should I check?',
  'How do I book a technician?',
  'How do I create a ticket?',
];

interface ChatMsg {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

export default function Assistant() {
  const { currentUser, kbArticles } = useStore();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  if (!currentUser || !STAFF_ROLES.includes(currentUser.role)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center" style={{ marginBottom: '1rem' }}>
          <Shield className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h2>
        <p className="text-gray-500" style={{ marginTop: '0.5rem' }}>You don't have permission to view this page.</p>
      </div>
    );
  }

  const findAnswer = (question: string): string => {
    const q = question.toLowerCase();
    const words = q.split(/\s+/).filter(w => w.length > 3);
    const matches = kbArticles
      .filter(a => {
        const hay = `${a.title} ${a.tags.join(' ')} ${a.category} ${a.content}`.toLowerCase();
        return words.some(w => hay.includes(w)) || hay.includes(q);
      })
      .slice(0, 3);

    if (matches.length === 0) return 'no_match';

    const lines = matches.map(a => {
      const snippet = a.content.replace(/[#*`>]/g, '').trim().slice(0, 140);
      return `• ${a.title} — ${snippet}${a.content.length > 140 ? '…' : ''}`;
    });
    return `I found ${matches.length === 1 ? 'a helpful article' : `${matches.length} helpful articles`} in the knowledge base:\n\n${lines.join('\n\n')}`;
  };

  const pushMessage = (text: string) => {
    const userMsg: ChatMsg = { id: `u${Date.now()}`, role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setTyping(true);
    setTimeout(() => {
      const answer = findAnswer(text);
      let reply: string;
      if (answer === 'no_match') {
        reply = "I couldn't find an exact match in the knowledge base yet. You can create a ticket and our AI triage will run diagnostics, or book a session with a technician directly.";
      } else {
        reply = answer;
      }
      setMessages(prev => [...prev, { id: `a${Date.now()}`, role: 'ai', text: reply }]);
      setTyping(false);
    }, 750);
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || typing) return;
    setInput('');
    pushMessage(text);
  };

  const lastMsgIsAi = messages.length > 0 && messages[messages.length - 1].role === 'ai';

  return (
    <div className="space-y-6 animate-fade-in premium-surface rounded-2xl p-1">
      <PageHeader
        eyebrow="Fixora Assistant"
        title="AI Assistant"
        subtitle="Ask a question and get instant answers from the knowledge base — no ticket needed."
        actions={(
          <button
            onClick={() => setMessages([])}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-slate-500 dark:text-slate-400 text-sm font-medium hover:border-emerald-400 dark:hover:border-emerald-500 hover:text-emerald-600 transition-all"
          >
            <RefreshCw className="w-4 h-4" /> Clear chat
          </button>
        )}
      />

      <div className="card-premium bg-white dark:bg-dark-card border border-slate-200/80 dark:border-dark-border rounded-2xl overflow-hidden">
        {/* Chat body */}
        <div ref={scrollRef} className="h-[520px] overflow-y-auto p-5 lg:p-7 space-y-5 bg-slate-50/50 dark:bg-dark-bg/40">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="chip-icon w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25 mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-slate-900 dark:text-white text-lg">How can I help you today?</h3>
              <p className="text-sm text-slate-400 mt-1.5 max-w-sm">
                I'm trained on the Fixora knowledge base. Ask about troubleshooting steps, services, bookings, or how to create a ticket.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-md">
                {quickPrompts.map(p => (
                  <button
                    key={p}
                    onClick={() => pushMessage(p)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-emerald-400 dark:hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex items-start gap-3 max-w-[78%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    {m.role === 'ai' ? (
                      <div className="chip-icon w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25 flex-shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-700 dark:bg-slate-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {currentUser?.name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className="space-y-3">
                      <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                        m.role === 'user'
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 rounded-tr-sm'
                          : 'bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-300 rounded-tl-sm shadow-sm'
                      }`}>
                        {m.text}
                      </div>
                      {m.role === 'ai' && !m.text.includes("couldn't find an exact match") && (
                        <Link to="/knowledge-base" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
                          <BookOpen className="w-3.5 h-3.5" /> Open the Knowledge Base
                        </Link>
                      )}
                      {m.role === 'ai' && m.text.includes("couldn't find an exact match") && (
                        <div className="flex flex-wrap gap-2">
                          <Link to="/tickets/new" className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors">
                            <Ticket className="w-3.5 h-3.5" /> Create a ticket
                          </Link>
                          <Link to="/booking" className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-dark-card text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-dark-border hover:border-emerald-400 transition-colors">
                            <CalendarCheck className="w-3.5 h-3.5" /> Book a session
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex items-start gap-3">
                  <div className="chip-icon w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25 flex-shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex gap-1.5 px-4 py-3.5 bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl rounded-tl-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick prompts (when chat has started) */}
        {messages.length > 0 && (
          <div className="flex gap-2 px-5 pt-3 overflow-x-auto">
            {quickPrompts.map(p => (
              <button
                key={p}
                onClick={() => pushMessage(p)}
                disabled={typing}
                className="flex-shrink-0 px-3 py-1.5 rounded-full border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card text-xs font-medium text-slate-500 dark:text-slate-400 hover:border-emerald-400 dark:hover:border-emerald-500 hover:text-emerald-600 transition-all disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 lg:p-5 border-t border-slate-100 dark:border-dark-border bg-white dark:bg-dark-card">
          <form onSubmit={handleSend} className="flex items-center gap-3">
            <div className="relative flex-1">
              <Zap className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
              <input
                type="text"
                placeholder="Ask anything about Fixora services or troubleshooting..."
                value={input}
                onChange={e => setInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder-slate-400"
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || typing}
              className="w-11 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </form>
          {lastMsgIsAi && (
            <p className="text-[11px] text-slate-400 mt-2.5">
              <Sparkles className="w-3 h-3 inline mr-1 text-emerald-500" />
              Assistant responses come from the Fixora knowledge base. For unresolved issues, escalate to a ticket or a technician.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
