// Mock localStorage for Node.js environment
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value; }),
    removeItem: jest.fn(key => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: jest.fn(i => Object.keys(store)[i]),
  };
})();

// Mock window object
global.window = { localStorage: localStorageMock };
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

import {
  LEVELS,
  XP_ACTIONS,
  ACHIEVEMENTS,
  getXP,
  addXP,
  checkDailyLogin,
  getCurrentLevel,
  getNextLevel,
  getXPProgress,
  checkAchievements,
} from '../lib/gamification';

import { setStorageAdapter } from '../lib/storage';

describe('Gamification', () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Set mock current user so gamification data is keyed properly
    localStorageMock.setItem('superapp_current_user', 'test_user_123');
    // Mock storage adapter for checkAchievements
    setStorageAdapter({
      getItem: async (key) => null,
      setItem: async (key, value) => {},
      removeItem: async (key) => {},
    });
    jest.clearAllMocks();
  });

  describe('LEVELS', () => {
    test('has 10 levels', () => {
      expect(LEVELS).toHaveLength(10);
    });

    test('levels are in ascending XP order', () => {
      for (let i = 1; i < LEVELS.length; i++) {
        expect(LEVELS[i].minXP).toBeGreaterThan(LEVELS[i - 1].minXP);
      }
    });

    test('first level starts at 0 XP', () => {
      expect(LEVELS[0].minXP).toBe(0);
      expect(LEVELS[0].level).toBe(1);
    });

    test('each level has required properties', () => {
      LEVELS.forEach(lvl => {
        expect(lvl).toHaveProperty('level');
        expect(lvl).toHaveProperty('title');
        expect(lvl).toHaveProperty('minXP');
        expect(lvl).toHaveProperty('color');
        expect(lvl).toHaveProperty('narrative');
      });
    });
  });

  describe('XP_ACTIONS', () => {
    test('has all expected action types', () => {
      expect(XP_ACTIONS).toHaveProperty('TASK_COMPLETE');
      expect(XP_ACTIONS).toHaveProperty('HABIT_DONE');
      expect(XP_ACTIONS).toHaveProperty('JOURNAL_WRITE');
      expect(XP_ACTIONS).toHaveProperty('POMODORO_DONE');
      expect(XP_ACTIONS).toHaveProperty('DAILY_LOGIN');
      expect(XP_ACTIONS).toHaveProperty('GOAL_COMPLETE');
    });

    test('each action has xp and label', () => {
      Object.values(XP_ACTIONS).forEach(action => {
        expect(action).toHaveProperty('xp');
        expect(action).toHaveProperty('label');
        expect(typeof action.xp).toBe('number');
        expect(action.xp).toBeGreaterThan(0);
      });
    });
  });

  describe('getCurrentLevel', () => {
    test('returns level 1 for 0 XP', () => {
      const level = getCurrentLevel(0);
      expect(level.level).toBe(1);
    });

    test('returns level 2 for 100 XP', () => {
      const level = getCurrentLevel(100);
      expect(level.level).toBe(2);
    });

    test('returns level 5 for 1000 XP', () => {
      const level = getCurrentLevel(1000);
      expect(level.level).toBe(5);
    });

    test('returns max level for very high XP', () => {
      const level = getCurrentLevel(999999);
      expect(level.level).toBe(10);
    });

    test('returns correct level for boundary values', () => {
      expect(getCurrentLevel(99).level).toBe(1);
      expect(getCurrentLevel(100).level).toBe(2);
      expect(getCurrentLevel(299).level).toBe(2);
      expect(getCurrentLevel(300).level).toBe(3);
    });
  });

  describe('getNextLevel', () => {
    test('returns level 2 when at level 1', () => {
      const next = getNextLevel(0);
      expect(next.level).toBe(2);
    });

    test('returns null at max level', () => {
      const next = getNextLevel(5500);
      expect(next).toBeNull();
    });

    test('returns correct next level', () => {
      const next = getNextLevel(100);
      expect(next.level).toBe(3);
      expect(next.minXP).toBe(300);
    });
  });

  describe('getXPProgress', () => {
    test('returns 0% at start', () => {
      const progress = getXPProgress(0);
      expect(progress.percent).toBe(0);
    });

    test('returns correct progress in middle', () => {
      const progress = getXPProgress(150); // Between level 2 (100) and level 3 (300)
      expect(progress.percent).toBe(25); // 50/200 = 25%
      expect(progress.current).toBe(50);
      expect(progress.needed).toBe(200);
    });

    test('returns 100% with 0 needed at max level', () => {
      const progress = getXPProgress(5500);
      expect(progress.percent).toBe(100);
      expect(progress.needed).toBe(0);
    });
  });

  describe('getXP', () => {
    test('returns default data for fresh user', () => {
      const data = getXP();
      expect(data.totalXP).toBe(0);
      expect(data.currentLevel).toBe(1);
      expect(data.xpHistory).toEqual([]);
      expect(data.unlockedAchievements).toEqual([]);
    });
  });

  describe('addXP', () => {
    test('adds XP for valid action', () => {
      const result = addXP('TASK_COMPLETE');
      expect(result.xpGained).toBe(15);
      expect(result.data.totalXP).toBe(15);
      expect(result.levelUp).toBe(false);
    });

    test('returns error for invalid action', () => {
      const result = addXP('INVALID_ACTION');
      expect(result.levelUp).toBe(false);
      expect(result.data.totalXP).toBe(0);
    });

    test('applies multiplier', () => {
      const result = addXP('TASK_COMPLETE', 2);
      expect(result.xpGained).toBe(30);
      expect(result.data.totalXP).toBe(30);
    });

    test('detects level up', () => {
      let lastResult;
      for (let i = 0; i < 7; i++) {
        lastResult = addXP('TASK_COMPLETE');
      }
      expect(lastResult.data.totalXP).toBe(105);
      expect(lastResult.data.currentLevel).toBe(2);
    });

    test('keeps XP history', () => {
      addXP('TASK_COMPLETE');
      addXP('HABIT_DONE');
      const data = getXP();
      expect(data.xpHistory).toHaveLength(2);
      expect(data.xpHistory[0].action).toBe('TASK_COMPLETE');
      expect(data.xpHistory[1].action).toBe('HABIT_DONE');
    });

    test('caps XP history at 100 entries', () => {
      for (let i = 0; i < 110; i++) {
        addXP('TASK_COMPLETE');
      }
      const data = getXP();
      expect(data.xpHistory.length).toBeLessThanOrEqual(100);
    });
  });

  describe('checkDailyLogin', () => {
    test('grants XP on first login of the day', () => {
      const result = checkDailyLogin();
      expect(result.xpGained).toBe(5);
    });

    test('does not grant XP on second login same day', () => {
      checkDailyLogin(); // first call
      const result = checkDailyLogin(); // second call
      expect(result.xpGained).toBeUndefined();
      expect(result.levelUp).toBe(false);
    });

    test('grants XP on new day', () => {
      checkDailyLogin(); // today — gets XP

      // Simulate new day by modifying stored date directly in localStorage
      const userId = localStorageMock.getItem('superapp_current_user');
      const storeKey = `${userId}_superapp_gamification`;
      const stored = JSON.parse(localStorageMock.getItem(storeKey));
      stored.lastLoginDate = '2000-01-01'; // force old date
      localStorageMock.setItem(storeKey, JSON.stringify(stored));

      const result = checkDailyLogin();
      expect(result).toHaveProperty('xpGained', 5);
    });
  });

  describe('ACHIEVEMENTS', () => {
    test('has at least 15 achievements', () => {
      expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(15);
    });

    test('each achievement has required properties', () => {
      ACHIEVEMENTS.forEach(ach => {
        expect(ach).toHaveProperty('id');
        expect(ach).toHaveProperty('title');
        expect(ach).toHaveProperty('desc');
        expect(ach).toHaveProperty('icon');
        expect(ach).toHaveProperty('condition');
        expect(typeof ach.condition).toBe('function');
      });
    });

    test('achievement conditions work correctly', () => {
      const stats = {
        tasksCompleted: 5,
        totalHabits: 3,
        maxStreak: 10,
        journalEntries: 2,
        pomodoroSessions: 6,
        balance: 2000000,
        booksCompleted: 1,
        totalWorkouts: 15,
        totalXP: 1500,
        lateNightActivity: true,
        earlyMorningActivity: false,
      };

      const firstTask = ACHIEVEMENTS.find(a => a.id === 'first_task');
      expect(firstTask.condition(stats)).toBe(true);

      const tasksSlayer = ACHIEVEMENTS.find(a => a.id === 'tasks_10');
      expect(tasksSlayer.condition(stats)).toBe(false);

      const nightOwl = ACHIEVEMENTS.find(a => a.id === 'night_owl');
      expect(nightOwl.condition(stats)).toBe(true);

      const earlyBird = ACHIEVEMENTS.find(a => a.id === 'early_bird');
      expect(earlyBird.condition(stats)).toBe(false);
    });
  });

  describe('checkAchievements', () => {
    test('returns unlock summary', async () => {
      const result = await checkAchievements();
      expect(result).toHaveProperty('newlyUnlocked');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('all');
      expect(Array.isArray(result.newlyUnlocked)).toBe(true);
    });
  });
});
