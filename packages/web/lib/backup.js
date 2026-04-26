// 💾 Data Backup & Export System

export function exportAllData() {
  if (typeof window === 'undefined') return null;

  const userId = localStorage.getItem('superapp_current_user');
  const allData = {};

  // Collect all user-namespaced data
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

export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target.result);
        if (!importData.data || importData.version !== 1) {
          reject(new Error('Format file tidak valid'));
          return;
        }
        // Write all keys
        Object.entries(importData.data).forEach(([key, value]) => {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        });
        resolve({ keys: Object.keys(importData.data).length, date: importData.exportedAt });
      } catch (err) {
        reject(new Error('Gagal membaca file backup'));
      }
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
