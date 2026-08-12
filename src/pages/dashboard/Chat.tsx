import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { useShallow } from 'zustand/react/shallow';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import FileAttachment from '../../components/ui/FileAttachment';
import TypingIndicator from '../../components/ui/TypingIndicator';
import ChatMessageText from '../../components/ui/ChatMessageText';
import PageHeader from '../../components/ui/PageHeader';
import { Send, MessageSquare, Search, ArrowLeft, Paperclip, X, Bot, ArrowRight, Cpu, Users, Plus, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getTriageFlow } from '../../utils/triage';
import { cleanTicketTitle } from '../../utils/ticketTitle';
import { isSupabaseConfigured } from '../../lib/supabase';
import { resolveAttachment } from '../../lib/uploads';

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple'> = {
  open: 'info', pending: 'warning', assigned: 'purple', in_progress: 'info',
  waiting_customer: 'warning', escalated: 'danger', resolved: 'success', closed: 'default',
};

export default function Chat() {
  const { currentUser, tickets, chatMessages, conversations, addChatMessage, aiChatReply, staffChatReply, createConversation, setChatLastVisit, typingUsers, startTyping, stopTyping, users, submitTriageAnswer } = useStore(
    useShallow(s => ({
      currentUser: s.currentUser, tickets: s.tickets, chatMessages: s.chatMessages, conversations: s.conversations,
      addChatMessage: s.addChatMessage, aiChatReply: s.aiChatReply, staffChatReply: s.staffChatReply,
      createConversation: s.createConversation, setChatLastVisit: s.setChatLastVisit,
      typingUsers: s.typingUsers, startTyping: s.startTyping, stopTyping: s.stopTyping,
      users: s.users, submitTriageAnswer: s.submitTriageAnswer,
    }))
  );
  const [selected, setSelected] = useState<{ kind: 'ticket' | 'conversation'; id: string } | null>(null);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatIds, setNewChatIds] = useState<string[]>([]);
  const [newChatTitle, setNewChatTitle] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setChatLastVisit();
  }, [setChatLastVisit]);

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (simTimer.current) clearTimeout(simTimer.current);
    };
  }, []);

  const whoTyping = selected
    ? typingUsers
        .filter(t => t.ticketId === selected.id && t.email !== currentUser?.email && t.expiresAt > Date.now())
        .map(t => t.name)
    : [];

  const handleMsgChange = (value: string) => {
    setMsg(value);
    if (!currentUser || !selected) return;
    startTyping(selected.id, currentUser.email, currentUser.name);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => stopTyping(selected.id, currentUser.email), 2500);
  };

  const simulateReply = (ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    let replierName = '';
    if (currentUser?.role === 'customer') {
      const assignee = users.find(u => u.id === ticket.assignedTo);
      replierName = assignee?.name || users.find(u => u.role === 'technician')?.name || 'Support';
      const replierEmail = assignee?.email || 'support@ticksera.com';
      simTimer.current = setTimeout(() => startTyping(ticketId, replierEmail, replierName), 400);
      simTimer.current = setTimeout(() => stopTyping(ticketId, replierEmail), 2200);
    } else {
      const creator = users.find(u => u.id === ticket.createdBy);
      if (!creator) return;
      simTimer.current = setTimeout(() => startTyping(ticketId, creator.email, creator.name), 400);
      simTimer.current = setTimeout(() => stopTyping(ticketId, creator.email), 2200);
    }
  };

  const role = currentUser?.role;
  const isManager = role === 'super_admin' || role === 'support_manager';
  const isStaff = isManager || role === 'technician' || role === 'field_technician';
  const myTickets = role === 'customer'
    ? tickets.filter(t => t.createdBy === currentUser?.id)
    : (role === 'technician' || role === 'field_technician')
      ? tickets.filter(t => t.assignedTo === currentUser?.id)
      : tickets;

  const myConversations = isStaff && currentUser
    ? conversations
        .filter(c => c.participantIds.includes(currentUser.id))
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
    : [];

  const conversationsList = search
    ? myConversations.filter(c => {
        const haystack = `${c.title ?? ''} ${c.participantIds
          .map(id => users.find(u => u.id === id)?.name ?? '')
          .join(' ')}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
    : myConversations;

  const filteredConversations = search
    ? myTickets.filter(t => {
        const haystack = `${t.title} ${t.productItem ?? ''} ${t.issueTrigger ?? ''}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
    : myTickets;

  const activeMessages = selected
    ? chatMessages
        .filter(m => selected.kind === 'ticket' ? m.ticketId === selected.id : m.conversationId === selected.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];

  const selectedTicketData = selected?.kind === 'ticket' ? tickets.find(t => t.id === selected.id) : undefined;
  const selectedConversation = selected?.kind === 'conversation' ? myConversations.find(c => c.id === selected.id) : undefined;

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [activeMessages.length]);

  const handleSend = () => {
    if (!msg.trim() || !currentUser || !selected) return;
    stopTyping(selected.id, currentUser.email);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    const text = msg.trim();
    if (selected.kind === 'conversation') {
      addChatMessage({
        conversationId: selected.id,
        senderEmail: currentUser.email,
        senderName: currentUser.name,
        senderRole: currentUser.role,
        message: text,
        isAdmin: currentUser.role !== 'customer',
      });
      setMsg('');
      staffChatReply(selected.id, text);
      return;
    }
    const ticket = tickets.find(t => t.id === selected.id);
    if (ticket?.triageStatus === 'ai_diagnosing' && currentUser.id === ticket.createdBy) {
      submitTriageAnswer(selected.id, text);
      setMsg('');
      return;
    }
    addChatMessage({
      ticketId: selected.id,
      senderEmail: currentUser.email,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      message: text,
      isAdmin: currentUser.role !== 'customer',
    });
    setMsg('');
    aiChatReply(selected.id, text);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (!pendingFile || !currentUser || !selected) return;
    stopTyping(selected.id, currentUser.email);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    const base = {
      senderEmail: currentUser.email,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      message: msg.trim() || '',
      isAdmin: currentUser.role !== 'customer',
      fileUrl: pendingFile.url,
      fileName: pendingFile.name,
      fileType: pendingFile.type,
    };
    if (selected.kind === 'conversation') {
      addChatMessage({ ...base, conversationId: selected.id });
      setPendingFile(null);
      setMsg('');
      return;
    }
    addChatMessage({ ...base, ticketId: selected.id });
    setPendingFile(null);
    setMsg('');
    if (!isSupabaseConfigured()) simulateReply(selected.id);
  };

  const ConversationList = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 dark:border-dark-border flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-semibold text-slate-900 dark:text-white text-sm">
            Conversations
          </h3>
          {isManager && (
            <button
              onClick={() => setShowNewChat(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New Chat
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white focus:ring-1 focus:ring-emerald-500 focus:border-transparent outline-none"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isStaff && conversationsList.length > 0 && (
          <>
            <div className="px-4 pt-3 pb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              <Users className="w-3 h-3" /> Team Chat
            </div>
            {conversationsList.map(c => {
              const msgs = chatMessages.filter(m => m.conversationId === c.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              const lastMsg = msgs[0];
              const unreadCount = msgs.filter(m => m.senderEmail !== currentUser?.email).length;
              const isSelected = selected?.kind === 'conversation' && selected.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected({ kind: 'conversation', id: c.id })}
                  className={`w-full px-3 py-2.5 text-left transition-all group ${
                    isSelected ? '' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className={`flex items-start gap-2 rounded-xl px-2.5 py-2 ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/10 border border-emerald-200 dark:border-emerald-800/60 shadow-sm'
                      : 'border border-transparent'
                  }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.type === 'group'
                      ? 'bg-gradient-to-br from-sky-500 to-indigo-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                      {c.type === 'group' ? <Users className="w-3.5 h-3.5" /> : <span className="text-xs font-bold">{(c.title ?? 'C').charAt(0)}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-sm font-semibold truncate leading-snug ${isSelected ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-900 dark:text-white'}`}>
                          {c.title}
                        </p>
                        {c.type === 'group' && (
                          <Badge variant="info" className="text-[9px] px-1.5 py-0 flex-shrink-0">{c.participantIds.length}</Badge>
                        )}
                      </div>
                      {lastMsg ? (
                        <p className="flex items-center gap-1 text-xs text-slate-500 truncate mt-0.5">
                          <span className="flex-shrink-0 font-medium">{lastMsg.senderName}:</span>
                          {lastMsg.fileUrl && !lastMsg.message ? (
                            <span className="inline-flex items-center gap-1"><Paperclip className="w-3 h-3 flex-shrink-0" /> Attachment</span>
                          ) : (
                            <span className="truncate">{lastMsg.message}</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic mt-0.5">No messages yet</p>
                      )}
                    </div>
                    {unreadCount > 0 && !isSelected && (
                      <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center font-bold flex-shrink-0">{unreadCount}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </>
        )}
        <div className="px-4 pt-3 pb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
          <MessageSquare className="w-3 h-3" /> Tickets
        </div>
        {filteredConversations.length === 0 ? (
          <div className="text-center py-10 px-4">
            <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No conversations found</p>
          </div>
        ) : filteredConversations.map(t => {
          const msgs = chatMessages.filter(m => m.ticketId === t.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          const lastMsg = msgs[0];
          const unreadCount = msgs.filter(m => !m.isAdmin && role !== 'customer').length;
          const isSelected = selected?.kind === 'ticket' && selected.id === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelected({ kind: 'ticket', id: t.id })}
              className={`w-full px-3 py-2.5 text-left transition-all group ${
                isSelected
                  ? ''
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className={`flex items-start gap-2 rounded-xl px-2.5 py-2 ${
                isSelected
                  ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/10 border border-emerald-200 dark:border-emerald-800/60 shadow-sm'
                  : 'border border-transparent'
              }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-mono text-[10px] font-semibold tracking-wide flex-shrink-0 ${isSelected ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400'}`}>
                      #{t.id.toUpperCase()}
                    </span>
                    <p className={`text-sm font-semibold truncate leading-snug ${isSelected ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-900 dark:text-white'}`}>
                      {t.issueTrigger || cleanTicketTitle(t.title)}
                    </p>
                  </div>
                  {t.productItem && (
                    <p className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      <Cpu className="w-3 h-3 flex-shrink-0" /> {t.productItem}
                    </p>
                  )}
                  {lastMsg ? (
                    <p className="flex items-center gap-1 text-xs text-slate-500 truncate mt-0.5">
                      <span className="flex-shrink-0 font-medium">{lastMsg.senderName}:</span>
                      {lastMsg.fileUrl && !lastMsg.message ? (
                        <span className="inline-flex items-center gap-1"><Paperclip className="w-3 h-3 flex-shrink-0" /> Attachment</span>
                      ) : (
                        <span className="truncate">{lastMsg.message}</span>
                      )}
                    </p>
                  ) : t.productItem ? null : (
                    <p className="text-xs text-slate-400 italic mt-0.5">No messages yet</p>
                  )}
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  <Badge variant={statusVariant[t.status]} className="text-[9px] px-1.5 py-0">{t.status.replace(/_/g, ' ')}</Badge>
                  {unreadCount > 0 && !isSelected && (
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] flex items-center justify-center font-bold">{unreadCount}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const headerTitle = selected?.kind === 'conversation'
    ? (selectedConversation?.title ?? 'Team Chat')
    : (selectedTicketData?.issueTrigger || cleanTicketTitle(selectedTicketData?.title || ''));
  const headerSubtitle = selected?.kind === 'conversation'
    ? (selectedConversation?.participantIds
        .map(id => users.find(u => u.id === id)?.name ?? '')
        .filter(Boolean)
        .join(', ') || 'Team chat')
    : `${selectedTicketData?.productItem ? `${selectedTicketData.productItem} · ` : ''}#${selected?.id ?? ''}`;
  const headerAvatar = selected?.kind === 'conversation'
    ? (selectedConversation?.title?.charAt(0) ?? 'C')
    : (selectedTicketData?.issueTrigger || selectedTicketData?.title || '?').charAt(0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Messaging"
        title="Live Chat"
        subtitle="Follow up on your tickets and message the support team in real time."
        actions={selected?.kind === 'ticket' && (
          <Link to={`/tickets/${selected.id}`} className="hidden sm:inline-flex">
            <Button variant="outline" size="sm">Open Ticket <ArrowRight className="w-3.5 h-3.5" /></Button>
          </Link>
        )}
      />
      <div className="mt-5">
      <Card className="card-premium overflow-hidden">
        <div className="flex min-h-[420px] sm:min-h-[480px]" style={{ height: 'calc(100dvh - 220px)' }}>

          {/* Sidebar: hidden on mobile when a chat is selected */}
          <div className={`border-r border-slate-200 dark:border-dark-border flex-col flex-shrink-0 ${selected ? 'hidden sm:flex w-64 lg:w-72' : 'flex w-full sm:w-64 lg:w-72'}`}>
            <ConversationList />
          </div>

          {/* Chat panel */}
          {selected ? (
            <div className="flex-1 flex flex-col min-w-0">
              {/* Chat header */}
              <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-dark-border flex items-center gap-3 bg-white dark:bg-dark-card flex-shrink-0">
                <button
                  onClick={() => setSelected(null)}
                  className="sm:hidden text-emerald-500 hover:text-emerald-600 font-medium flex-shrink-0 flex items-center gap-1 text-sm p-2.5 -ml-2.5 rounded-lg"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md shadow-emerald-500/20 ${
                  selected.kind === 'conversation'
                    ? selectedConversation?.type === 'group'
                      ? 'bg-gradient-to-br from-sky-500 to-indigo-600'
                      : 'bg-gradient-to-br from-slate-500 to-slate-700'
                    : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                }`}>
                  {headerAvatar}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {headerTitle}
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    {headerSubtitle}
                  </p>
                </div>
                {selected.kind === 'ticket' && selectedTicketData ? (
                  <Badge variant={statusVariant[selectedTicketData.status]} className="flex-shrink-0 hidden sm:inline-flex">
                    {selectedTicketData.status.replace(/_/g, ' ')}
                  </Badge>
                ) : selectedConversation ? (
                  <Badge variant={selectedConversation.type === 'group' ? 'info' : 'default'} className="flex-shrink-0 hidden sm:inline-flex">
                    {selectedConversation.type === 'group' ? 'Group' : 'Direct'}
                  </Badge>
                ) : null}
              </div>

              {/* Messages */}
              <div ref={chatRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-50/50 dark:bg-dark-bg/30 [&>*:last-child]:pb-1">
                {activeMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Start the conversation</p>
                    <p className="text-sm text-slate-400 mt-1">Send a message to get support on this ticket.</p>
                  </div>
                ) : activeMessages.map(m => {
                  const isMe = m.senderEmail === currentUser?.email;
                  return (
                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      {!isMe && (
                        m.senderRole === 'bot' ? (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-auto mb-5">
                            🤖
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-400 flex items-center justify-center text-white text-[10px] font-bold mr-2 flex-shrink-0 mt-auto mb-5">
                            {m.senderName.charAt(0)}
                          </div>
                        )
                      )}
                      <div className={`max-w-[78%] sm:max-w-[70%] ${isMe ? 'bg-emerald-500 text-white' : m.senderRole === 'bot' ? 'bg-violet-50 dark:bg-violet-900/20 text-slate-900 dark:text-white border border-violet-200 dark:border-violet-700/50' : 'bg-white dark:bg-dark-card text-slate-900 dark:text-white border border-slate-200 dark:border-dark-border'} rounded-2xl px-4 py-2.5 shadow-sm`}>
                        <p className={`text-[11px] font-semibold mb-1 ${isMe ? 'text-emerald-100' : m.senderRole === 'bot' ? 'text-violet-500 dark:text-violet-400' : 'text-slate-500'}`}>{m.senderName}</p>
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
                        <p className={`text-[10px] mt-1.5 ${isMe ? 'text-emerald-200' : 'text-slate-400'}`}>
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {whoTyping.length > 0 && (
                  <div className="flex justify-start">
                    <div className="w-7 h-7 rounded-full bg-slate-400 flex items-center justify-center text-white text-[10px] font-bold mr-2 flex-shrink-0 self-end">
                      {whoTyping[0].charAt(0)}
                    </div>
                    <TypingIndicator names={whoTyping} />
                  </div>
                )}
              </div>

              {/* Pending file preview */}
              {pendingFile && (
                <div className="px-3 sm:px-4 pt-3 pb-1 border-t border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card flex-shrink-0">
                  <div className="relative inline-flex items-center gap-2 pr-6 pl-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 max-w-[260px]">
                    {pendingFile.type.startsWith('image/') ? (
                      <img src={pendingFile.url} alt="preview" className="h-10 w-10 object-cover rounded-lg flex-shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <Paperclip className="w-4 h-4 text-slate-400" />
                      </div>
                    )}
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{pendingFile.name}</span>
                    <button
                      onClick={() => setPendingFile(null)}
                      className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* AI triage quick replies */}
              {selectedTicketData?.triageStatus === 'ai_diagnosing' && currentUser?.id === selectedTicketData.createdBy && (() => {
                const flow = getTriageFlow(selectedTicketData.category);
                const step = selectedTicketData.triageStep ?? 0;
                const question = flow.questions[Math.min(step, flow.questions.length - 1)];
                if (!question) return null;
                return (
                  <div className="px-3 sm:px-4 py-2 border-t border-slate-200 dark:border-dark-border bg-violet-50/60 dark:bg-violet-900/10 flex-shrink-0">
                    <div className="flex items-start gap-2">
                      <Bot className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-400">
                          Q{Math.min(step + 1, flow.questions.length)}/{flow.questions.length}: {question.question}
                        </span>
                        {question.options?.map(opt => (
                          <button
                            key={opt}
                            onClick={() => submitTriageAnswer(selected.id, opt)}
                            className="px-3.5 py-2 text-[11px] font-medium rounded-lg border border-violet-200 dark:border-violet-700/50 text-violet-700 dark:text-violet-300 bg-white dark:bg-dark-card hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Input */}
              <div className="px-3 sm:px-4 py-3 border-t border-slate-200 dark:border-dark-border flex gap-2 bg-white dark:bg-dark-card flex-shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-dark-border text-slate-400 hover:text-emerald-500 hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors flex-shrink-0"
                  title="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  placeholder={pendingFile ? 'Add a caption (optional)…' : 'Type a message…'}
                  value={msg}
                  onChange={e => handleMsgChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      pendingFile ? handleSendFile() : handleSend();
                    }
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder-slate-400 outline-none"
                />
                <Button
                  onClick={pendingFile ? handleSendFile : handleSend}
                  size="sm"
                  disabled={!msg.trim() && !pendingFile}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 items-center justify-center hidden sm:flex">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-slate-400" />
                </div>
                <p className="font-medium text-slate-600 dark:text-slate-400">Select a conversation</p>
                <p className="text-sm text-slate-400 mt-1">Choose a ticket or team chat to view its messages</p>
              </div>
            </div>
          )}
        </div>
      </Card>
      </div>

      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightboxSrc(null)}
              className="absolute -top-3 -right-3 w-11 h-11 rounded-full bg-white text-gray-900 flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={lightboxSrc} alt="full size" className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain" />
          </div>
        </div>
      )}

      {showNewChat && isManager && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowNewChat(false)}
        >
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl w-full max-w-md p-5 max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-slate-900 dark:text-white">New Chat</h3>
              <button onClick={() => setShowNewChat(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2 -m-2 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Select team members</label>
            <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-dark-border rounded-xl mb-4">
              {users.filter(u => u.role !== 'customer').map(u => {
                const checked = newChatIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => setNewChatIds(ids => checked ? ids.filter(i => i !== u.id) : [...ids, u.id])}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${checked ? 'bg-emerald-50 dark:bg-emerald-900/10' : ''}`}
                  >
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                      {checked && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 flex-shrink-0">
                      {u.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{u.name}</p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 capitalize">{u.role.replace(/_/g, ' ')}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Group name (optional)</label>
            <input
              type="text"
              value={newChatTitle}
              onChange={e => setNewChatTitle(e.target.value)}
              placeholder="e.g. Operations Squad"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-dark-border bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowNewChat(false); setNewChatIds([]); setNewChatTitle(''); }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={newChatIds.length === 0}
                onClick={() => {
                  const id = createConversation(newChatIds, newChatTitle.trim() || undefined);
                  setShowNewChat(false);
                  setNewChatIds([]);
                  setNewChatTitle('');
                  if (id) setSelected({ kind: 'conversation', id });
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Create Chat
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
