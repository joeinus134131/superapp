import { prepareRestore } from '@superapp/shared/backup';
import { persistRestoredEntries } from './storage';
import { getSupabaseClient } from '@superapp/shared/supabase';
import CryptoJS from 'crypto-js';
import { normalizeStorageIdentity } from '@superapp/shared/storage';

const SYNC_KEY = 'superapp_sync_id';
function getEncryptionSecret() {
  if (typeof window === 'undefined') throw new Error('Kunci enkripsi hanya tersedia di perangkat pengguna.');
  const storedPassword = localStorage.getItem(`${normalizeStorageIdentity(localStorage.getItem('superapp_current_user'))}_SYNC_PASSWORD`) || localStorage.getItem('SYNC_PASSWORD');
  let userPass = storedPassword;
  try { userPass = JSON.parse(storedPassword); } catch { /* legacy plain password */ }
  if (typeof userPass !== 'string' || userPass.length < 12) {
    throw new Error('Buat kunci sinkronisasi minimal 12 karakter di Pengaturan sebelum memakai cloud sync.');
  }
  return userPass;
}

function getSyncId() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SYNC_KEY);
}

function setSyncId(id) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SYNC_KEY, id);
}

function collectAllData() {
  const userId = normalizeStorageIdentity(localStorage.getItem('superapp_current_user'));
  let uniqueCode = null;
  let isPremium = false;

  if (userId) {
    try {
      const users = JSON.parse(localStorage.getItem('superapp_users') || '[]');
      const user = users.find(u => u.id === userId);
      if (user) uniqueCode = user.uniqueCode;

      const tokenData = JSON.parse(localStorage.getItem(`${userId}_superapp_tokens`));
      if (tokenData && tokenData.totalPurchased > 0) isPremium = true;
    } catch (e) {
      console.error('Error parsing user/token data', e);
    }
  }

  const allData = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith(userId + '_') || key.startsWith('superapp_'))) {
      try {
        allData[key] = JSON.parse(localStorage.getItem(key));
      } catch {
        allData[key] = localStorage.getItem(key);
      }
    }
  }

  return {
    version: 1,
    syncedAt: new Date().toISOString(),
    userId,
    uniqueCode,
    isPremium,
    data: allData,
  };
}

async function restoreData(payload) {
  if (!payload?.data) throw new Error('Data tidak valid');
  const active = normalizeStorageIdentity(localStorage.getItem('superapp_current_user'));
  const owner = normalizeStorageIdentity(payload.data.superapp_current_user) || active;
  const entries = prepareRestore({ version: 1, userId: owner, data: payload.data }, active);
  await persistRestoredEntries(entries);
  return entries.length;
}

export async function pushToCloud() {
  const payload = collectAllData();

  // Use uniqueCode if available, else fallback to old sync ID or random UUID
  const syncId = payload.uniqueCode || getSyncId() || crypto.randomUUID();

  try {
    // Encrypt the entire payload.data and specific fields before sending to Supabase
    const secret = getEncryptionSecret();
    const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(payload.data), secret).toString();

    const { data: result, error } = await getSupabaseClient()
      .from('user_sync_data')
      .upsert({
        sync_id: syncId,
        user_id: payload.userId,
        is_premium: payload.isPremium,
        data: { encrypted_payload: encryptedData, version: payload.version }, // Save as encrypted json
        synced_at: payload.syncedAt,
      }, { onConflict: 'sync_id' })
      .select()
      .single();

    if (error) {
      console.error('Supabase Push Error:', error);
      throw new Error(error.message || 'Gagal menyimpan ke Supabase');
    }

    setSyncId(syncId);
    return { syncId, isNew: false };
  } catch (err) {
    throw new Error('Sync gagal: ' + err.message);
  }
}

export async function pullFromCloud(syncId) {
  if (!syncId) throw new Error('Sync ID/Kode Unik diperlukan');

  try {
    const { data, error } = await getSupabaseClient()
      .from('user_sync_data')
      .select('data, synced_at')
      .eq('sync_id', /^[0-9a-f-]{36}$/i.test(syncId) ? syncId.toLowerCase() : syncId.toUpperCase())
      .maybeSingle();

    if (error) {
      console.error('Supabase Pull Error:', error);
      throw new Error('Terjadi kesalahan sistem saat mengambil data dari cloud.');
    }

    if (!data || !data.data) {
      throw new Error('Data tidak ditemukan. Pastikan Kode Unik benar.');
    }

    let parsedData = data.data;

    // Check if it's the new encrypted format
    if (parsedData.encrypted_payload) {
      const secret = getEncryptionSecret();
      const bytes = CryptoJS.AES.decrypt(parsedData.encrypted_payload, secret);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        throw new Error('Gagal mendekripsi data. Kunci enkripsi mungkin tidak valid.');
      }
      
      parsedData = {
        data: JSON.parse(decryptedString),
        syncedAt: data.synced_at
      };
    } else {
       // Support backward compatibility if any unencrypted data exists
       parsedData = {
          data: parsedData,
          syncedAt: data.synced_at
       };
    }

    const payload = parsedData;
    const keysRestored = await restoreData(payload);

    setSyncId(syncId);
    return { keysRestored, syncedAt: payload.syncedAt };
  } catch (err) {
    throw new Error('Pull gagal: ' + err.message);
  }
}

// Auto-Sync background driver
// This function can be called after any successful mutation to schedule a background sync
let syncTimeout = null;
export function triggerAutoSync() {
  if (typeof window === 'undefined') return;
  const userId = normalizeStorageIdentity(localStorage.getItem('superapp_current_user'));
  if (!userId) return; // Only sync if logged in

  if (syncTimeout) clearTimeout(syncTimeout);
  
  // Debounce sync so it doesn't spam Supabase
  syncTimeout = setTimeout(async () => {
    try {
      console.log('Background Auto-Sync triggered...');
      await pushToCloud();
      console.log('Background Auto-Sync complete.');
    } catch (e) {
      console.error('Background Auto-Sync failed:', e);
    }
  }, 5000); // Wait 5 seconds of inactivity before pushing
}

export { getSyncId, setSyncId };
