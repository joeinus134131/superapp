// localStorage wrapper with JSON serialize/deserialize
// Supports per-user namespacing for data isolation

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
  return localStorage.getItem('superapp_current_user');
}

function buildKey(key) {
  const userId = getCurrentUserId();
  if (userId) {
    return `${userId}_${key}`;
  }
  return key;
}

export function getData(key) {
  if (typeof window === 'undefined') return null;
  try {
    const namespacedKey = buildKey(key);
    const data = localStorage.getItem(namespacedKey);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setData(key, value) {
  if (typeof window === 'undefined') return;
  try {
    const namespacedKey = buildKey(key);
    localStorage.setItem(namespacedKey, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

export function removeData(key) {
  if (typeof window === 'undefined') return;
  const namespacedKey = buildKey(key);
  localStorage.removeItem(namespacedKey);
}

export { STORAGE_KEYS };
