// 🎮 Gamification Engine — XP, Levels, Achievements
import { getData, setData, STORAGE_KEYS } from './storage';

const GAMIFICATION_KEY = 'superapp_gamification';

// ===== LEVEL SYSTEM =====
export const LEVELS = [
  { level: 1, title: 'Noob 🐣', minXP: 0, color: '#6b7280' },
  { level: 2, title: 'Beginner 🌱', minXP: 100, color: '#10b981' },
  { level: 3, title: 'Learner 📖', minXP: 300, color: '#3b82f6' },
  { level: 4, title: 'Hustler 💪', minXP: 600, color: '#8b5cf6' },
  { level: 5, title: 'Warrior ⚔️', minXP: 1000, color: '#f59e0b' },
  { level: 6, title: 'Champion 🏆', minXP: 1500, color: '#ef4444' },
  { level: 7, title: 'Master 🧠', minXP: 2200, color: '#ec4899' },
  { level: 8, title: 'Grandmaster 👑', minXP: 3000, color: '#f97316' },
  { level: 9, title: 'Legend 🐉', minXP: 4000, color: '#14b8a6' },
  { level: 10, title: 'GIGACHAD 💎', minXP: 5500, color: '#a855f7' },
];

// ===== XP REWARDS =====
export const XP_ACTIONS = {
  TASK_COMPLETE: { xp: 15, label: 'Task selesai' },
  HABIT_DONE: { xp: 10, label: 'Habit selesai' },
  STREAK_7: { xp: 50, label: '7 Day Streak!' },
  STREAK_30: { xp: 200, label: '30 Day Streak!' },
  JOURNAL_WRITE: { xp: 10, label: 'Tulis jurnal' },
  POMODORO_DONE: { xp: 20, label: 'Sesi fokus selesai' },
  WORKOUT_LOG: { xp: 15, label: 'Workout logged' },
  BOOK_FINISH: { xp: 30, label: 'Buku selesai' },
  GOAL_COMPLETE: { xp: 100, label: 'Goal tercapai!' },
  DAILY_LOGIN: { xp: 5, label: 'Login harian' },
  WATER_FULL: { xp: 10, label: '8 gelas air' },
  TRANSACTION_LOG: { xp: 5, label: 'Catat transaksi' },
};

// ===== ACHIEVEMENTS =====
export const ACHIEVEMENTS = [
  // Starter
  { id: 'first_task', title: 'First Blood ⚔️', desc: 'Selesaikan task pertama', icon: '⚔️', condition: (d) => d.tasksCompleted >= 1 },
  { id: 'first_habit', title: 'Habit Starter 🌱', desc: 'Buat habit pertama', icon: '🌱', condition: (d) => d.totalHabits >= 1 },
  { id: 'first_journal', title: 'Dear Diary 📝', desc: 'Tulis jurnal pertama', icon: '📝', condition: (d) => d.journalEntries >= 1 },

  // Streaks
  { id: 'streak_3', title: 'Hot Start 🔥', desc: '3 hari streak', icon: '🔥', condition: (d) => d.maxStreak >= 3 },
  { id: 'streak_7', title: 'Week Warrior 💪', desc: '7 hari streak', icon: '💪', condition: (d) => d.maxStreak >= 7 },
  { id: 'streak_14', title: 'Unstoppable 🚀', desc: '14 hari streak', icon: '🚀', condition: (d) => d.maxStreak >= 14 },
  { id: 'streak_30', title: 'Iron Will 🏔️', desc: '30 hari streak', icon: '🏔️', condition: (d) => d.maxStreak >= 30 },

  // Tasks
  { id: 'tasks_10', title: 'Task Slayer ⚡', desc: 'Selesaikan 10 tasks', icon: '⚡', condition: (d) => d.tasksCompleted >= 10 },
  { id: 'tasks_50', title: 'Machine Mode 🤖', desc: 'Selesaikan 50 tasks', icon: '🤖', condition: (d) => d.tasksCompleted >= 50 },
  { id: 'tasks_100', title: 'Centurion 🛡️', desc: 'Selesaikan 100 tasks', icon: '🛡️', condition: (d) => d.tasksCompleted >= 100 },

  // Focus
  { id: 'focus_5', title: 'Deep Focus 🎯', desc: '5 sesi pomodoro', icon: '🎯', condition: (d) => d.pomodoroSessions >= 5 },
  { id: 'focus_25', title: 'Monk Mode 🧘', desc: '25 sesi pomodoro', icon: '🧘', condition: (d) => d.pomodoroSessions >= 25 },

  // Finance
  { id: 'saver', title: 'Money Saver 💎', desc: 'Saldo positif > 1 juta', icon: '💎', condition: (d) => d.balance >= 1000000 },

  // Books
  { id: 'book_1', title: 'Bookworm 📚', desc: 'Selesaikan 1 buku', icon: '📚', condition: (d) => d.booksCompleted >= 1 },
  { id: 'book_5', title: 'Scholar 🎓', desc: 'Selesaikan 5 buku', icon: '🎓', condition: (d) => d.booksCompleted >= 5 },

  // Health
  { id: 'workout_10', title: 'Gym Rat 🏋️', desc: '10 workout sessions', icon: '🏋️', condition: (d) => d.totalWorkouts >= 10 },

  // XP
  { id: 'xp_1000', title: 'Grinder 💪', desc: 'Raih 1000 XP', icon: '💪', condition: (d) => d.totalXP >= 1000 },
  { id: 'xp_5000', title: 'LEGENDARY 🐉', desc: 'Raih 5000 XP', icon: '🐉', condition: (d) => d.totalXP >= 5000 },

  // Night Owl / Early Bird
  { id: 'night_owl', title: 'Night Owl 🦉', desc: 'Aktif setelah jam 11 malam', icon: '🦉', condition: (d) => d.lateNightActivity },
  { id: 'early_bird', title: 'Early Bird 🐦', desc: 'Aktif sebelum jam 6 pagi', icon: '🐦', condition: (d) => d.earlyMorningActivity },
];

// ===== CORE FUNCTIONS =====
function getGamificationData() {
  if (typeof window === 'undefined') return getDefaultData();
  const userId = localStorage.getItem('superapp_current_user');
  const key = userId ? `${userId}_${GAMIFICATION_KEY}` : GAMIFICATION_KEY;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : getDefaultData();
  } catch { return getDefaultData(); }
}

function saveGamificationData(data) {
  if (typeof window === 'undefined') return;
  const userId = localStorage.getItem('superapp_current_user');
  const key = userId ? `${userId}_${GAMIFICATION_KEY}` : GAMIFICATION_KEY;
  localStorage.setItem(key, JSON.stringify(data));
}

function getDefaultData() {
  return {
    totalXP: 0,
    currentLevel: 1,
    xpHistory: [],
    unlockedAchievements: [],
    lastLoginDate: null,
    lastLevelUp: null,
  };
}

export function getXP() {
  return getGamificationData();
}

export function addXP(action, multiplier = 1) {
  const data = getGamificationData();
  const reward = XP_ACTIONS[action];
  if (!reward) return { data, levelUp: false };

  const xpGained = Math.round(reward.xp * multiplier);
  data.totalXP += xpGained;

  // Add to history
  data.xpHistory.push({
    action,
    xp: xpGained,
    label: reward.label,
    date: new Date().toISOString(),
  });
  if (data.xpHistory.length > 100) data.xpHistory = data.xpHistory.slice(-100);

  // Check level up
  const oldLevel = data.currentLevel;
  const newLevel = getCurrentLevel(data.totalXP);
  data.currentLevel = newLevel.level;
  const levelUp = newLevel.level > oldLevel;
  if (levelUp) {
    data.lastLevelUp = new Date().toISOString();
  }

  saveGamificationData(data);
  return { data, levelUp, xpGained, newLevel };
}

export function checkDailyLogin() {
  const data = getGamificationData();
  const today = new Date().toISOString().split('T')[0];
  if (data.lastLoginDate !== today) {
    data.lastLoginDate = today;
    saveGamificationData(data);
    return addXP('DAILY_LOGIN');
  }
  return { data, levelUp: false };
}

export function getCurrentLevel(totalXP) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (totalXP >= lvl.minXP) current = lvl;
    else break;
  }
  return current;
}

export function getNextLevel(totalXP) {
  for (const lvl of LEVELS) {
    if (totalXP < lvl.minXP) return lvl;
  }
  return null; // MAX LEVEL
}

export function getXPProgress(totalXP) {
  const current = getCurrentLevel(totalXP);
  const next = getNextLevel(totalXP);
  if (!next) return { percent: 100, current: totalXP - current.minXP, needed: 0 };
  const range = next.minXP - current.minXP;
  const progress = totalXP - current.minXP;
  return { percent: Math.round((progress / range) * 100), current: progress, needed: range };
}

// ===== ACHIEVEMENT CHECKER =====
export function checkAchievements() {
  const data = getGamificationData();
  const stats = gatherStats();
  const hour = new Date().getHours();
  stats.lateNightActivity = hour >= 23 || hour < 3;
  stats.earlyMorningActivity = hour >= 4 && hour < 6;
  stats.totalXP = data.totalXP;

  const newlyUnlocked = [];
  ACHIEVEMENTS.forEach(ach => {
    if (data.unlockedAchievements.includes(ach.id)) return;
    if (ach.condition(stats)) {
      data.unlockedAchievements.push(ach.id);
      newlyUnlocked.push(ach);
    }
  });

  if (newlyUnlocked.length > 0) {
    saveGamificationData(data);
  }

  return { newlyUnlocked, total: data.unlockedAchievements.length, all: ACHIEVEMENTS.length };
}

function gatherStats() {
  const tasks = getData(STORAGE_KEYS.TASKS) || [];
  const habits = getData(STORAGE_KEYS.HABITS) || [];
  const journal = getData(STORAGE_KEYS.JOURNAL) || [];
  const pomodoro = getData(STORAGE_KEYS.POMODORO) || { sessions: [] };
  const transactions = getData(STORAGE_KEYS.TRANSACTIONS) || [];
  const books = getData(STORAGE_KEYS.READING) || [];
  const health = getData(STORAGE_KEYS.HEALTH) || { workouts: [] };

  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return {
    tasksCompleted: tasks.filter(t => t.status === 'done').length,
    totalHabits: habits.length,
    maxStreak: habits.reduce((max, h) => Math.max(max, h.streak || 0), 0),
    journalEntries: journal.length,
    pomodoroSessions: pomodoro.sessions ? pomodoro.sessions.length : 0,
    balance: income - expense,
    booksCompleted: books.filter(b => b.status === 'completed').length,
    totalWorkouts: health.workouts ? health.workouts.length : 0,
  };
}
