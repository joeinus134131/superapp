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
 * Build a user-namespaced key.
 */
async function buildKey(key) {
  const adapter = await getAdapter();
  if (!adapter) return key;
  
  // We try to get current user ID to namespace the key
  const userId = await adapter.getItem(STORAGE_KEYS.AUTH_USER);
  if (userId && typeof userId === 'string') {
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
    
    // Pemicu otomatis sinkronisasi ke cloud
    import('./cloudSync').then(m => m.triggerAutoSync());
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
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch { return null; }
}

export async function setRawData(key, value) {
  const adapter = await getAdapter();
  if (!adapter) return;
  try {
    await adapter.setItem(key, JSON.stringify(value));
  } catch (e) { console.error(e); }
}
