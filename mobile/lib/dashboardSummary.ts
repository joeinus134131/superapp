// Calendar dates use device-local time. Undated tasks stay in the task list;
// the weekly denominator uses current deadlines, including moved/overdue tasks.
export function localDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function dueDay(deadline?: string) {
  if (!deadline) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return deadline;
  const date = new Date(deadline);
  return Number.isNaN(date.getTime()) ? '' : localDay(date);
}
export function dashboardSummary<T extends { deadline?: string; status: string }>(tasks: T[], now: Date) {
  const today = localDay(now);
  const eligible = tasks.filter(t => !['cancelled', 'canceled', 'archived'].includes(t.status));
  const todays = eligible.filter(t => dueDay(t.deadline) === today);
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() + 6) % 7);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday); date.setDate(monday.getDate() + index);
    const key = localDay(date);
    const scheduled = eligible.filter(t => dueDay(t.deadline) === key);
    const done = scheduled.filter(t => t.status === 'done').length;
    return { date, total: scheduled.length, done, pct: scheduled.length ? Math.round(done / scheduled.length * 100) : 0, active: key === today, future: key > today };
  });
  const total = days.reduce((n, d) => n + d.total, 0);
  const done = days.reduce((n, d) => n + d.done, 0);
  return { days, total, done, percent: total ? Math.round(done / total * 100) : 0,
    todayTotal: todays.length, todayDone: todays.filter(t => t.status === 'done').length,
    todayOpen: todays.filter(t => t.status !== 'done'),
    overdue: eligible.filter(t => t.status !== 'done' && dueDay(t.deadline) && dueDay(t.deadline) < today).length };
}
