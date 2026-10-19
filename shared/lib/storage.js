/**
 * SUPERAPP - SHARED STORAGE ABSTRACTION
 * This layer abstracts the underlying storage engine (localStorage, localforage, or AsyncStorage)
 * so that shared logic remains platform-agnostic.
 */

let storageAdapter = null;

/**
 * Configure the storage adapter for the current platform.
 * Must be called at the app entry point (Root Layout / App Entry).
 */
export function setStorageAdapter(adapter) {
  storageAdapter = adapter;
}

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
  AUTH_USER: 'superapp_current_user',
  AUTH_USERS_LIST: 'superapp_users',
  SESSION_TOKEN: 'superapp_session_token'
};

async function getAdapter() {
  if (!storageAdapter) {
    // Fallback logic or error
    console.warn('[Storage] No adapter set! Shared logic might fail.');
    return null;
  }
  return storageAdapter;
}

/**
 * Adapters may return either a plain string (AsyncStorage) or a JSON encoded
 * string (the web adapter). Always normalize identity values before using them
 * as part of a storage key.
 */
export function normalizeStorageIdentity(value) {
  if (typeof value !== 'string') return value || null;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'string' ? parsed : null;
  } catch {
    return value || null;
  }
}

/**
 * Build a user-namespaced key.
 */
async function buildKey(key) {
  const adapter = await getAdapter();
  if (!adapter) return key;
  
  // We try to get current user ID to namespace the key
  const userId = normalizeStorageIdentity(await adapter.getItem(STORAGE_KEYS.AUTH_USER));
  if (userId) {
    return `${userId}_${key}`;
  }
  return key;
}

export async function getData(key) {
  const adapter = await getAdapter();
  if (!adapter) return null;
  
  const fullKey = await buildKey(key);
  try {
    const data = await adapter.getItem(fullKey);
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch {
    return null;
  }
}

export async function setData(key, value) {
  const adapter = await getAdapter();
  if (!adapter) return;
  
  const fullKey = await buildKey(key);
  try {
    await adapter.setItem(fullKey, JSON.stringify(value));
  } catch (e) {
    console.error('[Storage] Error setting data:', e);
  }
}

export async function removeData(key) {
  const adapter = await getAdapter();
  if (!adapter) return;
  
  const fullKey = await buildKey(key);
  try {
    await adapter.removeItem(fullKey);
  } catch (e) {
    console.error('[Storage] Error removing data:', e);
  }
}

// Support for direct key access (without namespacing, e.g. for Auth)
export async function getRawData(key) {
  const adapter = await getAdapter();
  if (!adapter) return null;
  try {
    const data = await adapter.getItem(key);
    if (typeof data !== 'string') return data;
    try { return JSON.parse(data); } catch { return data; }
  } catch { return null; }
}

export async function setRawData(key, value) {
  const adapter = await getAdapter();
  if (!adapter) return;
  try {
    if (value === null || value === undefined) {
      await adapter.removeItem(key);
      return;
    }
    await adapter.setItem(key, JSON.stringify(value));
  } catch (e) { console.error(e); }
}
