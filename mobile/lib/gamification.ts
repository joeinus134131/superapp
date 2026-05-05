// Gamification system - port from web's lib/gamification.js
import { getData, setData, STORAGE_KEYS } from './storage';
import { getToday } from './helpers';

interface Level {
  level: number;
  title: string;
  key: string;
  minXP: number;
  color: string;
}

const LEVELS: Level[] = [
  { level: 1, title: 'Newbie', key: 'levels.l1', minXP: 0, color: '#9ca3af' },
  { level: 2, title: 'Starter', key: 'levels.l2', minXP: 100, color: '#10b981' },
  { level: 3, title: 'Learner', key: 'levels.l3', minXP: 300, color: '#3b82f6' },
  { level: 4, title: 'Achiever', key: 'levels.l4', minXP: 600, color: '#8b5cf6' },
  { level: 5, title: 'Warrior', key: 'levels.l5', minXP: 1000, color: '#f59e0b' },
  { level: 6, title: 'Master', key: 'levels.l6', minXP: 1500, color: '#ef4444' },
  { level: 7, title: 'Grandmaster', key: 'levels.l7', minXP: 2200, color: '#ec4899' },
  { level: 8, title: 'Legend', key: 'levels.l8', minXP: 3000, color: '#14b8a6' },
  { level: 9, title: 'Mythic', key: 'levels.l9', minXP: 4000, color: '#f97316' },
  { level: 10, title: 'Champion', key: 'levels.l10', minXP: 5500, color: '#eab308' },
];

const XP_ACTIONS: Record<string, number> = {
  TASK_COMPLETE: 15,
  HABIT_DONE: 10,
  JOURNAL_ENTRY: 20,
  POMODORO_SESSION: 25,
  DAILY_LOGIN: 5,
  STREAK_7: 50,
  STREAK_30: 200,
  GOAL_COMPLETE: 100,
  BOOK_COMPLETE: 75,
  WORKOUT: 15,
};

export function getCurrentLevel(totalXP: number): Level {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (totalXP >= level.minXP) current = level;
    else break;
  }
  return current;
}

export function getNextLevel(totalXP: number): Level | null {
  for (const level of LEVELS) {
    if (totalXP < level.minXP) return level;
  }
  return null;
}

export function getXPProgress(totalXP: number) {
  const current = getCurrentLevel(totalXP);
  const next = getNextLevel(totalXP);
  if (!next) return { current: totalXP - current.minXP, needed: 0, percent: 100 };
  const currentLevelXP = totalXP - current.minXP;
  const neededXP = next.minXP - current.minXP;
  return {
    current: currentLevelXP,
    needed: neededXP,
    percent: Math.round((currentLevelXP / neededXP) * 100),
  };
}

export async function getXP(): Promise<{ totalXP: number }> {
  const data = await getData(STORAGE_KEYS.GAMIFICATION);
  return data || { totalXP: 0 };
}

export async function addXP(action: string): Promise<{
  xpGained: number;
  totalXP: number;
  levelUp: boolean;
  newLevel: Level | null;
}> {
  const xpGained = XP_ACTIONS[action] || 0;
  const data = await getXP();
  const oldLevel = getCurrentLevel(data.totalXP);
  data.totalXP += xpGained;
  const newLevel = getCurrentLevel(data.totalXP);
  await setData(STORAGE_KEYS.GAMIFICATION, data);

  return {
    xpGained,
    totalXP: data.totalXP,
    levelUp: newLevel.level > oldLevel.level,
    newLevel: newLevel.level > oldLevel.level ? newLevel : null,
  };
}

export async function checkDailyLogin(): Promise<{
  alreadyLoggedIn: boolean;
  levelUp: boolean;
  newLevel: Level | null;
}> {
  const today = getToday();
  const lastLogin = await getData(STORAGE_KEYS.DAILY_LOGIN);
  if (lastLogin === today) {
    return { alreadyLoggedIn: true, levelUp: false, newLevel: null };
  }
  await setData(STORAGE_KEYS.DAILY_LOGIN, today);
  const result = await addXP('DAILY_LOGIN');
  return {
    alreadyLoggedIn: false,
    levelUp: result.levelUp,
    newLevel: result.newLevel,
  };
}
