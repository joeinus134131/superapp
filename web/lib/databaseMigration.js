import localforage from 'localforage';
import { normalizeStorageIdentity } from '@superapp/shared/storage';
import { getCloudAccessToken } from '@superapp/shared/cloud-auth';
import { API_URL } from './apiConfig';

function migrationStateKey() {
  const owner = normalizeStorageIdentity(localStorage.getItem('superapp_current_user'));
  if (!owner) throw new Error('Profil aktif tidak ditemukan.');
  return `${owner}_superapp_database_migration_v1`;
}
const EXCLUDED_SUFFIXES = new Set([
  'superapp_current_user', 'superapp_users', 'superapp_session_token',
  'SYNC_PASSWORD', 'superapp_sync_id',
]);

function parseStoredValue(value) {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return value; }
}

function canonicalStorageKey(key, userId) {
  if (!key || !userId) return null;
  const prefixes = [`${userId}_`, `${JSON.stringify(userId)}_`];
  const prefix = prefixes.find(candidate => key.startsWith(candidate));
  if (!prefix) return null;
  const storageKey = key.slice(prefix.length);
  if (!storageKey.startsWith('superapp_') || EXCLUDED_SUFFIXES.has(storageKey)) return null;
  return storageKey;
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function resolveAccessToken() {
  return getCloudAccessToken();
}

export async function buildMigrationPreview(userId) {
  if (!userId) throw new Error('Profil aktif tidak ditemukan.');
  const collected = new Map();

  await localforage.iterate((value, key) => {
    const storageKey = canonicalStorageKey(key, userId);
    if (storageKey) collected.set(storageKey, parseStoredValue(value));
  });

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    const storageKey = canonicalStorageKey(key, userId);
    if (storageKey && !collected.has(storageKey)) {
      collected.set(storageKey, parseStoredValue(localStorage.getItem(key)));
    }
  }

  const previous = getDatabaseMigrationState();
  const previousItems = new Map((previous?.items || []).map(item => [item.storage_key, item]));
  const items = await Promise.all([...collected.entries()].map(async ([storageKey, payload]) => {
    const checksum = await sha256(payload);
    const prior = previousItems.get(storageKey);
    return {
      storage_key: storageKey,
      payload,
      schema_version: 1,
      revision: prior ? (prior.checksum === checksum ? prior.revision : prior.revision + 1) : 1,
      checksum,
      client_updated_at: new Date().toISOString(),
    };
  }));
  items.sort((a, b) => a.storage_key.localeCompare(b.storage_key));
  const manifestChecksum = await sha256(items.map(({ storage_key, checksum, revision }) => ({ storage_key, checksum, revision })));

  return {
    itemCount: items.length,
    byteCount: new Blob([JSON.stringify(items)]).size,
    keys: items.map(item => item.storage_key),
    manifestChecksum,
    items,
  };
}

export async function migrateLocalDataToDatabase(userId, preview) {
  const accessToken = await resolveAccessToken();
  if (!accessToken) {
    throw new Error('Profil ini masih lokal-only. Hubungkan autentikasi cloud sebelum migrasi database.');
  }
  const source = preview || await buildMigrationPreview(userId);
  if (!source.items.length) throw new Error('Tidak ada data lokal yang dapat dimigrasikan.');

  const previous = JSON.parse(localStorage.getItem(migrationStateKey()) || 'null');
  const isRetry = previous?.status === 'uploading' && previous?.manifestChecksum === source.manifestChecksum;
  const idempotencyKey = isRetry ? previous.idempotencyKey : crypto.randomUUID();
  localStorage.setItem(migrationStateKey(), JSON.stringify({
    idempotencyKey,
    manifestChecksum: source.manifestChecksum,
    items: source.items.map(({ storage_key, checksum, revision }) => ({ storage_key, checksum, revision })),
    status: 'uploading',
    startedAt: new Date().toISOString(),
  }));

  const response = await fetch(`${API_URL}/storage/migrations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ idempotency_key: idempotencyKey, items: source.items }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Migrasi gagal (HTTP ${response.status}).`);

  const verification = await fetch(`${API_URL}/storage`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!verification.ok) throw new Error('Upload selesai, tetapi verifikasi database gagal. Cache lokal belum dihapus.');
  const stored = await verification.json();
  const checksums = new Map((stored.items || []).map(item => [item.storage_key, item.checksum]));
  const mismatches = source.items.filter(item => checksums.get(item.storage_key) !== item.checksum);
  if (mismatches.length) throw new Error(`Verifikasi gagal untuk ${mismatches.length} data. Cache lokal tetap dipertahankan.`);

  const state = {
    idempotencyKey, migrationId: result.migration_id, status: 'verified',
    itemCount: source.itemCount,
    manifestChecksum: source.manifestChecksum,
    items: source.items.map(({ storage_key, checksum, revision }) => ({ storage_key, checksum, revision })),
    verifiedAt: new Date().toISOString(),
  };
  localStorage.setItem(migrationStateKey(), JSON.stringify(state));
  return state;
}

export function getDatabaseMigrationState() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(migrationStateKey()) || 'null'); }
  catch { return null; }
}
