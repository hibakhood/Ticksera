import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useStore } from '../../store';
import { useShallow } from 'zustand/react/shallow';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { TextArea, Select } from '../../components/ui/Input';
import { ArrowLeft, Send, Star, Clock, User, MessageSquare, AlertTriangle, Tag, Calendar, Paperclip, X, TrendingUp, CheckCircle, CalendarCheck, Bot, Wrench, Cpu } from 'lucide-react';
import type { TicketStatus } from '../../types';
import { getTriageFlow } from '../../utils/triage';
import { cleanTicketTitle } from '../../utils/ticketTitle';
import { isSupabaseConfigured } from '../../lib/supabase';
import { resolveAttachment } from '../../lib/uploads';
import FileAttachment from '../../components/ui/FileAttachment';
import TypingIndicator from '../../components/ui/TypingIndicator';
import ChatMessageText from '../../components/ui/ChatMessageText';

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple'> = {
  open: 'info', pending: 'warning', assigned: 'purple', in_progress: 'info',
  waiting_customer: 'warning', escalated: 'danger', resolved: 'success', closed: 'default',
};

const priorityVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  low: 'default', medium: 'warning', high: 'danger', critical: 'danger',
};

const coreCategoryLabels: Record<string, string> = {
  hardware: 'Hardware',
  software: 'Software',
  network: 'Network',
  security: 'Security',
  user_access: 'User Access',
};

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, tickets, updateTicket, chatMessages, addChatMessage, aiChatReply, users, addNotification, typingUsers, startTyping, stopTyping, bookings, updateBooking, requestTechnician, resolveViaTriage, submitTriageAnswer } = useStore(
    useShallow(s => ({
      currentUser: s.currentUser, tickets: s.tickets, updateTicket: s.updateTicket,
      chatMessages: s.chatMessages, addChatMessage: s.addChatMessage, aiChatReply: s.aiChatReply,
      users: s.users, addNotification: s.addNotification,
      typingUsers: s.typingUsers, startTyping: s.startTyping, stopTyping: s.stopTyping,
      bookings: s.bookings, updateBooking: s.updateBooking,
      requestTechnician: s.requestTechnician,
      resolveViaTriage: s.resolveViaTriage,
      submitTriageAnswer: s.submitTriageAnswer,
    }))
  );
  const ticket = tickets.find(t => t.id === id);
  const [msg, setMsg] = useState('');
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [resNotes, setResNotes] = useState('');
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalateSubmitted, setEscalateSubmitted] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const chatFileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (simTimer.current) clearTimeout(simTimer.current);
    };
  }, []);

  const whoTyping = id
    ? typingUsers
        .filter(t => t.ticketId === id && t.email !== currentUser?.email && t.expiresAt > Date.now())
        .map(t => t.name)
    : [];

  const handleMsgChange = (value: string) => {
    setMsg(value);
    if (!currentUser || !id) return;
    startTyping(id, currentUser.email, currentUser.name);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => stopTyping(id, currentUser.email), 2500);
  };

  const simulateReply = () => {
    if (!ticket || !id) return;
    if (currentUser?.role === 'customer') {
      const assignee = users.find(u => u.id === ticket.assignedTo);
      const replierEmail = assignee?.email || 'support@ticksera.com';
      const replierName = assignee?.name || 'Support';
      simTimer.current = setTimeout(() => startTyping(id, replierEmail, replierName), 400);
      simTimer.current = setTimeout(() => stopTyping(id, replierEmail), 2200);
    } else {
      const creator = users.find(u => u.id === ticket.createdBy);
      if (!creator) return;
      simTimer.current = setTimeout(() => startTyping(id, creator.email, creator.name), 400);
      simTimer.current = setTimeout(() => stopTyping(id, creator.email), 2200);
    }
  };

  const handleChatFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setPendingFile(null);
      window.alert('Attachments are limited to 2 MB.');
      e.target.value = '';
      return;
    }
    void (async () => {
      const resolved = await resolveAttachment(file);
      if (resolved) setPendingFile(resolved);
      else window.alert('That file could not be uploaded. Please try again.');
    })();
    e.target.value = '';
  };

  const handleSendFile = () => {
    if (!pendingFile || !currentUser) return;
    stopTyping(ticket!.id, currentUser.email);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    addChatMessage({
      ticketId: ticket!.id,
      senderEmail: currentUser.email,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      message: msg.trim() || '',
      isAdmin: currentUser.role !== 'customer',
      fileUrl: pendingFile.url,
      fileName: pendingFile.name,
      fileType: pendingFile.type,
    });
    setPendingFile(null);
    setMsg('');
    if (!isSupabaseConfigured()) simulateReply();
  };

  const messages = chatMessages
    .filter(m => m.ticketId === id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages.length]);

  // IDOR guard: customers may only open tickets they created. Staff (and
  // technicians with the ticket assigned) are handled by the role checks below.
  if (ticket && currentUser?.role === 'customer' && ticket.createdBy !== currentUser.id) {
    return <Navigate to="/tickets" replace />;
  }

  if (!ticket) return (
    <div className="text-center py-20">
      <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-white">Ticket not found</h2>
      <p className="text-sm text-gray-500 mt-1">This ticket may have been removed or doesn't exist.</p>
      <Button variant="ghost" onClick={() => navigate('/tickets')} className="mt-4">
        <ArrowLeft className="w-4 h-4" /> Back to Tickets
      </Button>
    </div>
  );

  const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'support_manager';
  const isTech = currentUser?.role === 'technician' || currentUser?.role === 'field_technician';
  const canManage = isAdmin || (isTech && ticket.assignedTo === currentUser?.id);
  const assignee = users.find(u => u.id === ticket.assignedTo);
  const technicians = users.filter(u => ['technician', 'field_technician'].includes(u.role));

  const slaBreached = ticket.slaDeadline &&
    new Date(ticket.slaDeadline) < new Date() &&
    ticket.status !== 'resolved' &&
    ticket.status !== 'closed';

  const triageActive = ticket.triageStatus === 'ai_diagnosing';
  const triageReady = ticket.triageStatus === 'needs_technician';
  const triageFlow = triageActive ? getTriageFlow(ticket.category) : null;
  const triageStep = ticket.triageStep ?? 0;
  const currentQuestion = triageFlow?.questions[Math.min(triageStep, triageFlow.questions.length - 1)];

  const canEscalate =
    !['escalated', 'resolved', 'closed'].includes(ticket.status) &&
    ticket.triageStatus !== 'ai_diagnosing' &&
    (currentUser?.id === ticket.createdBy || isTech);

  const handleSend = () => {
    if (!msg.trim() || !currentUser) return;
    stopTyping(ticket.id, currentUser.email);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    const text = msg.trim();
    if (ticket.triageStatus === 'ai_diagnosing' && currentUser.id === ticket.createdBy) {
      submitTriageAnswer(ticket.id, text);
      setMsg('');
      return;
    }
    addChatMessage({
      ticketId: ticket.id,
      senderEmail: currentUser.email,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      message: text,
      isAdmin: currentUser.role !== 'customer',
    });
    setMsg('');
    aiChatReply(ticket.id, text);
  };

  const handleStatusChange = (status: TicketStatus) => {
    updateTicket(ticket.id, { status });
    const creatorEmail = users.find(u => u.id === ticket.createdBy)?.email;
    if (creatorEmail) {
      addNotification({
        userEmail: creatorEmail,
        title: 'Ticket status updated',
        message: `Ticket "${ticket.title}" status changed to ${status.replace(/_/g, ' ')}`,
        type: 'ticket',
        link: `/tickets/${ticket.id}`,
      });
    }
  };

  const handleAssign = (userId: string) => {
    if (!userId) {
      updateTicket(ticket.id, { assignedTo: undefined, assignedRole: undefined, status: 'open' });
      bookings
        .filter(b => b.ticketId === ticket.id && b.assignedTechnician)
        .forEach(b => updateBooking(b.id, { assignedTechnician: undefined, status: 'pending' }));
      return;
    }
    const tech = users.find(u => u.id === userId);
    if (!tech) return;
    updateTicket(ticket.id, { assignedTo: userId, assignedRole: tech.role, status: 'assigned' });
    bookings
      .filter(b => b.ticketId === ticket.id && (!b.assignedTechnician || b.assignedTechnician !== userId))
      .forEach(b => updateBooking(b.id, { assignedTechnician: userId, status: 'confirmed' }));
    addNotification({
      userEmail: tech.email,
      title: 'Ticket assigned to you',
      message: `You have been assigned: ${ticket.title}`,
      type: 'assignment',
      link: `/tickets/${ticket.id}`,
    });
  };

  const handleResolve = () => {
    if (!resNotes.trim()) return;
    updateTicket(ticket.id, { status: 'resolved', resolutionNotes: resNotes, resolvedBy: currentUser?.name || 'Support team' });
  };

  const handleRate = () => {
    if (rating > 0) {
      updateTicket(ticket.id, { rating, ratingComment, status: 'closed' });
    }
  };

  const handleCloseTicket = () => {
    const now = new Date().toISOString();
    updateTicket(ticket.id, {
      status: 'closed',
      activityLogs: [...ticket.activityLogs, { id: `al${Date.now()}`, user: currentUser?.name || ticket.createdByName, action: 'Closed the ticket', entityType: 'ticket', entityId: ticket.id, timestamp: now }],
    });
    const tech = users.find(u => u.id === ticket.assignedTo);
    if (tech) {
      addNotification({
        userEmail: tech.email,
        title: 'Ticket closed',
        message: `Ticket "${ticket.title}" was closed by ${currentUser?.name || 'the customer'}`,
        type: 'ticket',
        link: `/tickets/${ticket.id}`,
      });
    }
  };

  const handleEscalate = () => {
    if (!escalateReason.trim() || !currentUser || !ticket) return;
    const newLog = {
      id: `al${Date.now()}`,
      user: currentUser.name,
      action: `Requested escalation: "${escalateReason.trim()}"`,
      entityType: 'ticket' as const,
      entityId: ticket.id,
      timestamp: new Date().toISOString(),
    };
    updateTicket(ticket.id, {
      status: 'escalated',
      escalationLevel: (ticket.escalationLevel ?? 0) + 1,
      activityLogs: [...ticket.activityLogs, newLog],
    });
    users
      .filter(u => u.role === 'super_admin' || u.role === 'support_manager')
      .forEach(admin => {
        addNotification({
          userEmail: admin.email,
          title: 'Ticket escalated',
          message: `"${ticket.title}" was escalated by ${currentUser.name}: ${escalateReason.trim()}`,
          type: 'ticket',
          link: `/tickets/${ticket.id}`,
        });
      });
    setEscalateReason('');
    setEscalateOpen(false);
    setEscalateSubmitted(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <button
        onClick={() => navigate('/tickets')}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-500 transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Tickets
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="card-premium p-6 sm:p-7">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge variant={statusVariant[ticket.status]}>{ticket.status.replace(/_/g, ' ')}</Badge>
              <Badge variant={priorityVariant[ticket.priority]}>{ticket.priority}</Badge>
              <Badge variant="default">{ticket.category.replace(/_/g, ' ')}</Badge>
              {slaBreached && <Badge variant="danger">SLA Breached</Badge>}
              <span className="text-xs text-gray-400 ml-auto font-mono">#{ticket.id}</span>
            </div>

            {ticket.productItem && ticket.issueTrigger && (
              <div className="flex flex-wrap gap-2 mb-4">
                {ticket.coreCategory && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <Tag className="w-3 h-3" /> {coreCategoryLabels[ticket.coreCategory] ?? ticket.coreCategory}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/60 text-xs font-medium text-indigo-600 dark:text-indigo-300">
                  <Cpu className="w-3 h-3" /> {ticket.productItem}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/60 text-xs font-medium text-orange-600 dark:text-orange-300">
                  <AlertTriangle className="w-3 h-3" /> {ticket.issueTrigger}
                </span>
              </div>
            )}

            <h1 className="font-heading text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-snug">{cleanTicketTitle(ticket.title)}</h1>
            <p className="mt-3 text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap text-sm">{ticket.description}</p>

            {ticket.screenshotUrls.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" /> Attachments ({ticket.screenshotUrls.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {ticket.screenshotUrls.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxSrc(src)}
                      className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 dark:border-dark-border shadow-sm hover:opacity-90 hover:scale-105 transition-all"
                    >
                      <img src={src} alt={`screenshot-${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>{ticket.createdByName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(ticket.createdAt).toLocaleString()}</span>
              </div>
              {ticket.slaDeadline && (
                <div className={`flex items-center gap-1.5 ${slaBreached ? 'text-red-500 font-medium' : ''}`}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>SLA: {new Date(ticket.slaDeadline).toLocaleString()}</span>
                </div>
              )}
            </div>
          </Card>

          {/* ── AI Triage Card ── */}
          {(triageActive || triageReady) && currentUser?.id === ticket.createdBy && (
            <Card className="p-6 border-l-4 border-l-violet-500 bg-violet-50/30 dark:bg-violet-900/5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  {triageActive ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-heading font-semibold text-gray-900 dark:text-white text-sm">TICKSERA BOT: Diagnosing Your Issue</h3>
                        <Badge variant="info">Question {Math.min(triageStep + 1, triageFlow!.questions.length)} of {triageFlow!.questions.length}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Answer the questions below (or in the chat) so the bot can pinpoint the issue and try to resolve it.
                        A technician can only be requested once the diagnosis is complete.
                      </p>
                      {currentQuestion && (
                        <div className="mt-4 rounded-xl border border-violet-200 dark:border-violet-700/50 bg-white dark:bg-dark-card p-4">
                          <p className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed">{currentQuestion.question}</p>
                          {currentQuestion.options && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {currentQuestion.options.map(opt => (
                                <button
                                  key={opt}
                                  onClick={() => submitTriageAnswer(ticket.id, opt)}
                                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-violet-200 dark:border-violet-700/50 text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
                                >
                                  {opt}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveViaTriage(ticket.id)}
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Issue Fixed: No Need
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 className="font-heading font-semibold text-gray-900 dark:text-white text-sm">Triage Complete: Did the TICKSERA BOT resolve your issue?</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        The BOT finished its diagnosis and shared troubleshooting steps in the chat.
                        If the issue is fixed, close the ticket below. If not, request a technician and we'll route you immediately.
                      </p>
                      <div className="mt-4 flex gap-2 flex-wrap">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            addChatMessage({
                              ticketId: ticket.id,
                              senderEmail: currentUser.email,
                              senderName: currentUser.name,
                              senderRole: currentUser.role,
                              message: 'I need to speak with a technician directly.',
                              isAdmin: false,
                            });
                            requestTechnician(ticket.id, 'AI triage completed; customer still needs technician');
                          }}
                        >
                          <Wrench className="w-3.5 h-3.5" /> Not Resolved: Request Technician
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                          onClick={() => resolveViaTriage(ticket.id)}
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Issue Fixed: No Need
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>
          )}

          {ticket.triageStatus === 'escalated_to_technician' && (
            <Card className="p-5 border-l-4 border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/5">
              <div className="flex items-start gap-3">
                <Wrench className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">Technician requested; you're in the queue</p>
                  <p className="text-xs text-gray-500 mt-0.5">A support agent will be assigned shortly. You'll be notified here once someone picks up your ticket.</p>
                </div>
              </div>
            </Card>
          )}

          {/* Escalation: success banner */}
          {escalateSubmitted && ticket.status === 'escalated' && (
            <Card className="p-5 border-l-4 border-l-orange-500 bg-orange-50/30 dark:bg-orange-900/5">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">Escalation submitted</p>
                  <p className="text-xs text-gray-500 mt-0.5">This ticket has been flagged and assigned to a senior technician or support manager. You'll be notified of any updates.</p>
                </div>
              </div>
            </Card>
          )}

          {/* Escalation request card */}
          {canEscalate && !escalateSubmitted && (
            <Card className="p-6 border-2 border-dashed border-orange-300 dark:border-orange-700/60 bg-orange-50/20 dark:bg-orange-900/5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-gray-900 dark:text-white text-sm leading-snug">
                      Not getting the help you need?
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Request escalation to a senior technician or support manager.
                    </p>
                  </div>
                </div>
                {!escalateOpen && (
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                      onClick={() => navigate('/booking', { state: { fromTicket: { id: ticket.id, title: ticket.title, coreCategory: ticket.coreCategory, assignedTo: ticket.assignedTo } } })}
                    >
                      <CalendarCheck className="w-3.5 h-3.5" /> Book Session
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                      onClick={() => setEscalateOpen(true)}
                    >
                      <TrendingUp className="w-3.5 h-3.5" /> Request Escalation
                    </Button>
                  </div>
                )}
              </div>

              {escalateOpen && (
                <div className="mt-4 space-y-3">
                  <TextArea
                    label="Reason for escalation"
                    placeholder="Describe why this ticket needs escalation; e.g. no response for 24h, issue worsening, business-critical impact..."
                    rows={3}
                    value={escalateReason}
                    onChange={e => setEscalateReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleEscalate}
                      disabled={!escalateReason.trim()}
                      className="bg-orange-500 hover:bg-orange-600 shadow-none"
                    >
                      <TrendingUp className="w-3.5 h-3.5" /> Confirm Escalation
                    </Button>
                    <Button variant="outline" onClick={() => { setEscalateOpen(false); setEscalateReason(''); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Already escalated banner (for tickets that were escalated before the user opened this page) */}
          {ticket.status === 'escalated' && !escalateSubmitted && (
            <Card className="p-5 border-l-4 border-l-orange-500 bg-orange-50/30 dark:bg-orange-900/5">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">This ticket is escalated</p>
                  <p className="text-xs text-gray-500 mt-0.5">It has been assigned to a senior technician or support manager for priority handling.</p>
                </div>
                <span className="ml-auto text-xs font-bold text-orange-500 bg-orange-100 dark:bg-orange-900/30 px-2.5 py-1 rounded-full flex-shrink-0">
                  Level {ticket.escalationLevel}
                </span>
              </div>
            </Card>
          )}

          {ticket.resolutionNotes && (
            <Card className="p-6 border-l-4 border-l-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/5">
              <h3 className="font-heading font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" /> Resolution Notes
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{ticket.resolutionNotes}</p>
            </Card>
          )}

          {ticket.rating && (
            <Card className="p-6">
              <h3 className="font-heading font-semibold text-gray-900 dark:text-white mb-3">Customer Rating</h3>
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`w-5 h-5 ${s <= ticket.rating! ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
                ))}
                <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">{ticket.rating}/5</span>
              </div>
              {ticket.ratingComment && (
                <p className="text-sm text-gray-600 dark:text-gray-400 italic bg-gray-50 dark:bg-gray-800/50 rounded-xl px-4 py-3">"{ticket.ratingComment}"</p>
              )}
            </Card>
          )}

          {ticket.status === 'resolved' && currentUser?.id === ticket.createdBy && !ticket.rating && (
            <Card className="p-6 border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-900/5">
              <h3 className="font-heading font-semibold text-gray-900 dark:text-white mb-1">Rate This Resolution</h3>
              <p className="text-sm text-gray-500 mb-4">
                {ticket.resolvedBy === 'TICKSERA BOT'
                  ? 'How satisfied are you with the TICKSERA BOT\u2019s help? Your rating helps the BOT get better.'
                  : `How satisfied are you with the support you received from ${ticket.resolvedBy ?? 'the Ticksera team'}?`}
              </p>
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setRating(s)} className="p-0.5 rounded-lg hover:scale-110 transition-transform">
                    <Star className={`w-8 h-8 transition-colors ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300 hover:text-amber-300'}`} />
                  </button>
                ))}
                {rating > 0 && <span className="ml-2 text-sm font-medium text-amber-600">{['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}</span>}
              </div>
              <TextArea placeholder="Share your feedback (optional)..." rows={2} value={ratingComment} onChange={e => setRatingComment(e.target.value)} />
              <div className="mt-3 flex gap-2 flex-wrap">
                <Button onClick={handleRate} disabled={rating === 0}>Submit Rating</Button>
                <Button variant="outline" onClick={handleCloseTicket}>Close Ticket</Button>
              </div>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary-500" />
              <h3 className="font-heading font-semibold text-gray-900 dark:text-white">
                Discussion
              </h3>
              {messages.length > 0 && (
                <span className="ml-1 text-xs text-gray-400">({messages.length})</span>
              )}
            </div>
            <div ref={chatRef} className="h-72 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-dark-bg/30">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No messages yet. Start the conversation!</p>
                </div>
              ) : messages.map(m => {
                const isMe = m.senderEmail === currentUser?.email;
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {!isMe && (
                      m.senderRole === 'bot' ? (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-auto mb-5">
                          🤖
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 dark:from-gray-600 dark:to-gray-800 flex items-center justify-center text-white text-[10px] font-bold mr-2 flex-shrink-0 mt-auto mb-5">
                          {m.senderName.charAt(0)}
                        </div>
                      )
                    )}
                    <div className={`max-w-[78%] ${isMe ? 'bg-primary-500 text-white' : m.senderRole === 'bot' ? 'bg-violet-50 dark:bg-violet-900/20 text-gray-900 dark:text-white border border-violet-200 dark:border-violet-700/50' : 'bg-white dark:bg-dark-card text-gray-900 dark:text-white border border-gray-200 dark:border-dark-border'} rounded-2xl px-4 py-2.5 shadow-sm`}>
                      <p className={`text-[11px] font-semibold mb-1 ${isMe ? 'text-primary-100' : m.senderRole === 'bot' ? 'text-violet-500 dark:text-violet-400' : 'text-gray-500'}`}>{m.senderName}</p>
                      {m.fileUrl && (
                        <FileAttachment
                          url={m.fileUrl}
                          name={m.fileName || 'attachment'}
                          type={m.fileType || (m.fileUrl.startsWith('data:image') ? 'image/png' : 'application/octet-stream')}
                          isMe={isMe}
                          onImageClick={() => setLightboxSrc(m.fileUrl!)}
                        />
                      )}
                      {m.message && <ChatMessageText text={m.message} bot={m.senderRole === 'bot'} />}
                      <p className={`text-[10px] mt-1.5 ${isMe ? 'text-primary-200' : 'text-gray-400'}`}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {whoTyping.length > 0 && (
                <div className="flex justify-start pt-1">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 dark:from-gray-600 dark:to-gray-800 flex items-center justify-center text-white text-[10px] font-bold mr-2 flex-shrink-0 self-end">
                    {whoTyping[0].charAt(0)}
                  </div>
                  <TypingIndicator names={whoTyping} />
                </div>
              )}
            </div>

            {pendingFile && (
              <div className="px-4 pt-3 pb-1 border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card">
                <div className="relative inline-flex items-center gap-2 pr-6 pl-2 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 max-w-[260px]">
                  {pendingFile.type.startsWith('image/') ? (
                    <img src={pendingFile.url} alt="preview" className="h-10 w-10 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-white dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <Paperclip className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{pendingFile.name}</span>
                  <button
                    onClick={() => setPendingFile(null)}
                    className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            )}

            <div className="px-4 py-3 border-t border-gray-200 dark:border-dark-border flex gap-2 bg-white dark:bg-dark-card">
              <input
                ref={chatFileRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                className="hidden"
                onChange={handleChatFileSelect}
              />
              <button
                onClick={() => chatFileRef.current?.click()}
                className="p-2.5 rounded-xl border border-gray-200 dark:border-dark-border text-gray-400 hover:text-primary-500 hover:border-primary-400 dark:hover:border-primary-500 transition-colors flex-shrink-0"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <input
                type="text"
                placeholder={pendingFile ? 'Add a caption (optional)...' : 'Type a message...'}
                value={msg}
                onChange={e => handleMsgChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    pendingFile ? handleSendFile() : handleSend();
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder-gray-400"
              />
              <Button
                onClick={pendingFile ? handleSendFile : handleSend}
                size="sm"
                disabled={!msg.trim() && !pendingFile}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-heading font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-500" /> Activity Timeline
            </h3>
            {ticket.activityLogs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No activity recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {ticket.activityLogs.map((log, i) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary-500 mt-1.5 ring-2 ring-primary-100 dark:ring-primary-900/30" />
                      {i < ticket.activityLogs.length - 1 && (
                        <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 my-1" />
                      )}
                    </div>
                    <div className="pb-3">
                      <p className="text-sm text-gray-900 dark:text-white font-medium">{log.action}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{log.user} · {new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Assigned To</h3>
            {assignee ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-400 flex items-center justify-center text-white font-bold shadow-sm">
                  {assignee.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{assignee.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{assignee.role.replace(/_/g, ' ')}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                Unassigned
              </div>
            )}
            {isAdmin && (
              <div className="mt-4">
                <Select
                  label="Assign Technician"
                  value={ticket.assignedTo || ''}
                  onChange={e => handleAssign(e.target.value)}
                  options={[
                    { value: '', label: 'Unassigned' },
                    ...technicians.map(t => ({ value: t.id, label: t.name })),
                  ]}
                />
              </div>
            )}
            {ticket.aiRoutingReason && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-primary-500/10 border border-primary-500/30 p-3 text-xs text-gray-700 dark:text-gray-200">
                <Cpu className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-primary-600 dark:text-primary-400">AI routing</p>
                  <p className="mt-0.5">{ticket.aiRoutingReason}</p>
                </div>
              </div>
            )}
          </Card>

          {currentUser?.id === ticket.createdBy && !['open', 'closed'].includes(ticket.status) && (
            <Card className="p-5 border-2 border-dashed border-gray-300 dark:border-gray-700">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Your Ticket</h3>
              <p className="text-xs text-gray-500 mb-4">
                {ticket.status === 'resolved'
                  ? 'All set? Close the ticket to archive it; you can also rate the resolution above.'
                  : 'Resolved it yourself or no longer need help? Close the ticket and it gets archived with its full history.'}
              </p>
              <Button variant="outline" size="sm" className="w-full" onClick={handleCloseTicket}>Close Ticket</Button>
            </Card>
          )}

          {canManage && (
            <Card className="p-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Update Status</h3>
              <Select
                value={ticket.status}
                onChange={e => handleStatusChange(e.target.value as TicketStatus)}
                options={[
                  { value: 'open', label: 'Open' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'assigned', label: 'Assigned' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'waiting_customer', label: 'Waiting for Customer' },
                  { value: 'escalated', label: 'Escalated' },
                  { value: 'resolved', label: 'Resolved' },
                  { value: 'closed', label: 'Closed' },
                ]}
              />
              {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                <div className="mt-4 space-y-2">
                  <TextArea
                    placeholder="Resolution notes (required to resolve)..."
                    rows={3}
                    value={resNotes}
                    onChange={e => setResNotes(e.target.value)}
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleResolve}
                    className="w-full"
                    disabled={!resNotes.trim()}
                  >
                    Mark Resolved
                  </Button>
                </div>
              )}
            </Card>
          )}

          <Card className="p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Ticket Details</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <dt className="text-gray-500">Category</dt>
                <dd className="text-gray-900 dark:text-white capitalize font-medium">{ticket.category.replace(/_/g, ' ')}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-gray-500">Priority</dt>
                <dd><Badge variant={priorityVariant[ticket.priority]}>{ticket.priority}</Badge></dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-gray-500">Escalation</dt>
                <dd className="text-gray-900 dark:text-white font-medium">Level {ticket.escalationLevel}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-gray-500">Created</dt>
                <dd className="text-gray-900 dark:text-white">{new Date(ticket.createdAt).toLocaleDateString()}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-gray-500">Updated</dt>
                <dd className="text-gray-900 dark:text-white">{new Date(ticket.updatedAt).toLocaleDateString()}</dd>
              </div>
              {ticket.estimatedResolutionTime && (
                <div className="flex justify-between items-center">
                  <dt className="text-gray-500">Est. Time</dt>
                  <dd className="text-gray-900 dark:text-white">{ticket.estimatedResolutionTime}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>

      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightboxSrc(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-gray-900 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={lightboxSrc} alt="full size" className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
