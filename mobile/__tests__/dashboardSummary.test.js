import { dashboardSummary, dueDay, localDay } from '../lib/dashboardSummary';
const now = new Date(2026, 9, 22, 10); // Thursday, local calendar time
const task = (deadline, status = 'todo') => ({ deadline, status, title: deadline });
test('empty week has a finite zero and excludes undated tasks from today', () => {
  const result = dashboardSummary([task('')], now);
  expect(result.total).toBe(0); expect(result.percent).toBe(0); expect(result.todayOpen).toEqual([]);
});
test('today excludes tomorrow and separates overdue; completion updates the summary', () => {
  const result = dashboardSummary([task('2026-10-22'), task('2026-10-22', 'done'), task('2026-10-21'), task('2026-10-23')], now);
  expect(result.todayTotal).toBe(2); expect(result.todayDone).toBe(1); expect(result.todayOpen).toHaveLength(1); expect(result.overdue).toBe(1);
  expect(result.percent).toBe(25); expect(result.total).toBe(4);
});
test('weekly percentage is weighted by tasks, excludes cancelled, and includes scheduled future days', () => {
  const result = dashboardSummary([task('2026-10-19', 'done'), task('2026-10-22'), task('2026-10-22'), task('2026-10-25'), task('2026-10-25', 'cancelled'), task('2026-10-26', 'done')], now);
  expect(result.percent).toBe(25); expect(result.days[6].future).toBe(true); expect(result.days[6].total).toBe(1); expect(result.days[0].pct).toBe(100);
});
test('Sunday belongs to the previous Monday and complete today stays distinct from empty', () => {
  const result = dashboardSummary([task('2026-10-25', 'done')], new Date(2026, 9, 25));
  expect(localDay(result.days[0].date)).toBe('2026-10-19'); expect(result.todayDone).toBe(result.todayTotal); expect(result.todayTotal).toBe(1); expect(result.todayOpen).toEqual([]);
});
test('timestamp deadlines use the device calendar day and invalid values are ignored', () => {
  const local = new Date(2026, 9, 22, 0, 30);
  expect(dueDay(local.toISOString())).toBe('2026-10-22'); expect(dueDay('invalid')).toBe(''); expect(dueDay('2026-10-22')).toBe('2026-10-22');
});
