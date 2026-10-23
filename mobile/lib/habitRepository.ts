import { habitStreak } from '@superapp/shared/insights';
import { getData, setData, STORAGE_KEYS } from './storage';
import { getToday } from './helpers';
import { addXP } from './gamification';
import type { Habit } from '../hooks/useHabits';
let queue = Promise.resolve();
function serial<T>(work: () => Promise<T>): Promise<T> {
  const job = queue.then(work); queue = job.then(() => {}, () => {}); return job;
}
async function readHabits() {
  const data = await getData(STORAGE_KEYS.HABITS, true);
  if (data !== null && !Array.isArray(data)) throw new Error('Invalid habit data');
  return (data || []) as Habit[];
}
export function updateHabits(change: (habits: Habit[]) => Habit[]) {
  return serial(async () => {
    const owner = await getData(STORAGE_KEYS.CURRENT_USER, true);
    const next = change(await readHabits());
    if (await getData(STORAGE_KEYS.CURRENT_USER, true) !== owner) throw new Error('Account changed');
    await setData(STORAGE_KEYS.HABITS, next, true);
    return next;
  });
}
async function settleReward(habits: Habit[], id: string, today: string, owner?: string) {
  const habit = habits.find(item => item.id === id);
  if (!habit?.completedDates.includes(today) || !habit.pendingRewardDates?.includes(today)) return { habits, rewardPending: false, reward: null };
  try {
    // The reward ledger makes retry safe even if the second habit write fails.
    const reward = await addXP('HABIT_DONE', 1, `habit:${id}:${today}`, owner);
    const next = habits.map(item => item.id !== id ? item : { ...item,
      rewardedDates: [...new Set([...(item.rewardedDates || []), today])],
      pendingRewardDates: (item.pendingRewardDates || []).filter(date => date !== today),
    });
    if (await getData(STORAGE_KEYS.CURRENT_USER, true) !== owner) throw new Error('Account changed');
    await setData(STORAGE_KEYS.HABITS, next, true);
    return { habits: next, rewardPending: false, reward };
  } catch { return { habits, rewardPending: true, reward: null }; }
}
export function toggleHabitPersisted(id: string, now = new Date()) {
  return serial(async () => {
    const owner = await getData(STORAGE_KEYS.CURRENT_USER, true);
    const current = await readHabits(); const today = getToday(now);
    if (!current.some(item => item.id === id)) throw new Error('Habit not found');
    const next = current.map(item => {
      if (item.id !== id) return item;
      const dates = Array.isArray(item.completedDates) ? item.completedDates : [];
      const wasDone = dates.includes(today);
      const completedDates = wasDone ? dates.filter(date => date !== today) : [...dates, today];
      // Legacy completed check-ins are treated as already rewarded, not paid twice.
      const rewardedDates = [...new Set([...(item.rewardedDates || []), ...(wasDone && !item.pendingRewardDates?.includes(today) ? [today] : [])])];
      const pending = new Set(item.pendingRewardDates || []);
      if (!wasDone && !rewardedDates.includes(today)) pending.add(today);
      const streak = habitStreak(completedDates, now);
      return { ...item, completedDates, streak, bestStreak: Math.max(item.bestStreak || 0, streak), rewardedDates, pendingRewardDates: [...pending] };
    });
    if (await getData(STORAGE_KEYS.CURRENT_USER, true) !== owner) throw new Error('Account changed');
    // No UI state or reward is changed until persistence succeeds.
    await setData(STORAGE_KEYS.HABITS, next, true);
    return settleReward(next, id, today, owner);
  });
}
export function retryHabitReward(id: string, now = new Date()) {
  return serial(async () => { const owner = await getData(STORAGE_KEYS.CURRENT_USER, true); return settleReward(await readHabits(), id, getToday(now), owner); });
}
