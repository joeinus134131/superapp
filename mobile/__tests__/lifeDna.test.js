import { lifeDnaMetrics } from '../lib/lifeDna';
const empty = { tasks: [], habits: [], goals: [], today: '2026-10-22', journalCount: 0, focusSessions: 0, workouts: 0, monthlyIncome: 0, monthlyExpense: 0 };
test('no records means no radar axes, fabricated defaults, or social score', () => {
  const result = lifeDnaMetrics(empty); expect(result.hasActivity).toBe(false); expect(result.chart).toEqual([]); expect(result.metrics.every(item => item.value === 0)).toBe(true); expect(result.metrics.find(item => item.key === 'social')).toBeUndefined();
});
test('existing incomplete tasks and habits are real zeroes, not fifteen or twenty percent fills', () => {
  const result = lifeDnaMetrics({ ...empty, tasks: [{ status: 'todo' }], habits: [{ completedDates: [] }] });
  expect(result.hasActivity).toBe(true); expect(result.chart.map(item => item.value)).toEqual([0, 0]);
});
test('no income does not invent a fifty percent financial ratio', () => {
  const result = lifeDnaMetrics({ ...empty, monthlyExpense: 100 }); const money = result.metrics.find(item => item.key === 'money');
  expect(result.hasActivity).toBe(true); expect(money.available).toBe(false); expect(money.value).toBe(0);
});
test('available metrics use recorded activity and remain finite within zero to one hundred', () => {
  const result = lifeDnaMetrics({ ...empty, focusSessions: 2, journalCount: 5, monthlyIncome: 1000, monthlyExpense: 200, tasks: [{ status: 'done' }, { status: 'todo' }], goals: [{ progress: 50 }] });
  expect(result.metrics.find(item => item.key === 'mind').value).toBe(50); expect(result.metrics.find(item => item.key === 'money').value).toBe(80); expect(result.metrics.find(item => item.key === 'growth').value).toBe(50); expect(result.chart.every(item => Number.isFinite(item.value) && item.value >= 0 && item.value <= 100)).toBe(true);
});
