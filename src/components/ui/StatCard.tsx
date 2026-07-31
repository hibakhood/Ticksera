import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  gradient: string;
  sub?: string;
  trend?: { value: string; up?: boolean };
  onClick?: () => void;
}

export default function StatCard({ label, value, icon: Icon, gradient, sub, trend, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`card-premium relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-dark-border bg-white dark:bg-dark-card p-5 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-[0.08] dark:opacity-[0.14]`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-2 font-heading text-2xl sm:text-[28px] font-bold text-slate-900 dark:text-white tracking-tight">
            {value}
          </p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        <div className={`chip-icon bg-gradient-to-br ${gradient} shadow-lg shadow-slate-900/10`}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              trend.up
                ? 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-50 dark:bg-rose-900/25 text-rose-600 dark:text-rose-400'
            }`}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className={trend.up ? '' : 'rotate-180'}>
              <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
}
