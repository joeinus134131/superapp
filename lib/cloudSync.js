import { supabase } from './supabaseClient';

const SYNC_KEY = 'superapp_sync_id';

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
    const { data: result, error } = await supabase
      .from('user_sync_data')
      .upsert({
        sync_id: syncId,
        user_id: payload.userId,
        is_premium: payload.isPremium,
        data: payload,
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
      .select('data')
      .eq('sync_id', syncId.toUpperCase())
      .maybeSingle();

    if (error) {
      console.error('Supabase Pull Error:', error);
      throw new Error('Terjadi kesalahan sistem saat mengambil data dari cloud.');
    }

    if (!data || !data.data) {
      throw new Error('Data tidak ditemukan. Pastikan Kode Unik benar.');
    }

    const payload = data.data;
    const keysRestored = restoreData(payload);

    setSyncId(syncId);
    return { keysRestored, syncedAt: payload.syncedAt };
  } catch (err) {
    throw new Error('Pull gagal: ' + err.message);
  }
}

export { getSyncId, setSyncId };
