import { STORAGE_KEYS, getData, setData } from './storage';
import { getToday } from './helpers';

export interface Quest {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp: number;
  category: 'mind' | 'body' | 'soul' | 'social' | 'growth' | 'finance';
}

export const ALL_QUESTS: Quest[] = [
  { id: 'q1', title: 'Deep Breather', description: 'Take 10 deep breaths right now.', icon: 'self-improvement', xp: 20, category: 'soul' },
  { id: 'q2', title: 'Hydration Pro', description: 'Drink a full glass of water.', icon: 'water-drop', xp: 15, category: 'body' },
  { id: 'q3', title: 'Social Butterfly', description: 'Send a "How are you?" text to a friend.', icon: 'chat', xp: 30, category: 'social' },
  { id: 'q4', title: 'Quick Learner', description: 'Read 1 page of a book or article.', icon: 'menu-book', xp: 25, category: 'mind' },
  { id: 'q5', title: 'Money Saver', description: 'Review your expenses for the last 24h.', icon: 'account-balance-wallet', xp: 20, category: 'finance' },
  { id: 'q6', title: 'Micro Mover', description: 'Do 10 jumping jacks or stretch for 1 min.', icon: 'fitness-center', xp: 20, category: 'body' },
  { id: 'q7', title: 'Gratitude Moment', description: 'Write down 1 thing you are grateful for.', icon: 'favorite', xp: 20, category: 'soul' },
];

export async function getDailyQuest() {
  const today = getToday();
  const saved = await getData(STORAGE_KEYS.DAILY_QUEST);
  
  if (saved && saved.date === today) {
    return saved;
  }

  // Pick a new quest
  const randomIndex = Math.floor(Math.random() * ALL_QUESTS.length);
  const quest = ALL_QUESTS[randomIndex];
  
  const newQuestData = {
    date: today,
    questId: quest.id,
    completed: false,
    ...quest
  };
  
  await setData(STORAGE_KEYS.DAILY_QUEST, newQuestData);
  return newQuestData;
}

export async function completeDailyQuest() {
  const saved = await getDailyQuest();
  if (saved.completed) return { alreadyCompleted: true };
  
  const updated = { ...saved, completed: true };
  await setData(STORAGE_KEYS.DAILY_QUEST, updated);
  return { ...updated, alreadyCompleted: false };
}
