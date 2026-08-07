import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../store';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { CalendarCheck, CheckCircle, Monitor, MapPin, Clock, Calendar, ChevronDown } from 'lucide-react';

const SERVICE_TYPES = [
  'Computer Repair',
  'Networking',
  'Printer Support',
  'CCTV Installation',
  'Internet Setup',
  'Microsoft 365',
  'Server Support',
  'Website Support',
  'Software Installation',
  'Remote Assistance',
];

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00',
];

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

const today = new Date().toISOString().split('T')[0];

const CATEGORY_TO_SERVICE: Record<string, string> = {
  'hardware':    'Computer Repair',
  'software':    'Software Installation',
  'network':     'Networking',
  'security':    'CCTV Installation',
  'user_access': 'Remote Assistance',
};

export default function Booking() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromTicket = (location.state as any)?.fromTicket as { id: string; title: string; coreCategory?: string; assignedTo?: string } | undefined;
  const { currentUser, addBooking, bookings, users, updateBooking } = useStore();
  const role = currentUser?.role;
  const isStaff = ['super_admin', 'support_manager', 'technician', 'field_technician'].includes(role ?? '');

  const [booked, setBooked] = useState(false);
  const [form, setForm] = useState({
    serviceType: fromTicket?.coreCategory ? (CATEGORY_TO_SERVICE[fromTicket.coreCategory] ?? '') : '',
    sessionType: 'remote' as 'remote' | 'onsite',
    preferredDate: today,
    preferredTime: '',
    contactPhone: '',
    description: fromTicket ? `Re: Ticket #${fromTicket.id}: ${fromTicket.title}` : '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const technicians = users.filter(u => ['technician', 'field_technician'].includes(u.role));

  const myBookings = role === 'customer'
    ? bookings.filter(b => b.createdBy === currentUser?.id)
    : role === 'technician' || role === 'field_technician'
    ? bookings.filter(b => b.assignedTechnician === currentUser?.id)
    : bookings;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.serviceType) e.serviceType = 'Please select a service type';
    if (!form.preferredDate) e.preferredDate = 'Please select a date';
    if (!form.preferredTime) e.preferredTime = 'Please select a time';
    if (!form.contactPhone.trim()) e.contactPhone = 'Phone number is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !validate()) return;
    addBooking({
      ...form,
      status: fromTicket?.assignedTo ? 'confirmed' : 'pending',
      createdBy: currentUser.id,
      ...(fromTicket ? { ticketId: fromTicket.id } : {}),
      ...(fromTicket?.assignedTo ? { assignedTechnician: fromTicket.assignedTo } : {}),
    });
    setBooked(true);
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  if (booked) {
    return (
      <div className="max-w-lg mx-auto animate-fade-in">
        <Card className="card-premium p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-slate-900 dark:text-white mb-2">Session Booked!</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">
            Your <strong className="text-slate-700 dark:text-slate-200">{form.serviceType}</strong> session has been submitted.
          </p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-7">
            We'll confirm your {form.sessionType} appointment for <strong className="text-slate-700 dark:text-slate-200">{form.preferredDate}</strong> at <strong className="text-slate-700 dark:text-slate-200">{formatTime(form.preferredTime)}</strong>.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate('/calendar')}>View Calendar</Button>
            <Button variant="ghost" onClick={() => { setBooked(false); setForm({ serviceType: '', sessionType: 'remote', preferredDate: today, preferredTime: '', contactPhone: '', description: '' }); }}>
              Book Another
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-8">
      {/* Page header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 text-white p-6 sm:p-8 shadow-lg shadow-emerald-600/20">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute right-16 -bottom-16 w-48 h-48 rounded-full bg-white/5" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0 ring-1 ring-white/25">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">Book a Support Session</h1>
            <p className="text-sm text-emerald-50/90 mt-1">Schedule a remote or onsite session with our experts</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <Card className="card-premium p-6 sm:p-8">
        {/* Linked-ticket banner */}
        {fromTicket && (() => {
          const assignedTech = fromTicket.assignedTo ? users.find(u => u.id === fromTicket.assignedTo) : null;
          return (
            <div className="mb-6 rounded-xl border overflow-hidden border-emerald-200 dark:border-emerald-800">
              <div className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/15">
                <CalendarCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    Booking for Ticket #{fromTicket.id}
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5 line-clamp-1">
                    {fromTicket.title}
                  </p>
                </div>
              </div>
              {assignedTech && (
                <div className="flex items-center gap-2.5 px-4 py-2.5 bg-emerald-100/60 dark:bg-emerald-900/25 border-t border-emerald-200 dark:border-emerald-800">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    {assignedTech.name.charAt(0)}
                  </div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    <span className="font-semibold">{assignedTech.name}</span> will be automatically assigned to this session
                  </p>
                </div>
              )}
            </div>
          );
        })()}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Service Type <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={form.serviceType}
                onChange={e => { setForm({ ...form, serviceType: e.target.value }); setErrors({ ...errors, serviceType: '' }); }}
                className={`w-full appearance-none px-4 py-3 pr-10 rounded-xl border text-sm bg-white dark:bg-dark-bg text-slate-700 dark:text-white outline-none transition-all focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${errors.serviceType ? 'border-red-400' : 'border-slate-200 dark:border-dark-border'}`}
              >
                <option value="">What do you need help with?</option>
                {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            {errors.serviceType && <p className="text-xs text-red-500 mt-1">{errors.serviceType}</p>}
          </div>

          {/* Session Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Session Type</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: 'remote', icon: Monitor, desc: 'We connect securely online' },
                { key: 'onsite', icon: MapPin, desc: 'An expert visits your location' },
              ] as const).map(({ key, icon: Icon, desc }) => {
                const selected = form.sessionType === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm({ ...form, sessionType: key })}
                    className={`card-premium relative flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                      selected
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-900/15 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card hover:border-emerald-300 dark:hover:border-emerald-700'
                    }`}
                  >
                    <div className={`chip-icon w-10 h-10 rounded-xl ${selected ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-slate-100 dark:bg-slate-800'}`}>
                      <Icon className={`w-4.5 h-4.5 ${selected ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${selected ? 'text-emerald-800 dark:text-emerald-200' : 'text-slate-800 dark:text-slate-200'}`}>
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{desc}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors ${selected ? 'border-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                      {selected && <div className="w-2 h-2 rounded-full bg-emerald-500 m-auto mt-[2px]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date + Time */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Preferred Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                min={today}
                value={form.preferredDate}
                onChange={e => { setForm({ ...form, preferredDate: e.target.value }); setErrors({ ...errors, preferredDate: '' }); }}
                className={`w-full px-4 py-3 rounded-xl border text-sm bg-white dark:bg-dark-bg text-slate-700 dark:text-white outline-none transition-all focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${errors.preferredDate ? 'border-red-400' : 'border-slate-200 dark:border-dark-border'}`}
              />
              {errors.preferredDate && <p className="text-xs text-red-500 mt-1">{errors.preferredDate}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Preferred Time <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={form.preferredTime}
                  onChange={e => { setForm({ ...form, preferredTime: e.target.value }); setErrors({ ...errors, preferredTime: '' }); }}
                  className={`w-full appearance-none px-4 py-3 pr-10 rounded-xl border text-sm bg-white dark:bg-dark-bg text-slate-700 dark:text-white outline-none transition-all focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${errors.preferredTime ? 'border-red-400' : 'border-slate-200 dark:border-dark-border'}`}
                >
                  <option value="">Select time</option>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{formatTime(t)}</option>)}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
              {errors.preferredTime && <p className="text-xs text-red-500 mt-1">{errors.preferredTime}</p>}
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Phone Number</label>
            <input
              type="tel"
              placeholder="+234..."
              value={form.contactPhone}
              onChange={e => { setForm({ ...form, contactPhone: e.target.value }); setErrors({ ...errors, contactPhone: '' }); }}
              className={`w-full px-4 py-3 rounded-xl border text-sm bg-white dark:bg-dark-bg text-slate-700 dark:text-white placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${errors.contactPhone ? 'border-red-400' : 'border-slate-200 dark:border-dark-border'}`}
            />
            {errors.contactPhone && <p className="text-xs text-red-500 mt-1">{errors.contactPhone}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Describe the Issue</label>
            <textarea
              rows={4}
              placeholder="Tell us what's wrong..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-dark-border text-sm bg-white dark:bg-dark-bg text-slate-700 dark:text-white placeholder-slate-400 outline-none transition-all focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
          </div>

          <Button type="submit" className="w-full py-3 text-base">Book Session</Button>
        </form>
      </Card>

      {/* Staff booking list */}
      {isStaff && myBookings.length > 0 && (
        <div>
          <h2 className="font-heading text-lg font-bold text-slate-900 dark:text-white mb-4">
            {role === 'technician' || role === 'field_technician' ? 'My Assigned Sessions' : 'All Booked Sessions'}
          </h2>
          <div className="space-y-3">
            {myBookings.map(b => (
              <Card key={b.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                    {b.sessionType === 'remote' ? <Monitor className="w-4 h-4 text-emerald-600" /> : <MapPin className="w-4 h-4 text-emerald-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{b.serviceType}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.preferredDate}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(b.preferredTime)}</span>
                    </div>
                    {b.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{b.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColor[b.status]}`}>{b.status}</span>
                  {(role === 'super_admin' || role === 'support_manager') && b.status === 'pending' && (
                    <div className="relative">
                      <select
                        value={b.assignedTechnician || ''}
                        onChange={e => updateBooking(b.id, { assignedTechnician: e.target.value, status: 'confirmed' })}
                        style={{ WebkitAppearance: 'none', MozAppearance: 'none', appearance: 'none' }}
                        className="text-xs pl-2.5 pr-7 py-1.5 rounded-lg border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-bg text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent cursor-pointer transition-all"
                      >
                        <option value="">Assign tech…</option>
                        {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
