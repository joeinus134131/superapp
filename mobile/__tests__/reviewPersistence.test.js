jest.mock('@react-native-async-storage/async-storage', () => { const values = new Map(); return { __esModule: true, default: { getItem: jest.fn(async key => values.get(key) ?? null), setItem: jest.fn(async (key, value) => { values.set(key, value); }), clear: async () => values.clear(), getAllKeys: async () => [...values.keys()] } }; });
jest.mock('expo-secure-store', () => ({ getItemAsync: async () => 'review-master-key', setItemAsync: jest.fn() }));
jest.mock('expo-crypto', () => ({ getRandomBytes: size => new Uint8Array(require('crypto').randomBytes(size)), getRandomBytesAsync: async size => new Uint8Array(require('crypto').randomBytes(size)) }));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(async () => {}), notificationAsync: jest.fn(async () => {}), ImpactFeedbackStyle: { Medium: 'medium' }, NotificationFeedbackType: { Success: 'success' } }));
jest.mock('../lib/databaseSync', () => ({ scheduleDatabaseSync: jest.fn() }));
jest.mock('../lib/syncService', () => ({ SyncService: { runSync: jest.fn(async () => {}) } }));
jest.mock('../lib/authToken', () => ({ getValidAuthToken: jest.fn() }));
jest.mock('react-native', () => { const emitter = new (require('events').EventEmitter)(); return { DeviceEventEmitter: { emit: (...args) => emitter.emit(...args), addListener: (name, callback) => { emitter.on(name, callback); return { remove: () => emitter.off(name, callback) }; } } }; });
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getData, setData, STORAGE_KEYS } from '../lib/storage';
import { EncryptedStorage } from '../lib/secureStorage';
import { readJournalEntries } from '../lib/journalRepository';
import { readDashboardSources } from '../lib/dashboardSources';
import { toggleHabitPersisted, retryHabitReward } from '../lib/habitRepository';
import { readNotificationHistory, recordNotification, markNotificationsRead, notificationRoute } from '../lib/notificationHistory';
import { useJournal } from '../hooks/useJournal';
import { useHabits } from '../hooks/useHabits';
const { create, act } = require('./helpers/renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
const now = new Date(2026, 9, 22, 12);
let originalSet, originalGet, rendered;
beforeEach(async () => {
  await AsyncStorage.clear(); jest.clearAllMocks(); await AsyncStorage.setItem('superapp_current_user', 'review-user');
  originalSet = AsyncStorage.setItem.getMockImplementation(); originalGet = AsyncStorage.getItem.getMockImplementation();
});
afterEach(async () => { AsyncStorage.setItem.mockImplementation(originalSet); AsyncStorage.getItem.mockImplementation(originalGet); if (rendered) { await act(async () => rendered.unmount()); rendered = null; } jest.restoreAllMocks(); });
const seedHabit = async () => setData(STORAGE_KEYS.HABITS, [{ id: 'h1', name: 'Read', icon: 'star', completedDates: ['2026-10-01'], streak: 1, bestStreak: 1, createdAt: '2026-10-01' }], true);
test('F01: encrypted native journal is read by the shared search reader and dashboard loader', async () => {
  const entries = [{ id: 'j1', title: 'Known phrase', content: 'Search body', mood: 'good' }];
  await EncryptedStorage.setItem(STORAGE_KEYS.JOURNAL, entries, { skipSync: true });
  expect(await readJournalEntries()).toEqual(entries);
  const result = await readDashboardSources(); expect(result.values.journal).toEqual(entries); expect(result.errors).toEqual([]);
  expect(await AsyncStorage.getItem('review-user_superapp_journal')).not.toContain('Search body');
});
test('one failed dashboard source does not erase other successful sources', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  AsyncStorage.getItem.mockImplementation(async key => { if (key.endsWith('_superapp_goals')) throw new Error('disk'); return originalGet(key); });
  const result = await readDashboardSources(); expect(result.errors).toEqual(['goals']); expect(result.values).toHaveProperty('journal'); expect(result.values).not.toHaveProperty('goals');
});
test('F03/F04: habit check-in recomputes separated dates to streak one and awards ten XP', async () => {
  await seedHabit(); const result = await toggleHabitPersisted('h1', now);
  expect(result.habits[0].streak).toBe(1); expect(result.reward.xpGained).toBe(10);
  expect((await getData(STORAGE_KEYS.GAMIFICATION)).totalXP).toBe(10);
});
test('habit undo and redo on the same day do not farm XP', async () => {
  await seedHabit(); await toggleHabitPersisted('h1', now); await toggleHabitPersisted('h1', now); await toggleHabitPersisted('h1', now);
  expect((await getData(STORAGE_KEYS.GAMIFICATION)).totalXP).toBe(10);
  expect((await getData(STORAGE_KEYS.HABITS))[0].completedDates).toContain('2026-10-22');
});
test('F05: failed habit persistence awards no XP and leaves saved data unchanged', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {}); await seedHabit();
  AsyncStorage.setItem.mockImplementation(async (key, value) => { if (key.endsWith('_superapp_habits')) throw new Error('quota'); return originalSet(key, value); });
  await expect(toggleHabitPersisted('h1', now)).rejects.toThrow('quota');
  expect((await getData(STORAGE_KEYS.HABITS))[0].completedDates).toEqual(['2026-10-01']); expect(await getData(STORAGE_KEYS.GAMIFICATION)).toBeNull();
});
test('XP failure after a saved check-in is retryable once, without duplicated XP', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {}); await seedHabit();
  AsyncStorage.setItem.mockImplementation(async (key, value) => { if (key.endsWith('_superapp_gamification')) throw new Error('quota'); return originalSet(key, value); });
  const result = await toggleHabitPersisted('h1', now); expect(result.rewardPending).toBe(true); expect(result.habits[0].completedDates).toContain('2026-10-22');
  AsyncStorage.setItem.mockImplementation(originalSet);
  await retryHabitReward('h1', now); await retryHabitReward('h1', now);
  expect((await getData(STORAGE_KEYS.GAMIFICATION)).totalXP).toBe(10); expect((await getData(STORAGE_KEYS.HABITS))[0].pendingRewardDates).toEqual([]);
});
test('failed habit receipt cleanup does not pay twice when retried', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {}); await seedHabit(); let writes = 0;
  AsyncStorage.setItem.mockImplementation(async (key, value) => { if (key.endsWith('_superapp_habits') && ++writes === 2) throw new Error('quota'); return originalSet(key, value); });
  expect((await toggleHabitPersisted('h1', now)).rewardPending).toBe(true);
  AsyncStorage.setItem.mockImplementation(originalSet); await retryHabitReward('h1', now);
  expect((await getData(STORAGE_KEYS.GAMIFICATION)).totalXP).toBe(10);
});
test('native notification history starts empty, deduplicates receipt, and persists read state', async () => {
  expect(await readNotificationHistory()).toEqual([]);
  const notification = { id: 'remote-1', title: 'Actual title', body: 'Actual body', receivedAt: '2026-10-22T05:00:00Z', route: '/(app)/tasks' };
  expect(await recordNotification(notification)).toBe(true); expect(await recordNotification(notification)).toBe(false);
  expect((await readNotificationHistory()).filter(item => !item.readAt)).toHaveLength(1);
  await markNotificationsRead('remote-1'); expect((await readNotificationHistory()).filter(item => !item.readAt)).toHaveLength(0);
  expect(await AsyncStorage.getItem('review-user_whenya_notification_history_v1')).not.toContain('Actual body');
});
test('notifications are scoped to the active account and unsafe routes are ignored', async () => {
  await recordNotification({ id: 'one', title: 'Title', body: 'Body', receivedAt: new Date().toISOString(), route: 'https://example.com' });
  expect((await readNotificationHistory())[0].route).toBeUndefined(); expect(notificationRoute('/(app)/finance')).toBe('/(app)/finance');
  await AsyncStorage.setItem('superapp_current_user', 'another-user'); expect(await readNotificationHistory()).toEqual([]);
});
test('F06: journal hook does not insert an unsaved entry or award reward on disk failure', async () => {
  let api; function Probe() { api = useJournal(); return null; }
  await act(async () => { rendered = create(React.createElement(Probe)); });
  AsyncStorage.setItem.mockImplementation(async (key, value) => { if (key.endsWith('_superapp_journal')) throw new Error('quota'); return originalSet(key, value); });
  await act(async () => { await expect(api.addEntry({ title: 'Keep', content: 'Keep my input', mood: 'good', tags: [] })).rejects.toThrow('quota'); });
  expect(api.entries).toEqual([]); expect(await getData(STORAGE_KEYS.GAMIFICATION)).toBeNull();
});
test('F05: habit hook clears pending on failure and preserves visible prior state', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {}); await seedHabit(); let api; function Probe() { api = useHabits(); return null; }
  await act(async () => { rendered = create(React.createElement(Probe)); });
  AsyncStorage.setItem.mockImplementation(async (key, value) => { if (key.endsWith('_superapp_habits')) throw new Error('quota'); return originalSet(key, value); });
  await act(async () => { await expect(api.toggleHabit('h1')).rejects.toThrow('quota'); });
  expect(api.pendingId).toBeNull(); expect(api.habits[0].completedDates).toEqual(['2026-10-01']);
});

test('an old-account notification arriving after account switching cannot be stored for the new account', async () => {
  await AsyncStorage.setItem('superapp_current_user', 'new-owner');
  await expect(recordNotification({ id: 'old-push', title: 'Old', body: 'Private', receivedAt: new Date().toISOString() }, 'review-user')).rejects.toThrow('Account changed');
  expect(await readNotificationHistory()).toEqual([]);
});
test('concurrent changes to different habits preserve both check-ins and both rewards', async () => {
  await seedHabit(); const habits = await getData(STORAGE_KEYS.HABITS);
  await setData(STORAGE_KEYS.HABITS, [...habits, { ...habits[0], id: 'h2', name: 'Walk' }], true);
  await Promise.all([toggleHabitPersisted('h1', now), toggleHabitPersisted('h2', now)]);
  expect((await getData(STORAGE_KEYS.HABITS)).every(item => item.completedDates.includes('2026-10-22'))).toBe(true);
  expect((await getData(STORAGE_KEYS.GAMIFICATION)).totalXP).toBe(20);
});

test('habit reward retry remains visible after reopening the hook on the same day', async () => {
  const { getToday } = require('../lib/helpers');
  const today = getToday();
  await setData(STORAGE_KEYS.HABITS, [{ id: 'pending', name: 'Walk', completedDates: [today], pendingRewardDates: [today], streak: 1, bestStreak: 1 }], true);
  let api; function Probe() { api = useHabits(); return null; }
  await act(async () => { rendered = create(React.createElement(Probe)); });
  expect(api.rewardError).toBe('pending');
  await act(async () => { await api.retryHabitReward('pending'); });
  expect(api.rewardError).toBeNull();
  expect((await getData(STORAGE_KEYS.GAMIFICATION)).totalXP).toBe(10);
});
