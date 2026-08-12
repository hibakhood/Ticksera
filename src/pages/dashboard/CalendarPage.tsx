import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Monitor, MapPin } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function formatTime(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDayHeader(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const { bookings, currentUser } = useStore();
  const today = new Date();
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const role = currentUser?.role;
  const myBookings = role === 'customer'
    ? bookings.filter(b => b.createdBy === currentUser?.id)
    : role === 'technician' || role === 'field_technician'
    ? bookings.filter(b => b.assignedTechnician === currentUser?.id)
    : bookings;

  const dateStr = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const bookingsForDay = (d: number) =>
    myBookings.filter(b => b.preferredDate === dateStr(year, month, d));

  const selectedStr = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`;
  const selectedBookings = myBookings.filter(b => b.preferredDate === selectedStr);

  const upcomingBookings = myBookings
    .filter(b => new Date(b.preferredDate) > today)
    .sort((a, b) => new Date(a.preferredDate).getTime() - new Date(b.preferredDate).getTime())
    .slice(0, 5);

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const isSelected = (d: number) =>
    d === selected.getDate() && month === selected.getMonth() && year === selected.getFullYear();

  // Build calendar grid: prev month grey days + current month + next month grey days
  const cells: { day: number; current: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevMonthDays - i, current: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - firstDay + 1, current: false });

  const statusColor: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className="animate-fade-in space-y-5 premium-surface rounded-2xl p-1">
      {/* Header */}
      <PageHeader
        eyebrow="Scheduling"
        title="Service Calendar"
        subtitle="Schedule and manage your support sessions at a glance."
        actions={(
          <button
            onClick={() => navigate('/booking')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-sm font-semibold transition-all shadow-md shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            Book Session
          </button>
        )}
      />

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-5">
        {/* Calendar card */}
        <div className="card-premium bg-white dark:bg-dark-card rounded-2xl border border-slate-200/80 dark:border-dark-border p-5 shadow-sm">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setCurrent(new Date(year, month - 1, 1))}
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="font-heading text-lg font-bold text-slate-900 dark:text-white">
              {MONTHS[month]} {year}
            </h2>
            <button
              onClick={() => setCurrent(new Date(year, month + 1, 1))}
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500 py-1.5">
                {d}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              const dots = cell.current ? bookingsForDay(cell.day) : [];
              return (
                <div
                  key={i}
                  onClick={() => {
                    if (cell.current) setSelected(new Date(year, month, cell.day));
                  }}
                  className={`min-h-[52px] sm:min-h-[64px] p-1 sm:p-1.5 rounded-xl transition-colors ${cell.current ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60' : 'opacity-40'}`}
                >
                  {/* Day number */}
                  <div className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-xs sm:text-sm font-medium mx-auto mb-1 transition-colors ${
                    isToday(cell.day) && cell.current
                      ? 'bg-emerald-500 text-white font-bold'
                      : isSelected(cell.day) && cell.current
                      ? 'ring-2 ring-emerald-400 text-emerald-600 dark:text-emerald-400'
                      : cell.current
                      ? 'text-slate-700 dark:text-slate-300'
                      : 'text-slate-400 dark:text-slate-600'
                  }`}>
                    {cell.day}
                  </div>
                  {/* Booking dots/pills */}
                  <div className="space-y-0.5">
                    {dots.slice(0, 2).map(b => (
                      <div key={b.id} className="text-[10px] leading-tight px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 truncate">
                        {formatTime(b.preferredTime)}
                      </div>
                    ))}
                    {dots.length > 2 && (
                      <div className="text-[10px] text-slate-400 px-1.5">+{dots.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Day detail panel */}
        <div className="card-premium bg-white dark:bg-dark-card rounded-2xl border border-slate-200/80 dark:border-dark-border p-5 shadow-sm flex flex-col gap-5">
          {/* Selected day */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-bold text-slate-900 dark:text-white text-base">
                {formatDayHeader(selected)}
              </h3>
              <button
                onClick={() => navigate('/booking')}
                className="flex items-center gap-1 text-xs font-semibold px-3.5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            {selectedBookings.length === 0 ? (
              <div className="py-5 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">No sessions on this day</p>
                <button
                  onClick={() => navigate('/booking')}
                  className="text-xs text-emerald-500 hover:text-emerald-600 font-semibold mt-1 p-2 -m-2 rounded-lg transition-colors"
                >
                  + Book a session
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedBookings.map(b => (
                  <div key={b.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {b.sessionType === 'remote'
                          ? <Monitor className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          : <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{b.serviceType}</span>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize whitespace-nowrap flex-shrink-0 ${statusColor[b.status]}`}>
                        {b.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-1.5 ml-5">
                      <Clock className="w-3 h-3" />
                      {formatTime(b.preferredTime)}
                      <span className="mx-1">·</span>
                      <span className="capitalize">{b.sessionType}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming */}
          <div className="border-t border-slate-100 dark:border-dark-border pt-5">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Upcoming</p>
            {upcomingBookings.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">No upcoming sessions</p>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map(b => (
                  <div
                    key={b.id}
                    onClick={() => {
                      const d = new Date(b.preferredDate + 'T00:00:00');
                      setSelected(d);
                      setCurrent(new Date(d.getFullYear(), d.getMonth(), 1));
                    }}
                    className="flex items-start gap-2.5 cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 transition-colors">
                      <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{b.serviceType}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{b.preferredDate} · {formatTime(b.preferredTime)}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0 mt-0.5 ${statusColor[b.status]}`}>{b.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
