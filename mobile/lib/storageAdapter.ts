import { setCloudSyncDriver } from '@superapp/shared/cloud-sync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setStorageAdapter } from '@superapp/shared/storage';

const MobileStorageAdapter = {
  getItem: async (key: string) => {
    return await AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: any) => {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await AsyncStorage.setItem(key, stringValue);
    
    // Pemicu sinkronisasi otomatis ke backend Golang
    // Gunakan setTimeout agar tidak menghambat UI
    if (key.startsWith('superapp_') || key.includes('_superapp_')) {
      import('./databaseSync').then(m => m.scheduleDatabaseSync());
    }
  },
  removeItem: async (key: string) => {
    await AsyncStorage.removeItem(key);
    if (key.includes('_superapp_')) import('./databaseSync').then(m => m.scheduleDatabaseSync());
  }
};

export function initMobileStorage() {
  setStorageAdapter(MobileStorageAdapter);
  setCloudSyncDriver(async () => (await import('./databaseSync')).syncDatabase());
}
