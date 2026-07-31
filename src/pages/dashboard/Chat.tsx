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
import { Send, MessageSquare, Search, ArrowLeft, Paperclip, X, Bot, ArrowRight, Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getTriageFlow } from '../../utils/triage';
import { cleanTicketTitle } from '../../utils/ticketTitle';

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple'> = {
  open: 'info', pending: 'warning', assigned: 'purple', in_progress: 'info',
  waiting_customer: 'warning', escalated: 'danger', resolved: 'success', closed: 'default',
};

export default function Chat() {
  const { currentUser, tickets, chatMessages, addChatMessage, setChatLastVisit, typingUsers, startTyping, stopTyping, users, submitTriageAnswer } = useStore(
    useShallow(s => ({
      currentUser: s.currentUser, tickets: s.tickets, chatMessages: s.chatMessages,
      addChatMessage: s.addChatMessage, setChatLastVisit: s.setChatLastVisit,
      typingUsers: s.typingUsers, startTyping: s.startTyping, stopTyping: s.stopTyping,
      users: s.users, submitTriageAnswer: s.submitTriageAnswer,
    }))
  );
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
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

  const whoTyping = selectedTicket
    ? typingUsers
        .filter(t => t.ticketId === selectedTicket && t.email !== currentUser?.email && t.expiresAt > Date.now())
        .map(t => t.name)
    : [];

  const handleMsgChange = (value: string) => {
    setMsg(value);
    if (!currentUser || !selectedTicket) return;
    startTyping(selectedTicket, currentUser.email, currentUser.name);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => stopTyping(selectedTicket, currentUser.email), 2500);
  };

  const simulateReply = (ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    let replierName = '';
    if (currentUser?.role === 'customer') {
      const assignee = users.find(u => u.id === ticket.assignedTo);
      replierName = assignee?.name || users.find(u => u.role === 'technician')?.name || 'Support';
      const replierEmail = assignee?.email || 'support@fixora.com';
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
  const myTickets = role === 'customer'
    ? tickets.filter(t => t.createdBy === currentUser?.id)
    : (role === 'technician' || role === 'field_technician')
      ? tickets.filter(t => t.assignedTo === currentUser?.id)
      : tickets;

  const conversations = myTickets
    .filter(t =>
      chatMessages.some(m => m.ticketId === t.id) || t.status !== 'closed'
    )
    .sort((a, b) => {
      const lastActive = (t: { id: string; createdAt: string }) => chatMessages
        .filter(m => m.ticketId === t.id)
        .reduce((max, m) => Math.max(max, new Date(m.createdAt).getTime()), new Date(t.createdAt).getTime());
      return lastActive(b) - lastActive(a);
    });

  const filteredConversations = search
    ? conversations.filter(t => {
        const haystack = `${t.title} ${t.productItem ?? ''} ${t.issueTrigger ?? ''}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
    : conversations;

  const activeMessages = chatMessages
    .filter(m => m.ticketId === selectedTicket)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const selectedTicketData = tickets.find(t => t.id === selectedTicket);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [activeMessages.length]);

  const handleSend = () => {
    if (!msg.trim() || !currentUser || !selectedTicket) return;
    stopTyping(selectedTicket, currentUser.email);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    const ticket = tickets.find(t => t.id === selectedTicket);
    if (ticket?.triageStatus === 'ai_diagnosing' && currentUser.id === ticket.createdBy) {
      submitTriageAnswer(selectedTicket, msg.trim());
      setMsg('');
      return;
    }
    addChatMessage({
      ticketId: selectedTicket,
      senderEmail: currentUser.email,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      message: msg.trim(),
      isAdmin: currentUser.role !== 'customer',
    });
    setMsg('');
    simulateReply(selectedTicket);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) {
        setPendingFile({ url: ev.target.result as string, name: file.name, type: file.type });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSendFile = () => {
    if (!pendingFile || !currentUser || !selectedTicket) return;
    stopTyping(selectedTicket, currentUser.email);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    addChatMessage({
      ticketId: selectedTicket,
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
    simulateReply(selectedTicket);
  };

  const ConversationList = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 dark:border-dark-border flex-shrink-0">
        <h3 className="font-heading font-semibold text-slate-900 dark:text-white text-sm mb-3">
          Conversations
          {conversations.length > 0 && (
            <span className="ml-2 text-xs text-slate-400 font-normal">({conversations.length})</span>
          )}
        </h3>
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
        {filteredConversations.length === 0 ? (
          <div className="text-center py-10 px-4">
            <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No conversations found</p>
          </div>
        ) : filteredConversations.map(t => {
          const msgs = chatMessages.filter(m => m.ticketId === t.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          const lastMsg = msgs[0];
          const unreadCount = msgs.filter(m => !m.isAdmin && role !== 'customer').length;
          const isSelected = selectedTicket === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTicket(t.id)}
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

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Messaging"
        title="Live Chat"
        subtitle="Follow up on your tickets and message the support team in real time."
        actions={selectedTicket && (
          <Link to={`/tickets/${selectedTicket}`} className="hidden sm:inline-flex">
            <Button variant="outline" size="sm">Open Ticket <ArrowRight className="w-3.5 h-3.5" /></Button>
          </Link>
        )}
      />
      <div className="mt-5">
      <Card className="card-premium overflow-hidden">
        <div className="flex" style={{ height: 'calc(100vh - 240px)', minHeight: '480px' }}>

          {/* Sidebar — hidden on mobile when a ticket is selected */}
          <div className={`border-r border-slate-200 dark:border-dark-border flex-col flex-shrink-0 ${selectedTicket ? 'hidden sm:flex w-64 lg:w-72' : 'flex w-full sm:w-64 lg:w-72'}`}>
            <ConversationList />
          </div>

          {/* Chat panel */}
          {selectedTicket ? (
            <div className="flex-1 flex flex-col min-w-0">
              {/* Chat header */}
              <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-dark-border flex items-center gap-3 bg-white dark:bg-dark-card flex-shrink-0">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="sm:hidden text-emerald-500 hover:text-emerald-600 font-medium flex-shrink-0 flex items-center gap-1 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md shadow-emerald-500/20">
                  {(selectedTicketData?.issueTrigger || selectedTicketData?.title || '?').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {selectedTicketData?.issueTrigger || cleanTicketTitle(selectedTicketData?.title || '')}
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    {selectedTicketData?.productItem ? `${selectedTicketData.productItem} · ` : ''}#{selectedTicket}
                  </p>
                </div>
                {selectedTicketData && (
                  <Badge variant={statusVariant[selectedTicketData.status]} className="flex-shrink-0 hidden sm:inline-flex">
                    {selectedTicketData.status.replace(/_/g, ' ')}
                  </Badge>
                )}
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
                      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5" />
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
                            onClick={() => submitTriageAnswer(selectedTicket!, opt)}
                            className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-violet-200 dark:border-violet-700/50 text-violet-700 dark:text-violet-300 bg-white dark:bg-dark-card hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
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
                <p className="text-sm text-slate-400 mt-1">Choose a ticket to view its messages</p>
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
