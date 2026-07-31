import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

export const SLA_HOURS: Record<string, number> = {
  low:      5,
  medium:   3,
  high:     1,
  critical: 0.25,
};

function formatTime(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
  }
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface Props {
  deadline?: string;
  status: string;
  priority: string;
  compact?: boolean;
}

export default function SLACountdown({ deadline, status, priority, compact = false }: Props) {
  const [now, setNow] = useState(() => Date.now());

  const isTerminal = status === 'resolved' || status === 'closed';

  useEffect(() => {
    if (!deadline || isTerminal) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [deadline, isTerminal]);

  if (isTerminal) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 font-medium ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'}`}>
        <CheckCircle className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
        {status === 'resolved' ? 'Resolved' : 'Closed'}
      </span>
    );
  }

  if (!deadline) {
    return <span className={`text-gray-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>No SLA</span>;
  }

  const remaining = new Date(deadline).getTime() - now;
  const breached  = remaining <= 0;

  if (breached) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'}`}>
        <AlertTriangle className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
        Breached
      </span>
    );
  }

  const slaTotal = (SLA_HOURS[priority] ?? 24) * 3_600_000;
  const pct      = remaining / slaTotal;

  let cls: string;
  if (pct < 0.15)      cls = 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400';
  else if (pct < 0.35) cls = 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400';
  else                 cls = 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${cls} font-semibold ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'}`}>
      <Clock className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {formatTime(remaining)}
    </span>
  );
}
