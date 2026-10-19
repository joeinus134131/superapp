import localforage from 'localforage';
import { createDatabaseSync } from '@superapp/shared/database-sync';
import { normalizeStorageIdentity } from '@superapp/shared/storage';
import { getCloudAccessToken } from '@superapp/shared/cloud-auth';
import { API_URL } from './apiConfig';

const performSync = createDatabaseSync({
  identity: async () => normalizeStorageIdentity(localStorage.getItem('superapp_current_user')),
  list: async () => [...new Set([...await localforage.keys(), ...Object.keys(localStorage)])],
  read: async key => {
    let value = await localforage.getItem(key);
    if (value === null) value = localStorage.getItem(key);
    if (typeof value === 'string') { try { return JSON.parse(value); } catch { return value; } }
    return value;
  },
  write: async (key, value) => {
    await localforage.setItem(key, value);
    localStorage.setItem(key, JSON.stringify(value));
  },
  digest: async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(b => b.toString(16).padStart(2, '0')).join(''),
  uuid: () => crypto.randomUUID(),
  request: async (path, body) => {
    const token = await getCloudAccessToken();
    if (!token) throw new Error('Hubungkan akun cloud di Pengaturan sebelum sinkronisasi.');
    const response = await fetch(`${API_URL}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Sinkronisasi gagal (HTTP ${response.status}).`);
    return result;
  },
});

export async function syncDatabase(options = {}) {
  const result = await performSync(options);
  if (result.downloaded) window.dispatchEvent(new CustomEvent('whenya:data-synced', { detail: result }));
  return result;
}

let timer;
export function scheduleDatabaseSync() {
  clearTimeout(timer);
  timer = setTimeout(() => syncDatabase().catch(error => {
    console.error('[Database sync]', error);
    window.dispatchEvent(new CustomEvent('whenya:sync-error', { detail: { message: error.message, conflicts: error.conflicts } }));
  }), 3000);
}
