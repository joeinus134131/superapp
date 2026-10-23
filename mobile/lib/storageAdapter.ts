import { setCloudSyncDriver } from '@superapp/shared/cloud-sync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authSessionStorage } from './authSessionStorage';
import { setStorageAdapter } from '@superapp/shared/storage';

const AUTH_KEYS = new Set(['superapp_session', 'superapp_session_token', 'superapp_cloud_session']);
const MobileStorageAdapter = {
  getItem: async (key: string) => {
    if (AUTH_KEYS.has(key)) return authSessionStorage.getItem(key);
    return await AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: any) => {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    if (AUTH_KEYS.has(key)) { await authSessionStorage.setItem(key, stringValue); return; }
    await AsyncStorage.setItem(key, stringValue);
    
    // Pemicu sinkronisasi otomatis ke backend Golang
    // Gunakan setTimeout agar tidak menghambat UI
    if (key.startsWith('superapp_') || key.includes('_superapp_')) {
      import('./databaseSync').then(m => m.scheduleDatabaseSync());
    }
  },
  removeItem: async (key: string) => {
    if (AUTH_KEYS.has(key)) { await authSessionStorage.removeItem(key); return; }
    await AsyncStorage.removeItem(key);
    if (key.includes('_superapp_')) import('./databaseSync').then(m => m.scheduleDatabaseSync());
  }
};

export function initMobileStorage() {
  setStorageAdapter(MobileStorageAdapter);
  setCloudSyncDriver(async () => (await import('./databaseSync')).syncDatabase({ automatic: true }));
}
