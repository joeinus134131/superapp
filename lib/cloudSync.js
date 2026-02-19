// ☁️ Cloud Sync via jsonblob.com (free, no API key, CORS-enabled)

const JSONBLOB_API = 'https://jsonblob.com/api/jsonBlob';
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
  const existingId = getSyncId();

  try {
    if (existingId) {
      // Update existing blob
      const res = await fetch(`${JSONBLOB_API}/${existingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Update gagal');
      return { syncId: existingId, isNew: false };
    }

    // Create new blob
    const res = await fetch(JSONBLOB_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Upload gagal');

    // Extract blob ID from Location header
    const location = res.headers.get('Location') || '';
    const blobId = location.split('/').pop();
    if (!blobId) throw new Error('Tidak dapat ID sync');

    setSyncId(blobId);
    return { syncId: blobId, isNew: true };

  } catch (err) {
    throw new Error('Sync gagal: ' + err.message);
  }
}

export async function pullFromCloud(syncId) {
  if (!syncId) throw new Error('Sync ID diperlukan');

  try {
    const res = await fetch(`${JSONBLOB_API}/${syncId}`);
    if (!res.ok) throw new Error('Data tidak ditemukan. Cek Sync ID.');

    const payload = await res.json();
    const keysRestored = restoreData(payload);

    setSyncId(syncId);
    return { keysRestored, syncedAt: payload.syncedAt };

  } catch (err) {
    throw new Error('Pull gagal: ' + err.message);
  }
}

export { getSyncId, setSyncId };
