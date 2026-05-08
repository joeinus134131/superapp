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
    if (key.startsWith('superapp_')) {
      setTimeout(() => {
        import('./syncService').then(m => m.SyncService.runSync());
      }, 2000);
    }
  },
  removeItem: async (key: string) => {
    await AsyncStorage.removeItem(key);
  }
};

export function initMobileStorage() {
  setStorageAdapter(MobileStorageAdapter);
}
