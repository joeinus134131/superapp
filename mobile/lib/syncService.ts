import axios from 'axios';
import * as Network from 'expo-network';
import NetInfo from '@react-native-community/netinfo';
import { getData, STORAGE_KEYS, getRawData } from '@superapp/shared/storage';
import { CONFIG } from './config';

const API_URL = CONFIG.API_URL;


export const SyncService = {
  /**
   * Mengumpulkan snapshot dari berbagai modul
   */
  async collectContextSnapshots() {
    const userId = await getRawData(STORAGE_KEYS.AUTH_USER);
    if (!userId) return [];

    const modules = [
      { type: 'TASK', key: STORAGE_KEYS.TASKS },
      { type: 'HABIT', key: STORAGE_KEYS.HABITS },
      { type: 'FINANCE', key: STORAGE_KEYS.TRANSACTIONS },
      { type: 'JOURNAL', key: STORAGE_KEYS.JOURNAL },
      { type: 'HEALTH', key: STORAGE_KEYS.HEALTH },
      { type: 'GOALS', key: STORAGE_KEYS.GOALS },
      { type: 'GAMIFICATION', key: STORAGE_KEYS.GAMIFICATION },
    ];

    const snapshots = [];

    for (const mod of modules) {
      const data = await getData(mod.key);
      if (data) {
        snapshots.push({
          module_type: mod.type,
          data_payload: data,
          event_timestamp: new Date().toISOString()
        });
      }
    }

    return snapshots;
  },

  /**
   * Menjalankan sinkronisasi batch
   */
  async runSync() {
    console.log('[Sync] Memulai runSync...');
    try {
      const userId = await getRawData(STORAGE_KEYS.AUTH_USER);
      console.log('[Sync] User ID:', userId);
      
      if (!userId) {
        console.log('[Sync] Tidak ada user login, melewati sinkronisasi');
        return;
      }

      const netInfo = await NetInfo.fetch();
      console.log('[Sync] Network Status:', netInfo.isConnected);
      
      if (!netInfo.isConnected) {
        console.log('[Sync] Offline: Melewatkan sinkronisasi');
        return;
      }

      console.log(`[Sync] Mengumpulkan snapshot...`);
      const items = await this.collectContextSnapshots();
      console.log(`[Sync] Terkumpul ${items.length} items:`, items.map(i => i.module_type));
      
      if (items.length === 0) {
        console.log('[Sync] Tidak ada data lokal (Task/Finance/dll) yang ditemukan untuk disinkronkan');
        return;
      }

      console.log(`[Sync] Mengirim ${items.length} snapshot ke backend...`);
      
      const token = await getRawData(STORAGE_KEYS.SESSION_TOKEN);
      const response = await axios.post(`${API_URL}/context/sync`, {
        items: items
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 202 || response.status === 201) {
        console.log('[Sync] Berhasil sinkronisasi ke PostgreSQL');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('[Sync] Gagal Sinkron:', {
          status: error.response?.status,
          message: error.message,
          data: error.response?.data,
          url: error.config?.url
        });
      } else {
        console.error('[Sync] Gagal:', error);
      }
    }
  },

  /**
   * Mengambil Insight cerdas yang dihasilkan oleh AI di Backend
   */
  async getBackendInsights() {
    try {
      const userId = await getRawData(STORAGE_KEYS.AUTH_USER);
      const token = await getRawData(STORAGE_KEYS.SESSION_TOKEN);
      if (!userId) return [];

      const response = await axios.get(`${API_URL}/context/insights?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      return response.data.data || [];
    } catch (e) {
      console.error('[Sync] Gagal mengambil insight dari backend:', e);
      return [];
    }
  }
};

/**
 * Hook untuk otomatis sinkronisasi saat koneksi kembali online
 */
export function initAutoSyncListener() {
  NetInfo.addEventListener(state => {
    if (state.isConnected) {
      console.log('[Sync] Koneksi terdeteksi, memicu sinkronisasi...');
      SyncService.runSync();
    }
  });
}
