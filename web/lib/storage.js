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
  SETTINGS: 'superapp_settings',
};

function getCurrentUserId() {
  if (typeof window === 'undefined') return null;
  // Auth data is JSON encoded by the shared storage adapter. Older builds also
  // wrote a plain ID, so accept both formats.
  const stored = localStorage.getItem('superapp_current_user');
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    return typeof parsed === 'string' ? parsed : null;
  } catch {
    return stored;
  }
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

function buildLegacyQuotedKey(key) {
  const userId = getCurrentUserId();
  return userId ? `${JSON.stringify(userId)}_${key}` : null;
}

async function readLegacyQuotedData(key) {
  const legacyKey = buildLegacyQuotedKey(key);
  if (!legacyKey) return null;
  let data = await localforage.getItem(legacyKey);
  if (data === null) {
    const raw = localStorage.getItem(legacyKey);
    if (raw !== null) {
      try { data = JSON.parse(raw); } catch { data = raw; }
    }
  }
  if (data !== null) {
    const normalizedKey = buildKey(key);
    await localforage.setItem(normalizedKey, data);
    localStorage.setItem(normalizedKey, JSON.stringify(data));
  }
  return data;
}

// Now returns a Promise
export async function getData(key) {
  if (typeof window === 'undefined') return null;
  const namespacedKey = buildKey(key);
  try {
    let data = await localforage.getItem(namespacedKey);
    if (data !== null) {
      if (typeof data === 'string') {
        const trimmed = data.trim();
        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
          try { data = JSON.parse(trimmed); } catch {}
        }
      }
      return data;
    }
    const lsVal = localStorage.getItem(namespacedKey);
    if (lsVal === 'null') return null;
    if (lsVal !== null) {
      try {
        let parsed = JSON.parse(lsVal);
        if (typeof parsed === 'string') {
          const trimmed = parsed.trim();
          if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
            try { parsed = JSON.parse(trimmed); } catch {}
          }
        }
        await localforage.setItem(namespacedKey, parsed);
        return parsed;
      } catch {
        return lsVal;
      }
    }
    
    // Fallback migration check
    const migrated = await migrateFromLocalStorage(namespacedKey);
    if (migrated !== null) return migrated;
    return await readLegacyQuotedData(key);
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
   let data = localStorage.getItem(namespacedKey);
   if (data === null) {
     const legacyKey = buildLegacyQuotedKey(key);
     if (legacyKey) data = localStorage.getItem(legacyKey);
   }
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
    import('./databaseSync').then(syncModule => {
       syncModule.scheduleDatabaseSync();
    }).catch(e => console.error("Auto Sync Module Load Error", e));

  } catch (e) {
    console.error('Storage error:', e);
  }
}

export async function removeData(key) {
  if (typeof window === 'undefined') return;
  const namespacedKey = buildKey(key);
  await localforage.removeItem(namespacedKey);
  localStorage.setItem(namespacedKey, 'null');

  // Trigger Auto Sync seamlessly on mutate
  import('./databaseSync').then(syncModule => {
     syncModule.scheduleDatabaseSync();
  }).catch(e => console.error("Auto Sync Module Load Error", e));
}

export { STORAGE_KEYS };

// Restore both stores before reporting success; preserve prior values on failure.
export async function persistRestoredEntries(entries) {
  const previous = await Promise.all(entries.map(async ([key]) => [key, await localforage.getItem(key), localStorage.getItem(key)]));
  try {
    for (const [key, raw] of entries) {
      let value;
      try {
        value = JSON.parse(raw);
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
            try { value = JSON.parse(trimmed); } catch {}
          }
        }
      } catch {
        value = raw;
      }
      await localforage.setItem(key, value);
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
  } catch (error) {
    for (const [key, cached, raw] of previous) {
      if (cached === null) await localforage.removeItem(key);
      else await localforage.setItem(key, cached);
      if (raw === null) localStorage.removeItem(key);
      else localStorage.setItem(key, raw);
    }
    throw error;
  }
}
