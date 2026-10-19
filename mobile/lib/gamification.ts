// Gamification system - port from web's lib/gamification.js
import { getData, setData, STORAGE_KEYS } from './storage';
import { getToday } from './helpers';

interface Level {
  level: number;
  title: string;
  key: string;
  minXP: number;
  color: string;
  narrative?: string;
}

const LEVELS: Level[] = [
  { level: 1, title: 'Chapter 1: The Awakening', key: 'gamification.level1', minXP: 0, color: '#6b7280', narrative: 'Kamu mulai memperhatikan hidupmu. Langkah pertama selalu yang terberat, tapi kamu telah mengambilnya. Kesadaran adalah awal dari perubahan.' },
  { level: 2, title: 'Chapter 2: Building Foundations', key: 'gamification.level2', minXP: 100, color: '#10b981', narrative: 'Kebiasaan baik mulai terbentuk. Kamu sedang meletakkan batu bata pertama untuk masa depanmu. Pertahankan konsistensi ini.' },
  { level: 3, title: 'Chapter 3: The Grind', key: 'gamification.level3', minXP: 300, color: '#3b82f6', narrative: 'Di sinilah kebanyakan orang menyerah. Tapi kamu tidak. Kamu terus mendorong diri melewati batas zona nyaman.' },
  { level: 4, title: 'Chapter 4: Breaking Through', key: 'gamification.level4', minXP: 600, color: '#8b5cf6', narrative: 'Perubahan nyata mulai terlihat. Disiplin bukan lagi paksaan, melainkan bagian dari identitasmu.' },
  { level: 5, title: 'Chapter 5: Relentless', key: 'gamification.level5', minXP: 1000, color: '#f59e0b', narrative: 'Tantangan tidak lagi menakutkan, melainkan menjadi bahan bakar untuk berkembang. Kamu tak terhentikan.' },
  { level: 6, title: 'Chapter 6: Mastery', key: 'gamification.level6', minXP: 1500, color: '#ef4444', narrative: 'Apa yang dulunya sulit kini menjadi keahlian. Kamu telah menguasai dirimu sendiri.' },
  { level: 7, title: 'Chapter 7: The Architect', key: 'gamification.level7', minXP: 2200, color: '#ec4899', narrative: 'Kamu tidak hanya bereaksi terhadap hidup, kamu merancangnya. Kamu adalah arsitek masa depanmu sendiri.' },
  { level: 8, title: 'Chapter 8: Luminary', key: 'gamification.level8', minXP: 3000, color: '#f97316', narrative: 'Orang-orang mulai memperhatikan perubahanmu. Energimu menginspirasi mereka yang ada di sekitarmu.' },
  { level: 9, title: 'Chapter 9: Legend', key: 'gamification.level9', minXP: 4000, color: '#14b8a6', narrative: 'Perjalananmu adalah bukti nyata bahwa dedikasi tak pernah mengkhianati hasil. Pencapaian luar biasa.' },
  { level: 10, title: 'Chapter 10: Apex', key: 'gamification.level10', minXP: 5500, color: '#a855f7', narrative: 'Puncak gunung bukan akhir perjalanan, melainkan tempat melihat gunung lain yang lebih tinggi. Ini baru permulaan.' },
];

const XP_ACTIONS: Record<string, number> = {
  TASK_COMPLETE: 15,
  HABIT_DONE: 10,
  JOURNAL_ENTRY: 20,
  POMODORO_SESSION: 25,
  DAILY_LOGIN: 5,
  STREAK_7: 50,
  STREAK_30: 200,
  GOAL_COMPLETE: 100,
  BOOK_COMPLETE: 75,
  WORKOUT: 15,
};

export function getCurrentLevel(totalXP: number): Level {
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (totalXP >= level.minXP) current = level;
    else break;
  }
  return current;
}

export function getNextLevel(totalXP: number): Level | null {
  for (const level of LEVELS) {
    if (totalXP < level.minXP) return level;
  }
  return null;
}

export function getXPProgress(totalXP: number) {
  const current = getCurrentLevel(totalXP);
  const next = getNextLevel(totalXP);
  if (!next) return { current: totalXP - current.minXP, needed: 0, percent: 100 };
  const currentLevelXP = totalXP - current.minXP;
  const neededXP = next.minXP - current.minXP;
  return {
    current: currentLevelXP,
    needed: neededXP,
    percent: Math.round((currentLevelXP / neededXP) * 100),
  };
}

export async function getXP(): Promise<{ totalXP: number }> {
  const data = await getData(STORAGE_KEYS.GAMIFICATION);
  return data || { totalXP: 0 };
}

export async function addXP(action: string, multiplier: number = 1): Promise<{
  xpGained: number;
  totalXP: number;
  levelUp: boolean;
  newLevel: Level | null;
}> {
  const baseXP = XP_ACTIONS[action] || 0;
  const xpGained = Math.round(baseXP * multiplier);
  
  const data = await getXP();
  const oldLevel = getCurrentLevel(data.totalXP);
  data.totalXP += xpGained;
  const newLevel = getCurrentLevel(data.totalXP);
  await setData(STORAGE_KEYS.GAMIFICATION, data);

  return {
    xpGained,
    totalXP: data.totalXP,
    levelUp: newLevel.level > oldLevel.level,
    newLevel: newLevel.level > oldLevel.level ? newLevel : null,
  };
}

export async function checkDailyLogin(): Promise<{
  alreadyLoggedIn: boolean;
  levelUp: boolean;
  newLevel: Level | null;
}> {
  const today = getToday();
  const lastLogin = await getData(STORAGE_KEYS.DAILY_LOGIN);
  if (lastLogin === today) {
    return { alreadyLoggedIn: true, levelUp: false, newLevel: null };
  }
  await setData(STORAGE_KEYS.DAILY_LOGIN, today);
  const result = await addXP('DAILY_LOGIN');
  return {
    alreadyLoggedIn: false,
    levelUp: result.levelUp,
    newLevel: result.newLevel,
  };
}
