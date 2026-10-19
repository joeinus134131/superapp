import { getData, STORAGE_KEYS } from './storage';
import { CONFIG } from './config';
import { translateText } from '@superapp/shared/translations';

export interface AIInsight {
  id: string;
  title: string;
  msg: string;
  icon: string;
  color: string;
  type?: 'TASK' | 'HABIT' | 'FINANCE' | 'FOCUS';
  xpMultiplier?: number;
}

async function getAuthHeaders(language: string = 'en'): Promise<Record<string, string>> {
  const token = await getData(STORAGE_KEYS.SESSION_TOKEN);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept-Language': language,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Gathers current user state into a prompt-friendly context
 */
async function getAIContext(language: string = 'en') {
  const [tasksData, habitsData, gamificationData, journalData] = await Promise.all([
    getData(STORAGE_KEYS.TASKS),
    getData(STORAGE_KEYS.HABITS),
    getData(STORAGE_KEYS.GAMIFICATION),
    getData(STORAGE_KEYS.JOURNAL),
  ]);

  const tasks = Array.isArray(tasksData) ? tasksData : [];
  const habits = Array.isArray(habitsData) ? habitsData : [];
  const journal = Array.isArray(journalData) ? journalData : [];
  const gamification = (gamificationData || {}) as any;

  const todayStr = new Date().toISOString().split('T')[0];
  const tasksCompleted = tasks.filter((t: any) => t.status === 'done' || t.completed).length;
  const tasksPending = tasks.filter((t: any) => t.status !== 'done' && !t.completed).length;

  const habitHistory = habits.map((h: any) => ({
    name: h.name,
    completionRate: h.completedDates?.length || 0,
    isDoneToday: h.completedDates?.includes(todayStr) || false,
    last7Days: Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      return h.completedDates?.includes(dStr) ? 1 : 0;
    }),
  }));

  const lastMood = journal[0]?.mood || 'neutral';

  return {
    time: new Date().toLocaleTimeString(),
    day: new Date().toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long' }),
    tasks: { completed: tasksCompleted, pending: tasksPending },
    habits: habitHistory,
    level: gamification.level || 1,
    xp: gamification.totalXP || 0,
    mood: lastMood,
  };
}

/**
 * Fetches Smart Insights from Backend Go AI Gateway
 */
export async function fetchAIInsights(language: string = 'en'): Promise<AIInsight[]> {
  try {
    const context = await getAIContext(language);
    const headers = await getAuthHeaders(language);

    const response = await fetch(`${CONFIG.API_URL}/ai/insights`, {
      method: 'POST',
      headers,
      body: JSON.stringify(context),
    });

    if (response.ok) {
      const result = await response.json();
      const insights = result.data || result.insights || [];
      if (Array.isArray(insights) && insights.length > 0) {
        return insights;
      }
    }

    // Graceful default if backend AI is processing or offline
    return [
      {
        id: 'default-1',
        title: translateText("Fokus Hari Ini", language),
        msg: translateText("Selesaikan satu tugas prioritas utama untuk membangun momentum produktif.", language),
        icon: 'stars',
        color: '#8b5cf6',
        type: 'TASK',
      },
      {
        id: 'default-2',
        title: translateText("Konsistensi Kebiasaan", language),
        msg: translateText("Pertahankan streak kebiasaan harianmu agar level XP terus meningkat!", language),
        icon: 'local-fire-department',
        color: '#f59e0b',
        type: 'HABIT',
      },
    ];
  } catch (e) {
    console.warn('[AI] Gateway offline, displaying default insights:', e);
    return [
      {
        id: 'offline-1',
        title: translateText("Mode Mandiri", language),
        msg: translateText("Aplikasi berjalan offline. Data dan streak kamu tetap tercatat aman di perangkat.", language),
        icon: 'offline-pin',
        color: '#10b981',
        type: 'TASK',
      },
    ];
  }
}

/**
 * Fetches AI Analysis for a specific journal entry via Backend AI Gateway
 */
export async function analyzeJournalEntry(content: string, language: string = 'en'): Promise<string> {
  try {
    const headers = await getAuthHeaders(language);
    const response = await fetch(`${CONFIG.API_URL}/ai/journal`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.reflection || translateText("Catatan tersimpan dengan baik.", language);
    }
    return translateText("Catatan refleksi berhasil disimpan.", language);
  } catch {
    return translateText("Catatan harianmu berhasil disimpan secara lokal.", language);
  }
}

/**
 * Processes a journal entry to get sentiment and coaching reflection via Backend AI Gateway
 */
export async function processJournalAI(content: string, language: string = 'en'): Promise<{ mood: string; reflection: string }> {
  try {
    const headers = await getAuthHeaders(language);
    const response = await fetch(`${CONFIG.API_URL}/ai/journal`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        mood: data.mood || 'neutral',
        reflection: data.reflection || translateText("Terus jaga konsistensi menulis jurnal harianmu!", language),
      };
    }
  } catch (e) {
    console.warn('[AI] Journal analysis offline:', e);
  }

  return {
    mood: 'neutral',
    reflection: translateText("Refleksi harianmu tersimpan aman di perangkat.", language),
  };
}

/**
 * Generates 3 reflection prompts for the user via Backend AI Gateway
 */
export async function getJournalPrompts(language: string = 'en'): Promise<string[]> {
  const fallbackPrompts = [
    translateText("Apa pencapaian terbaikmu hari ini?", language),
    translateText("Tantangan apa yang paling membuatmu berkembang hari ini?", language),
    translateText("Satu hal kecil yang patut kamu syukuri hari ini?", language),
  ];

  try {
    const headers = await getAuthHeaders(language);
    const response = await fetch(`${CONFIG.API_URL}/ai/prompts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.prompts) && data.prompts.length > 0) {
        return data.prompts;
      }
    }
  } catch (e) {
    console.warn('[AI] Prompts fetch offline:', e);
  }

  return fallbackPrompts;
}
