import { createSyncCoordinator, SyncOptions, SyncStatus } from './syncCoordinator';
import { EncryptedStorage } from './secureStorage';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createDatabaseSync } from '@superapp/shared/database-sync';
import { normalizeStorageIdentity } from '@superapp/shared/storage';
import { getMobileAuthClient as getSupabaseClient } from './mobileAuthClient';
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
    if (module) return EncryptedStorage.getItem(module, { owner: key.slice(0, -(module.length + 1)) });
    const raw = await AsyncStorage.getItem(key);
    try { return raw === null ? null : JSON.parse(raw); } catch { return raw; }
  },
  write: async (key: string, value: unknown) => {
    const module = ['superapp_transactions', 'superapp_journal', 'superapp_custom_categories'].find(suffix => key.endsWith(`_${suffix}`));
    if (module) await EncryptedStorage.setItem(module, value, { skipSync: true, owner: key.slice(0, -(module.length + 1)) });
    else await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  beforeResolve: async ({ owner, conflicts }: { owner: string; conflicts: any[] }) => {
    const existing = await EncryptedStorage.getItem('whenya_sync_conflict_backups_v1', { owner });
    const backups = Array.isArray(existing) ? existing : [];
    await EncryptedStorage.setItem('whenya_sync_conflict_backups_v1', [...backups, { at: new Date().toISOString(), owner, conflicts }].slice(-5), { owner, skipSync: true });
  },
  digest: (value: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value),
  uuid: () => Crypto.randomUUID(),
  request: async (path: string, body?: unknown) => {
    const { data, error } = await getSupabaseClient().auth.getSession();
    if (error || !data.session?.access_token) throw new Error('Sesi cloud tidak tersedia. Masuk kembali.');
    if (data.session.user?.id !== await identity()) throw new Error('Akun perangkat dan sesi cloud berbeda. Masuk kembali.');
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

async function identity() {
  return normalizeStorageIdentity(await AsyncStorage.getItem('superapp_current_user'));
}
export async function getSyncStatus(): Promise<SyncStatus | null> {
  const owner = await identity();
  if (!owner) return null;
  const raw = await AsyncStorage.getItem(`${owner}_whenya_sync_status_v1`);
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export const syncDatabase = createSyncCoordinator({
  identity,
  perform: (options: SyncOptions) => performSync(options),
  readStatus: async owner => {
    const raw = await AsyncStorage.getItem(`${owner}_whenya_sync_status_v1`);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  writeStatus: async (owner, status) => { await AsyncStorage.setItem(`${owner}_whenya_sync_status_v1`, JSON.stringify(status)); },
  onStatus: status => DeviceEventEmitter.emit('whenya:sync-status', status),
  onDownloaded: () => DeviceEventEmitter.emit('whenya:data-synced'),
});

let timer: ReturnType<typeof setTimeout>;
export function scheduleDatabaseSync() {
  clearTimeout(timer);
  timer = setTimeout(() => syncDatabase({ automatic: true, dirty: true }).catch(error => console.warn('[Database sync]', error instanceof Error ? error.message : String(error))), 2000);
}
