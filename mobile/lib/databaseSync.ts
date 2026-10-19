import { EncryptedStorage } from './secureStorage';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createDatabaseSync } from '@superapp/shared/database-sync';
import { normalizeStorageIdentity } from '@superapp/shared/storage';
import { getSupabaseClient } from '@superapp/shared/supabase';
import { CONFIG } from './config';

const performSync = createDatabaseSync({
  identity: async () => normalizeStorageIdentity(await AsyncStorage.getItem('superapp_current_user')),
  list: async () => {
    // Migrate legacy unscoped encrypted modules before enumerating local data.
    for (const key of ['superapp_transactions', 'superapp_journal', 'superapp_custom_categories']) await EncryptedStorage.getItem(key);
    return AsyncStorage.getAllKeys();
  },
  read: async (key: string) => {
    const module = ['superapp_transactions', 'superapp_journal', 'superapp_custom_categories'].find(suffix => key.endsWith(`_${suffix}`));
    if (module) return EncryptedStorage.getItem(module);
    const raw = await AsyncStorage.getItem(key);
    try { return raw === null ? null : JSON.parse(raw); } catch { return raw; }
  },
  write: async (key: string, value: unknown) => {
    const module = ['superapp_transactions', 'superapp_journal', 'superapp_custom_categories'].find(suffix => key.endsWith(`_${suffix}`));
    if (module) await EncryptedStorage.setItem(module, value);
    else await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  digest: (value: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value),
  uuid: () => Crypto.randomUUID(),
  request: async (path: string, body?: unknown) => {
    const { data, error } = await getSupabaseClient().auth.getSession();
    if (error || !data.session?.access_token) throw new Error('Sesi cloud tidak tersedia. Masuk kembali.');
    const response = await fetch(`${CONFIG.API_URL}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Sinkronisasi gagal (HTTP ${response.status}).`);
    return result;
  },
});

export async function syncDatabase(options: { resolutions?: Record<string, any> } = {}) {
  try {
    const result = await performSync(options);
    await AsyncStorage.setItem('whenya_last_sync_status', JSON.stringify({ ok: true, at: new Date().toISOString(), ...result }));
    if (result.downloaded) DeviceEventEmitter.emit('whenya:data-synced');
    return result;
  } catch (error) {
    await AsyncStorage.setItem('whenya_last_sync_status', JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error), at: new Date().toISOString() }));
    throw error;
  }
}

let timer: ReturnType<typeof setTimeout>;
export function scheduleDatabaseSync() {
  clearTimeout(timer);
  timer = setTimeout(() => syncDatabase().catch(error => console.error('[Database sync]', error)), 2000);
}
