import { summarizeLife, localDate } from '../lib/insights';

const now = new Date(2026, 9, 17, 0, 15);

test('empty accounts return finite zero metrics and local dates', () => {
  const summary = summarizeLife({}, now);
  expect(localDate(now)).toBe('2026-10-17');
  expect(summary.taskRate).toBe(0);
  expect(summary.goalRate).toBe(0);
  expect(summary.habitRate).toBe(0);
  expect(summary.habitTrend[0].date).toBe('2026-10-11');
});

test('finance includes only current month and normalizes numeric amounts', () => {
  const summary = summarizeLife({ transactions: [
    { type: 'income', amount: '100000', date: '2026-10-01' },
    { type: 'expense', amount: '25000', date: '2026-10-17' },
    { type: 'expense', amount: 50000, date: '2026-09-30' },
    { type: 'expense', amount: 'invalid', date: '2026-10-17' },
  ] }, now);
  expect(summary.income).toBe(100000);
  expect(summary.expense).toBe(25000);
});

test('habit denominator excludes dates before habit creation', () => {
  const summary = summarizeLife({ habits: [{ createdAt: '2026-10-17', completedDates: ['2026-10-17'] }] }, now);
  expect(summary.habitRate).toBe(100);
  expect(summary.habitTrend[0].total).toBe(0);
});

test('goal milestones and archived goals are handled independently', () => {
  const summary = summarizeLife({ goals: [
    { milestones: [{ done: true }, { done: false }] },
    { completed: true },
    { archived: true, completed: false },
  ], tasks: [{ status: 'done' }, { status: 'todo' }] }, now);
  expect(summary.goalRate).toBe(75);
  expect(summary.taskRate).toBe(50);
});

test('streak survives until today is checked in and crosses month boundaries', async () => {
  const { habitStreak } = await import('../lib/insights');
  expect(habitStreak(['2026-09-29', '2026-09-30'], new Date(2026, 9, 1))).toBe(2);
  expect(habitStreak(['2026-09-29', '2026-09-30', '2026-10-01'], new Date(2026, 9, 1))).toBe(3);
  expect(habitStreak(['2026-09-29'], new Date(2026, 9, 1))).toBe(0);
});

test('mobile journey and web milestones produce the same goal progress', async () => {
  const { normalizeGoal } = await import('../lib/insights');
  const goal = normalizeGoal({ journey: [{ id: 'a', text: 'Learn', completed: true }, { id: 'b', text: 'Build', completed: false }], deadline: '2026-12-01' });
  expect(goal.progress).toBe(50);
  expect(goal.targetDate).toBe('2026-12-01');
  expect(goal.milestones[0].done).toBe(true);
  expect(normalizeGoal(goal)).toEqual(goal);
});
