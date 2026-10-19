// 💾 Data Backup & Export System
import { normalizeStorageIdentity } from './storage';
import { isSyncModule } from './databaseSync';

export function exportAllData() {
  if (typeof window === 'undefined') return null;

  const userId = normalizeStorageIdentity(localStorage.getItem('superapp_current_user'));
  if (!userId) throw new Error('Profil aktif tidak ditemukan.');
  const allData = {};

  // Collect all user-namespaced data
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(userId + '_') && isSyncModule(key.slice(userId.length + 1))) {
      try {
        allData[key] = JSON.parse(localStorage.getItem(key));
      } catch {
        allData[key] = localStorage.getItem(key);
      }
    }
  }

  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    userId,
    data: allData,
  };

  // Download as JSON
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `superapp-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return true;
}

export function prepareRestore(backup, activeUser) {
  const owner = normalizeStorageIdentity(backup?.userId);
  if (backup?.version !== 1 || !owner || !activeUser || !backup.data || typeof backup.data !== 'object' || Array.isArray(backup.data)) {
    throw new Error('Format backup atau profil aktif tidak valid.');
  }
  const entries = new Map();
  for (const [key, value] of Object.entries(backup.data)) {
    const prefix = [`${owner}_`, `${JSON.stringify(owner)}_`].find(prefix => key.startsWith(prefix));
    const suffix = prefix ? key.slice(prefix.length) : key;
    if (!isSyncModule(suffix)) continue;
    const target = `${activeUser}_${suffix}`;
    if (entries.has(target)) throw new Error(`Backup memiliki kunci duplikat: ${suffix}`);
    entries.set(target, typeof value === 'string' ? value : JSON.stringify(value));
  }
  if (!entries.size) throw new Error('Backup tidak berisi data modul yang dapat dipulihkan.');
  return [...entries];
}

export function importData(file, persist) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backup = JSON.parse(/** @type {string} */ (e.target.result));
        const user = normalizeStorageIdentity(localStorage.getItem('superapp_current_user'));
        const entries = prepareRestore(backup, user);
        if (!persist) throw new Error('Penyimpanan restore belum dikonfigurasi.');
        await persist(entries);
        resolve({ keys: entries.length, date: backup.exportedAt });
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsText(file);
  });
}

import { getStorageLimitMB } from './tokenSystem';

export function getStorageSize() {
  if (typeof window === 'undefined') return { used: 0, total: 5 * 1024 * 1024 };
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    if (value) total += value.length * 2; // UTF-16
  }

  const limitMB = getStorageLimitMB();
  const limitBytes = limitMB * 1024 * 1024;

  return {
    used: total,
    total: limitBytes,
    usedMB: (total / (1024 * 1024)).toFixed(2),
    percent: Math.min(100, Math.round((total / limitBytes) * 100)),
  };
}
