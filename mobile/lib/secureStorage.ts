import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';
import * as Crypto from 'expo-crypto';

/**
 * HIJACKING CryptoJS: 
 * Memaksa CryptoJS menggunakan expo-crypto secara langsung.
 * Ini memperbaiki error "Native crypto module could not be used" secara total di Expo Go.
 */
(CryptoJS.lib.WordArray as any).random = function(nBytes: number) {
  const randomBytes = Crypto.getRandomBytes(nBytes);
  // Convert Uint8Array to CryptoJS WordArray format
  const words = [];
  for (let i = 0; i < nBytes; i += 4) {
    words.push(
      (randomBytes[i] << 24) |
      (randomBytes[i + 1] << 16) |
      (randomBytes[i + 2] << 8) |
      (randomBytes[i + 3])
    );
  }
  return (CryptoJS.lib.WordArray as any).create(words, nBytes);
};

const MASTER_KEY_STORAGE_KEY = 'superapp_master_encryption_key';

/**
 * Ensures a master encryption key exists in SecureStore.
 * If not, generates one and saves it.
 */
async function getMasterKey(): Promise<string> {
  try {
    let key = await SecureStore.getItemAsync(MASTER_KEY_STORAGE_KEY);
    if (!key) {
      try {
        // Use Expo's native crypto for better compatibility with Expo Go
        const randomBytes = await Crypto.getRandomBytesAsync(32);
        key = CryptoJS.lib.WordArray.create(randomBytes as any).toString();
      } catch (cryptoErr) {
        console.warn('Native crypto failed, using fallback random generator');
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        key = Array.from({ length: 64 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
      }
      await SecureStore.setItemAsync(MASTER_KEY_STORAGE_KEY, key);
    }
    return key;
  } catch (e) {
    console.error('Failed to get/generate master key:', e);
    // Fallback (not ideal, but prevents crash)
    return 'superapp_fallback_key_not_for_production';
  }
}

/**
 * Encrypted wrapper for AsyncStorage.
 * Suitable for larger data that needs security (e.g. Finance, Journal).
 */
export const EncryptedStorage = {
  async setItem(key: string, value: any): Promise<void> {
    try {
      const masterKey = await getMasterKey();
      const stringValue = JSON.stringify(value);
      const encryptedValue = CryptoJS.AES.encrypt(stringValue, masterKey).toString();
      await AsyncStorage.setItem(key, encryptedValue);
    } catch (e) {
      console.error(`EncryptedStorage setItem error for key ${key}:`, e);
    }
  },

  async getItem(key: string): Promise<any> {
    try {
      const masterKey = await getMasterKey();
      const encryptedValue = await AsyncStorage.getItem(key);
      if (!encryptedValue) return null;

      const bytes = CryptoJS.AES.decrypt(encryptedValue, masterKey);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) return null;
      return JSON.parse(decryptedString);
    } catch (e) {
      console.error(`EncryptedStorage getItem error for key ${key}:`, e);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.error(`EncryptedStorage removeItem error for key ${key}:`, e);
    }
  }
};
