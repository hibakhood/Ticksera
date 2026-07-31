import { memo } from 'react';

export default memo(function PageLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-slate-200 dark:border-slate-700" />
        <div className="absolute inset-0 rounded-full border-2 border-t-emerald-500 animate-spin" />
      </div>
      <p className="text-sm text-slate-400 dark:text-slate-500 animate-pulse">Loading…</p>
    </div>
  );
});
