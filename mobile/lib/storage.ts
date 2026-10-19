import { scheduleDatabaseSync } from './databaseSync';
// Mobile Storage Adapter
// Uses AsyncStorage with same interface as web's localforage-based storage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getValidAuthToken } from './authToken';

export const STORAGE_KEYS = {
  TASKS: 'superapp_tasks',
  HABITS: 'superapp_habits',
  TRANSACTIONS: 'superapp_transactions',
  JOURNAL: 'superapp_journal',
  GOALS: 'superapp_goals',
  POMODORO: 'superapp_pomodoro',
  HEALTH: 'superapp_health',
  READING: 'superapp_reading',
  EVENTS: 'superapp_events',
  REMINDERS: 'superapp_reminders',
  NOTIFICATION_HISTORY: 'superapp_notification_history',
  GAMIFICATION: 'superapp_gamification',
  DAILY_LOGIN: 'superapp_daily_login',
  ACHIEVEMENTS: 'superapp_achievements',
  USER_PROFILE: 'superapp_user_profile',
  CUSTOM_CATEGORIES: 'superapp_custom_categories',
  SETTINGS: 'superapp_settings',
  DAILY_QUEST: 'superapp_daily_quest',
  SESSION_TOKEN: 'superapp_session_token',
  CURRENT_USER: 'superapp_current_user',
};

const GLOBAL_KEYS = new Set([
  STORAGE_KEYS.SESSION_TOKEN,
  STORAGE_KEYS.CURRENT_USER,
]);
const LEGACY_OWNER_KEY = 'superapp_legacy_data_owner';

async function getCurrentUserId(): Promise<string | null> {
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    return typeof parsed === 'string' ? parsed : null;
  } catch {
    return stored;
  }
}

async function buildKey(key: string): Promise<string> {
  if (GLOBAL_KEYS.has(key)) return key;
  const userId = await getCurrentUserId();
  return userId ? `${userId}_${key}` : key;
}

export async function getData(key: string): Promise<any> {
  if (key === STORAGE_KEYS.SESSION_TOKEN) {
    return await getValidAuthToken();
  }
  try {
    const namespacedKey = await buildKey(key);
    let data = await AsyncStorage.getItem(namespacedKey);
    // One-time compatibility path for data created before account isolation.
    if (!data && namespacedKey !== key) {
      const currentUserId = await getCurrentUserId();
      let legacyOwner = await AsyncStorage.getItem(LEGACY_OWNER_KEY);
      const legacyData = await AsyncStorage.getItem(key);
      if (legacyData && currentUserId && (!legacyOwner || legacyOwner === currentUserId)) {
        if (!legacyOwner) {
          legacyOwner = currentUserId;
          await AsyncStorage.setItem(LEGACY_OWNER_KEY, currentUserId);
        }
        data = legacyData;
        await AsyncStorage.setItem(namespacedKey, legacyData);
      }
    }
    if (!data) return null;
    
    // Defensive JSON parsing
    try {
      return JSON.parse(data);
    } catch {
      // If it's not JSON (like a plain ID or encrypted string), return it as is
      return data;
    }
  } catch (e) {
    console.error('Storage getData error:', e);
    return null;
  }
}

export async function setData(key: string, value: any): Promise<void> {
  try {
    await AsyncStorage.setItem(await buildKey(key), JSON.stringify(value));
    if (!GLOBAL_KEYS.has(key)) scheduleDatabaseSync();
  } catch (e) {
    console.error('Storage setData error:', e);
  }
}

export async function removeData(key: string): Promise<void> {
  try {
    const fullKey = await buildKey(key);
    if (GLOBAL_KEYS.has(key)) await AsyncStorage.removeItem(fullKey);
    else {
      await AsyncStorage.setItem(fullKey, 'null');
      scheduleDatabaseSync();
    }
  } catch (e) {
    console.error('Storage removeData error:', e);
  }
}

export async function clearAll(): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;
    const keys = await AsyncStorage.getAllKeys();
    const legacyOwner = await AsyncStorage.getItem(LEGACY_OWNER_KEY);
    const moduleKeys = new Set(Object.values(STORAGE_KEYS).filter(key => !GLOBAL_KEYS.has(key)));
    const ownedKeys = keys.filter(key => key.startsWith(`${userId}_`) || (legacyOwner === userId && moduleKeys.has(key)));
    if (ownedKeys.length) await AsyncStorage.multiRemove(ownedKeys);
    if (legacyOwner === userId) await AsyncStorage.removeItem(LEGACY_OWNER_KEY);
  } catch (e) {
    console.error('Storage clearAll error:', e);
  }
}
