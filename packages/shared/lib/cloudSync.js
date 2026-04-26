import { supabase } from './supabaseClient';
import CryptoJS from 'crypto-js';

const SYNC_KEY = 'superapp_sync_id';
// Use env secret if available, otherwise fallback. (In production, never use hardcoded, but for demo this secures the row payload).
const ENCRYPTION_SECRET = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'superapp_secure_vault_2026';

function getSyncId() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SYNC_KEY);
}

function setSyncId(id) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SYNC_KEY, id);
}

function collectAllData() {
  const userId = localStorage.getItem('superapp_current_user');
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

function restoreData(payload) {
  if (!payload || !payload.data) throw new Error('Data tidak valid');
  Object.entries(payload.data).forEach(([key, value]) => {
    localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  });
  return Object.keys(payload.data).length;
}

export async function pushToCloud() {
  const payload = collectAllData();

  // Use uniqueCode if available, else fallback to old sync ID or random UUID
  const syncId = payload.uniqueCode || getSyncId() || crypto.randomUUID();

  try {
    // Encrypt the entire payload.data and specific fields before sending to Supabase
    const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(payload.data), ENCRYPTION_SECRET).toString();

    const { data: result, error } = await supabase
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
    const { data, error } = await supabase
      .from('user_sync_data')
      .select('data, synced_at')
      .eq('sync_id', syncId.toUpperCase())
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
      const bytes = CryptoJS.AES.decrypt(parsedData.encrypted_payload, ENCRYPTION_SECRET);
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
    const keysRestored = restoreData(payload);

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
  const userId = localStorage.getItem('superapp_current_user');
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
