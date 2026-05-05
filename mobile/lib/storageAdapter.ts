import AsyncStorage from '@react-native-async-storage/async-storage';
import { setStorageAdapter } from '@superapp/shared/storage';

const MobileStorageAdapter = {
  getItem: async (key: string) => {
    return await AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: any) => {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    await AsyncStorage.setItem(key, stringValue);
  },
  removeItem: async (key: string) => {
    await AsyncStorage.removeItem(key);
  }
};

export function initMobileStorage() {
  setStorageAdapter(MobileStorageAdapter);
}
