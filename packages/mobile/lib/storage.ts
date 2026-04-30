// Mobile Storage Adapter
// Uses AsyncStorage with same interface as web's localforage-based storage
import AsyncStorage from '@react-native-async-storage/async-storage';

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
};

export async function getData(key: string): Promise<any> {
  try {
    const json = await AsyncStorage.getItem(key);
    return json ? JSON.parse(json) : null;
  } catch (e) {
    console.error('Storage getData error:', e);
    return null;
  }
}

export async function setData(key: string, value: any): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage setData error:', e);
  }
}

export async function removeData(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.error('Storage removeData error:', e);
  }
}

export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.clear();
  } catch (e) {
    console.error('Storage clearAll error:', e);
  }
}
