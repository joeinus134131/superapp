import localforage from 'localforage';
import { setCloudSyncDriver } from '@superapp/shared/cloud-sync';
import { syncDatabase, scheduleDatabaseSync } from './databaseSync';
import { setStorageAdapter } from '@superapp/shared/storage';

localforage.config({
  name: 'SuperAppDB',
  storeName: 'app_data'
});

const WebStorageAdapter = {
  getItem: async (key) => {
    // Check localStorage first for sync compatibility if needed, 
    // but primary is localforage
    let val = await localforage.getItem(key);
    if (val === null) {
      val = localStorage.getItem(key);
    }
    return val;
  },
  setItem: async (key, value) => {
    await localforage.setItem(key, value);
    // Sync to localStorage for legacy components
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    if (key.includes('_superapp_')) scheduleDatabaseSync();
  },
  removeItem: async (key) => {
    await localforage.removeItem(key);
    localStorage.removeItem(key);
    if (key.includes('_superapp_')) scheduleDatabaseSync();
  }
};

export function initWebStorage() {
  if (typeof window !== 'undefined') {
    setStorageAdapter(WebStorageAdapter);
    setCloudSyncDriver(syncDatabase);
  }
}
