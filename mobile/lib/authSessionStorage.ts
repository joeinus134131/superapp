import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';
import { Platform } from 'react-native';

const KEY = 'whenya_auth_encryption_v1';
const PREFIX = 'whenya_auth_v2.';
let keyPromise: Promise<string> | null = null;
const word = (bytes: Uint8Array) => CryptoJS.enc.Hex.parse(Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join(''));
async function keys() {
  if (!keyPromise) keyPromise = (async () => {
    let value = await SecureStore.getItemAsync(KEY);
    if (!value) {
      value = word(await Crypto.getRandomBytesAsync(64)).toString();
      await SecureStore.setItemAsync(KEY, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    }
    if (!/^[0-9a-f]{128}$/i.test(value)) throw new Error('Kunci sesi tidak valid.');
    return value;
  })().catch(error => { keyPromise = null; throw error; });
  const value = await keyPromise;
  return { encryption: CryptoJS.enc.Hex.parse(value.slice(0, 64)), authentication: CryptoJS.enc.Hex.parse(value.slice(64)) };
}
function webStorage() {
  if (typeof sessionStorage === 'undefined') throw new Error('Penyimpanan sesi browser tidak tersedia.');
  return sessionStorage;
}
// Encrypt larger session payloads; only the random encryption/HMAC keys live in
// Keychain/Keystore. Auth records are neither account module data nor cloud sync.
export const authSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return webStorage().getItem(PREFIX + key);
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (raw === null) return null;
    const { encryption, authentication } = await keys();
    const record = JSON.parse(raw);
    if (record.v !== 1 || typeof record.iv !== 'string' || typeof record.ciphertext !== 'string' || typeof record.mac !== 'string') throw new Error('Format sesi tidak valid.');
    const expected = CryptoJS.HmacSHA256(`${key}:${record.iv}:${record.ciphertext}`, authentication).toString();
    // Compare all characters without an early exit. Invalid records never decrypt.
    let mismatch = expected.length ^ record.mac.length;
    for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ (record.mac.charCodeAt(i) || 0);
    if (mismatch) throw new Error('Integritas sesi tidak valid.');
    const result = CryptoJS.AES.decrypt(record.ciphertext, encryption, { iv: CryptoJS.enc.Hex.parse(record.iv) }).toString(CryptoJS.enc.Utf8);
    if (!result) throw new Error('Sesi tidak dapat dibaca.');
    return result;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') { webStorage().setItem(PREFIX + key, value); return; }
    const { encryption, authentication } = await keys();
    const iv = word(await Crypto.getRandomBytesAsync(16));
    const ciphertext = CryptoJS.AES.encrypt(value, encryption, { iv }).toString();
    const mac = CryptoJS.HmacSHA256(`${key}:${iv.toString()}:${ciphertext}`, authentication).toString();
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ v: 1, iv: iv.toString(), ciphertext, mac }));
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') { webStorage().removeItem(PREFIX + key); return; }
    await AsyncStorage.removeItem(PREFIX + key);
  },
};

export async function migrateLegacyAuthSession(key: string) {
  const current = await authSessionStorage.getItem(key);
  if (current === null) {
    const legacy = await AsyncStorage.getItem('superapp_session');
    if (legacy) {
      const session = JSON.parse(legacy);
      if (session?.access_token && session?.refresh_token) {
        await authSessionStorage.setItem(key, JSON.stringify(session));
        if (await authSessionStorage.getItem(key) !== JSON.stringify(session)) throw new Error('Migrasi sesi belum tersimpan.');
      }
    }
  }
  const cloud = await AsyncStorage.getItem('superapp_cloud_session');
  if (cloud !== null) {
    if (await authSessionStorage.getItem('superapp_cloud_session') === null) {
      await authSessionStorage.setItem('superapp_cloud_session', cloud);
      if (await authSessionStorage.getItem('superapp_cloud_session') !== cloud) throw new Error('Migrasi sesi cloud belum tersimpan.');
    }
    await AsyncStorage.removeItem('superapp_cloud_session');
  }
  // Delete plaintext only after the encrypted write/read succeeds.
  await AsyncStorage.multiRemove(['superapp_session', 'superapp_session_token']);
}
