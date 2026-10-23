import { ensureArray } from './helpers';
import { getGoalSnapshot, isLinkedGoal, migrateGoal, normalizeGoalCategory as normalizeCategory } from './goals';

export const normalizeGoalCategory = normalizeCategory;

export function normalizeGoal(goal) {
  if (!goal || typeof goal !== 'object') return goal;
  if (goal.schemaVersion === 2 || (goal.type && goal.type !== 'milestone')) {
    const migrated = migrateGoal(goal);
    if (!migrated) return goal;
    if (!isLinkedGoal(migrated) && migrated.status !== 'completed') {
      migrated.progress = getGoalSnapshot(migrated).percent;
    }
    return migrated;
  }
  const milestones = goal.milestones || (goal.journey || []).map(step => ({ id: step.id, text: step.text, done: !!step.completed }));
  const progress = milestones.length ? Math.round(milestones.filter(step => step.done).length / milestones.length * 100) : goal.completed ? 100 : Number(goal.progress) || 0;
  const category = goal.category ? normalizeGoalCategory(goal.category) : goal.category;
  return { 
    ...goal, 
    category,
    milestones, 
    journey: milestones.map(step => ({ id: step.id, text: step.text, completed: !!step.done })), 
    targetDate: goal.targetDate || goal.deadline || '', 
    deadline: goal.targetDate || goal.deadline || '', 
    progress 
  };
}

// Calendar dates are local to the device; do not use UTC ISO dates for check-ins.
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function summarizeLife({ tasks = [], habits = [], goals = [], transactions = [] } = {}, now = new Date(), days = 7) {
  const safeTasks = ensureArray(tasks);
  const safeHabits = ensureArray(habits);
  const safeGoals = ensureArray(goals);
  const safeTransactions = ensureArray(transactions);

  const today = localDate(now);
  const dates = Array.from({ length: days }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - days + index + 1);
    return localDate(date);
  });
  const scheduledHabits = date => safeHabits.filter(h => !h.createdAt || String(h.createdAt).slice(0, 10) <= date);
  const habitTrend = dates.map(date => {
    const scheduled = scheduledHabits(date);
    const completed = scheduled.filter(h => h.completedDates?.includes(date)).length;
    return { date, completed, total: scheduled.length, rate: scheduled.length ? Math.round(completed / scheduled.length * 100) : 0 };
  });
  const habitTotal = habitTrend.reduce((sum, day) => sum + day.total, 0);
  const habitDone = habitTrend.reduce((sum, day) => sum + day.completed, 0);
  const month = today.slice(0, 7);
  const monthly = safeTransactions.filter(t => String(t.date || t.createdAt || '').slice(0, 7) === month);
  const amount = t => Number.isFinite(Number(t.amount)) ? Number(t.amount) : 0;
  const income = monthly.filter(t => t.type === 'income').reduce((sum, t) => sum + amount(t), 0);
  const expense = monthly.filter(t => t.type === 'expense').reduce((sum, t) => sum + amount(t), 0);
  const completedTasks = safeTasks.filter(t => t.status === 'done').length;
  const activeGoals = safeGoals.filter(g => !g.archived).map(normalizeGoal);
  const goalProgress = activeGoals;
  return {
    completedTasks,
    taskRate: safeTasks.length ? Math.round(completedTasks / safeTasks.length * 100) : 0,
    habitsDone: safeHabits.filter(h => h.completedDates?.includes(today)).length,
    habitRate: habitTotal ? Math.round(habitDone / habitTotal * 100) : 0,
    habitTrend, goalProgress, income, expense,
    goalRate: goalProgress.length ? Math.round(goalProgress.reduce((sum, g) => sum + g.progress, 0) / goalProgress.length) : 0,
  };
}

export function habitStreak(completedDates = [], now = new Date()) {
  const dates = new Set(ensureArray(completedDates));
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  // Yesterday's streak remains valid until today's opportunity has passed.
  if (!dates.has(localDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (dates.has(localDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
