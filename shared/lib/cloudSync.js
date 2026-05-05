/**
 * SUPERAPP - CLOUD SYNC SERVICE
 * Synchronizes local data with the Golang PostgreSQL backend.
 */
import { getData, STORAGE_KEYS, getRawData } from './storage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

/**
 * Pushes all local modules to the cloud.
 */
export async function pushToCloud() {
  const userId = await getRawData(STORAGE_KEYS.AUTH_USER);
  if (!userId) return;

  // List of modules to sync
  const modules = [
    { type: 'TASK', key: STORAGE_KEYS.TASKS },
    { type: 'HABIT', key: STORAGE_KEYS.HABITS },
    { type: 'FINANCE', key: STORAGE_KEYS.TRANSACTIONS },
    { type: 'JOURNAL', key: STORAGE_KEYS.JOURNAL },
    { type: 'HEALTH', key: STORAGE_KEYS.HEALTH },
    { type: 'GOALS', key: STORAGE_KEYS.GOALS },
  ];

  try {
    for (const mod of modules) {
      const data = await getData(mod.key);
      if (data) {
        await fetch(`${API_URL}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            module_type: mod.type,
            data_payload: data
          })
        });
      }
    }
    console.log('[Sync] All modules pushed to cloud successfully');
  } catch (e) {
    console.error('[Sync] Push failed:', e);
  }
}

/**
 * Pulls all data from the cloud and updates local storage.
 */
export async function pullFromCloud() {
  const userId = await getRawData(STORAGE_KEYS.AUTH_USER);
  if (!userId) return;

  try {
    const response = await fetch(`${API_URL}/sync?user_id=${userId}`);
    const cloudData = await response.json();

    // Map cloud data back to our local storage keys
    const keyMap = {
      'TASK': STORAGE_KEYS.TASKS,
      'HABIT': STORAGE_KEYS.HABITS,
      'FINANCE': STORAGE_KEYS.TRANSACTIONS,
      'JOURNAL': STORAGE_KEYS.JOURNAL,
      'HEALTH': STORAGE_KEYS.HEALTH,
      'GOALS': STORAGE_KEYS.GOALS,
    };

    for (const [modType, data] of Object.entries(cloudData)) {
      const localKey = keyMap[modType];
      if (localKey) {
        // Here we would use setData, but we need to be careful with building keys
        // For simplicity, we'll assume the storage layer handles it
        import('./storage').then(s => s.setData(localKey, data));
      }
    }
    
    return true;
  } catch (e) {
    console.error('[Sync] Pull failed:', e);
    return false;
  }
}

let syncTimeout = null;
export async function triggerAutoSync() {
  if (syncTimeout) clearTimeout(syncTimeout);
  
  syncTimeout = setTimeout(async () => {
    console.log('[Sync] Auto-Syncing...');
    await pushToCloud();
  }, 3000); // Wait 3 seconds
}
