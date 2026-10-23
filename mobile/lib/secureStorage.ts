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
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      key = CryptoJS.lib.WordArray.create(randomBytes as any).toString();
      await SecureStore.setItemAsync(MASTER_KEY_STORAGE_KEY, key);
    }
    return key;
  } catch (e) {
    console.error('[SecureStorage] Failed to access SecureStore master key:', e);
    throw new Error('Secure storage unavailable: Hardware keystore access failed');
  }
}

/**
 * Encrypted wrapper for AsyncStorage.
 * Suitable for larger data that needs security (e.g. Finance, Journal).
 */
async function scopedKey(key: string, expectedOwner?: string): Promise<string> {
  const stored = await AsyncStorage.getItem('superapp_current_user');
  let owner = stored;
  try { owner = JSON.parse(stored || 'null'); } catch { /* legacy plain ID */ }
  if (!owner || typeof owner !== 'string') throw new Error('Profil aktif tidak ditemukan.');
  if (expectedOwner && owner !== expectedOwner) throw new Error('Akun berubah saat sinkronisasi. Coba kembali.');
  return `${owner}_${key}`;
}

export const EncryptedStorage = {
  async setItem(key: string, value: any, options: { skipSync?: boolean; owner?: string } = {}): Promise<void> {
    const fullKey = await scopedKey(key, options.owner);
    const masterKey = await getMasterKey();
    await AsyncStorage.setItem(fullKey, CryptoJS.AES.encrypt(JSON.stringify(value), masterKey).toString());
    if (!options.skipSync) import('./databaseSync').then(module => module.scheduleDatabaseSync());
  },

  async getItem(key: string, options: { owner?: string } = {}): Promise<any> {
    const fullKey = await scopedKey(key, options.owner);
    let raw = await AsyncStorage.getItem(fullKey);
    if (raw === null) {
      const legacyOwner = await AsyncStorage.getItem('superapp_legacy_data_owner');
      const owner = fullKey.slice(0, -(key.length + 1));
      const legacy = await AsyncStorage.getItem(key);
      if (legacy !== null && (!legacyOwner || legacyOwner === owner)) {
        await AsyncStorage.setItem('superapp_legacy_data_owner', owner);
        await AsyncStorage.setItem(fullKey, legacy);
        raw = legacy;
      }
    }
    if (raw === null) return null;
    // Web/legacy restores contain JSON. Native writes stay encrypted at rest.
    try { return JSON.parse(raw); } catch { /* encrypted native value */ }
    try {
      const bytes = CryptoJS.AES.decrypt(raw, await getMasterKey());
      return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    } catch {
      throw new Error(`Data ${key} tidak dapat didekripsi. Data lokal tetap dipertahankan.`);
    }
  },

  async removeItem(key: string): Promise<void> {
    await this.setItem(key, null);
  }
};
