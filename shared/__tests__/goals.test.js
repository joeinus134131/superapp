import {
  GOAL_SCHEMA_VERSION,
  addGoalEntry,
  createGoal,
  formatCompactValue,
  formatGoalValue,
  getGoalSnapshot,
  getJourneyStops,
  getRecoveryOptions,
  getWeeklyQuota,
  goalFromTemplate,
  GOAL_TEMPLATES,
  inferGoalFromTitle,
  markCelebrated,
  migrateGoal,
  parseGoalAmount,
  pendingCelebrations,
  pickNextGoalAction,
  removeGoalEntry,
  saveGoalReview,
  setGoalStatus,
  simulateGoal,
  toggleGoalMilestone,
} from '../lib/goals';

const NOW = new Date(2026, 9, 22, 12, 0);

describe('parseGoalAmount & formatters', () => {
  test('parses friendly Indonesian & English numeric inputs', () => {
    expect(parseGoalAmount('100jt')).toBe(100_000_000);
    expect(parseGoalAmount('1,5 juta')).toBe(1_500_000);
    expect(parseGoalAmount('500rb')).toBe(500_000);
    expect(parseGoalAmount('2M')).toBe(2_000_000_000);
    expect(parseGoalAmount('1.250.000')).toBe(1_250_000);
    expect(parseGoalAmount('Rp 37.450.000')).toBe(37_450_000);
    expect(parseGoalAmount('72.5')).toBe(72.5);
    expect(Number.isNaN(parseGoalAmount('abc'))).toBe(true);
  });

  test('formats full and compact goal values in Indonesian and English', () => {
    expect(formatGoalValue(100_000_000, 'IDR', 'id')).toMatch(/100\.000\.000/);
    expect(formatCompactValue(37_400_000, 'IDR', 'id')).toBe('Rp 37,4 jt');
    expect(formatCompactValue(950_000, 'IDR', 'id')).toBe('Rp 950 rb');
    expect(formatGoalValue(12, 'book', 'id')).toBe('12 buku');
    expect(formatCompactValue(37_400_000, 'IDR', 'en')).toBe('Rp 37.4 M');
    expect(formatCompactValue(950_000, 'IDR', 'en')).toBe('Rp 950 k');
    expect(formatGoalValue(12, 'book', 'en')).toBe('12 books');
  });

  test('infers goal type, unit, and target directly from human title', () => {
    expect(inferGoalFromTitle('Nabung 100jt pertama')).toEqual({
      type: 'accumulate',
      unit: 'IDR',
      category: 'finance',
      startValue: 0,
      targetValue: 100_000_000,
    });
    expect(inferGoalFromTitle('Lunasi utang 25jt')).toEqual({
      type: 'payoff',
      unit: 'IDR',
      category: 'finance',
      startValue: 25_000_000,
      targetValue: 0,
    });
    expect(inferGoalFromTitle('Baca 24 buku tahun ini')).toMatchObject({
      type: 'increase',
      unit: 'book',
      targetValue: 24,
    });
  });
});

describe('migrateGoal & createGoal', () => {
  test('migrates v1 web and mobile goals cleanly to v2', () => {
    const legacyMobile = migrateGoal({
      id: 'g1',
      title: 'Learn Go',
      category: 'Karir',
      deadline: '2026-12-31',
      journey: [
        { id: 'm1', text: 'Syntax', completed: true },
        { id: 'm2', text: 'Build API', completed: false },
      ],
    });
    expect(legacyMobile.schemaVersion).toBe(GOAL_SCHEMA_VERSION);
    expect(legacyMobile.category).toBe('career');
    expect(legacyMobile.type).toBe('milestone');
    expect(legacyMobile.targetDate).toBe('2026-12-31');
    expect(legacyMobile.progress).toBe(50);
    expect(legacyMobile.milestones).toHaveLength(2);
    expect(legacyMobile.journey[0].completed).toBe(true);
  });

  test('tracks finance accumulate goal with entries, pace, projection, and checkpoints', () => {
    let goal = createGoal({
      title: '100 Juta Pertama',
      type: 'accumulate',
      unit: 'IDR',
      category: 'finance',
      startValue: 0,
      targetValue: 100_000_000,
      startDate: '2026-09-22',
      targetDate: '2027-09-22',
    }, NOW);

    goal = addGoalEntry(goal, { amount: 25_000_000, date: '2026-10-01', note: 'Tabungan awal' });
    goal = addGoalEntry(goal, { amount: 12_450_000, date: '2026-10-20', note: 'Gajian Oktober' });

    const snap = getGoalSnapshot(goal, {}, NOW);
    expect(snap.current).toBe(37_450_000);
    expect(snap.percent).toBe(37);
    expect(snap.remaining).toBe(62_550_000);
    expect(snap.status).toBe('ahead');
    expect(snap.nextCheckpoint.percent).toBe(50);
    expect(snap.nextCheckpoint.value).toBe(50_000_000);
    expect(snap.nextCheckpoint.remaining).toBe(12_550_000);
    expect(snap.velocityPerDay).toBeGreaterThan(1_000_000);
    expect(snap.projectedDate).toBeTruthy();
    expect(pendingCelebrations(goal, snap)).toEqual([10, 25]);

    const celebrated = markCelebrated(goal, [10, 25]);
    expect(pendingCelebrations(celebrated, snap)).toEqual([]);

    const quota = getWeeklyQuota(snap);
    expect(quota.amount).toBeGreaterThan(0);
    expect(quota.done).toBe(12_450_000);
  });

  test('tracks debt payoff and weight decrease goals in descending direction', () => {
    let payoff = createGoal({
      title: 'Lunasi KTA',
      type: 'payoff',
      unit: 'IDR',
      startValue: 20_000_000,
      targetValue: 0,
      startDate: '2026-10-01',
      targetDate: '2027-04-01',
    }, NOW);
    payoff = addGoalEntry(payoff, { amount: 5_000_000, date: '2026-10-15', note: 'Cicilan 1' });
    const payoffSnap = getGoalSnapshot(payoff, {}, NOW);
    expect(payoffSnap.current).toBe(15_000_000);
    expect(payoffSnap.percent).toBe(25);
    expect(payoffSnap.remaining).toBe(15_000_000);

    let weightGoal = createGoal({
      title: 'Turun BB',
      type: 'decrease',
      unit: 'kg',
      startValue: 82,
      targetValue: 72,
      startDate: '2026-10-01',
      targetDate: '2027-02-01',
      source: { kind: 'weight' },
    }, NOW);
    const weightSnap = getGoalSnapshot(weightGoal, {
      health: { weights: [{ id: 'w1', date: '2026-10-10', weight: 79.5 }, { id: 'w2', date: '2026-10-21', weight: 77 }] },
    }, NOW);
    expect(weightSnap.current).toBe(77);
    expect(weightSnap.percent).toBe(50);
    expect(weightSnap.remaining).toBe(5);
  });

  test('links reading, pomodoro, workouts, habits, and finance transactions', () => {
    const readingGoal = createGoal({
      title: 'Baca 10 Buku',
      type: 'increase',
      unit: 'book',
      startValue: 0,
      targetValue: 10,
      startDate: '2026-01-01',
      targetDate: '2026-12-31',
      source: { kind: 'reading' },
    }, NOW);
    const readSnap = getGoalSnapshot(readingGoal, {
      books: [
        { id: 'b1', status: 'completed', finishDate: '2026-03-10' },
        { id: 'b2', status: 'completed', finishDate: '2026-06-12' },
        { id: 'b3', status: 'reading', finishDate: '' },
      ],
    }, NOW);
    expect(readSnap.current).toBe(2);
    expect(readSnap.percent).toBe(20);

    const habitGoal = createGoal({
      title: 'Gym 50 Hari',
      type: 'consistency',
      unit: 'day',
      startValue: 0,
      targetValue: 50,
      startDate: '2026-10-01',
      source: { kind: 'habit', habitId: 'h1' },
    }, NOW);
    const habitSnap = getGoalSnapshot(habitGoal, {
      habits: [{ id: 'h1', completedDates: ['2026-10-02', '2026-10-02', '2026-10-05', '2026-10-12', '2026-10-20'] }],
    }, NOW);
    expect(habitSnap.current).toBe(4);
    expect(habitSnap.percent).toBe(8);
  });

  test('computes composite goals, simulator, recovery options, templates, and next action', () => {
    const childA = createGoal({ id: 'c1', parentId: 'parent1', title: 'Child A', type: 'increase', startValue: 0, targetValue: 100, startDate: '2026-01-01', targetDate: '2026-11-01' }, NOW);
    const childB = addGoalEntry(
      createGoal({ id: 'c2', parentId: 'parent1', title: 'Child B', type: 'increase', startValue: 0, targetValue: 100, startDate: '2026-01-01', targetDate: '2026-12-31' }, NOW),
      { amount: 80, date: '2026-10-10' },
    );
    const parent = createGoal({ id: 'parent1', title: 'Life Goal', type: 'composite', startDate: '2026-01-01', targetDate: '2026-12-31' }, NOW);
    const all = [parent, childA, childB];

    const parentSnap = getGoalSnapshot(parent, { goals: all }, NOW);
    expect(parentSnap.childCount).toBe(2);
    expect(parentSnap.percent).toBe(40);

    const next = pickNextGoalAction(all, {}, NOW);
    expect(next.goal.id).toBe('c1');

    const childASnap = getGoalSnapshot(childA, {}, NOW);
    const recovery = getRecoveryOptions(childA, childASnap, NOW);
    expect(recovery).toBeTruthy();
    expect(recovery.requiredPerDay).toBeGreaterThan(0);

    const sim = simulateGoal({ current: 20_000_000, target: 100_000_000, start: 0, perMonth: 5_000_000, annualReturn: 6, from: NOW });
    expect(sim.reachable).toBe(true);
    expect(sim.months).toBeLessThanOrEqual(16);

    const emergencyTpl = GOAL_TEMPLATES.find(t => t.id === 'emergency_fund');
    const generated = goalFromTemplate(emergencyTpl, {
      transactions: [
        { type: 'expense', amount: 4_000_000, date: '2026-09-10' },
        { type: 'expense', amount: 5_000_000, date: '2026-08-10' },
        { type: 'expense', amount: 6_000_000, date: '2026-07-10' },
      ],
    }, NOW);
    expect(generated.targetValue).toBe(30_000_000);
    expect(getJourneyStops(childB, getGoalSnapshot(childB, {}, NOW))).toHaveLength(6);
  });

  test('mutations: removeGoalEntry, toggleGoalMilestone, setGoalStatus, saveGoalReview', () => {
    let g = createGoal({
      title: 'Build MVP',
      type: 'milestone',
      milestones: [{ id: 'm1', text: 'Design', done: false, weight: 1 }],
    }, NOW);
    g = toggleGoalMilestone(g, 'm1', NOW);
    expect(getGoalSnapshot(g, {}, NOW).percent).toBe(100);

    g = addGoalEntry(g, { amount: 10, date: '2026-10-22' });
    const entryId = g.entries[0].id;
    g = removeGoalEntry(g, entryId);
    expect(g.entries).toHaveLength(0);

    g = saveGoalReview(g, { note: 'Solid week', commitment: 'Ship beta' }, NOW);
    expect(g.reviews).toHaveLength(1);

    g = setGoalStatus(g, 'completed', NOW);
    expect(g.completed).toBe(true);
    expect(g.completedAt).toBeTruthy();
  });
});
