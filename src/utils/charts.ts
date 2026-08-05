/** Helpers for building date-bucketed chart data from real store collections. */

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function lastMonthKeys(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export function monthLabel(key: string): string {
  const m = new Date(`${key}-01T00:00:00`);
  return m.toLocaleDateString('en-US', { month: 'short' });
}

export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function lastDayKeys(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i);
    out.push(
      `${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, '0')}-${String(dd.getDate()).padStart(2, '0')}`
    );
  }
  return out;
}

export function dayLabel(key: string): string {
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}
