import localforage from 'localforage';

// Configure localforage
localforage.config({
  name: 'SuperAppDB',
  version: 1.0,
  storeName: 'app_data'
});

const STORAGE_KEYS = {
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
};

function getCurrentUserId() {
  if (typeof window === 'undefined') return null;
  // still keep current user in localStorage for fast synchronous auth bootstraps
  return localStorage.getItem('superapp_current_user'); 
}

function buildKey(key) {
  const userId = getCurrentUserId();
  if (userId) {
    return `${userId}_${key}`;
  }
  return key;
}

// Initial Migration from localStorage to localForage
async function migrateFromLocalStorage(namespacedKey) {
  if (typeof window === 'undefined') return null;
  const lsData = localStorage.getItem(namespacedKey);
  if (lsData) {
    try {
      const parsed = JSON.parse(lsData);
      await localforage.setItem(namespacedKey, parsed);
      // Optional: remove from localStorage to free up space
      // localStorage.removeItem(namespacedKey);
      return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

// Now returns a Promise
export async function getData(key) {
  if (typeof window === 'undefined') return null;
  const namespacedKey = buildKey(key);
  try {
    const data = await localforage.getItem(namespacedKey);
    if (data !== null) return data;
    
    // Fallback migration check
    return await migrateFromLocalStorage(namespacedKey);
  } catch {
    return null;
  }
}

// Sync version for places that haven't been refactored yet.
// For true async, parts of the app need to be refactored to use async.
// However, since we're refactoring the core storage, we supply a memory cache OR 
// we recommend everything `await getData()`.
// For SuperApp compatibility where many components do `getData()` synchronously:
// We will export our async one as primary, but legacy components might fail.
// So we use localforage but fall back to localStorage read for instant sync reading until refactored.
export function getDataSync(key) {
   if (typeof window === 'undefined') return null;
   const namespacedKey = buildKey(key);
   const data = localStorage.getItem(namespacedKey);
   return data ? JSON.parse(data) : null;
}

export async function setData(key, value) {
  if (typeof window === 'undefined') return;
  const namespacedKey = buildKey(key);
  try {
    await localforage.setItem(namespacedKey, value);
    // Keep localStorage in sync temporarily while other components run synchronous reads
    localStorage.setItem(namespacedKey, JSON.stringify(value));
    
    // Trigger Auto Sync seamlessly on mutate
    import('./cloudSync').then(syncModule => {
       syncModule.triggerAutoSync();
    }).catch(e => console.error("Auto Sync Module Load Error", e));

  } catch (e) {
    console.error('Storage error:', e);
  }
}

export async function removeData(key) {
  if (typeof window === 'undefined') return;
  const namespacedKey = buildKey(key);
  await localforage.removeItem(namespacedKey);
  localStorage.removeItem(namespacedKey);

  // Trigger Auto Sync seamlessly on mutate
  import('./cloudSync').then(syncModule => {
     syncModule.triggerAutoSync();
  }).catch(e => console.error("Auto Sync Module Load Error", e));
}

export { STORAGE_KEYS };
