import { DeviceEventEmitter } from 'react-native';
import { habitStreak } from '@superapp/shared/insights';
import { useState, useCallback, useEffect } from 'react';
import { getData, setData, STORAGE_KEYS } from '../lib/storage';
import { generateId, getToday } from '../lib/helpers';
import { addXP } from '../lib/gamification';
import * as Haptics from 'expo-haptics';
import { SyncService } from '../lib/syncService';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  completedDates: string[];
  streak: number;
  bestStreak: number;
  createdAt: string;
}

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [xpToast, setXpToast] = useState<string | null>(null);
  const [levelUpData, setLevelUpData] = useState<{level: number, title: string} | null>(null);

  const loadHabits = useCallback(async () => {
    setLoading(true);
    try {
      const saved = await getData(STORAGE_KEYS.HABITS);
      if (saved && Array.isArray(saved)) {
        const migrated = saved.map((h: any) => ({
          ...h,
          icon: h.icon || 'star'
        }));
        setHabits(migrated);
      } else { setHabits([]); }
    } catch (e) {
      console.error('Failed to load habits:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHabits();
    const subscription = DeviceEventEmitter.addListener('whenya:data-synced', loadHabits);
    return () => subscription.remove();
  }, [loadHabits]);

  const saveHabits = async (newHabits: Habit[]) => {
    setHabits(newHabits);
    await setData(STORAGE_KEYS.HABITS, newHabits);
    SyncService.runSync().catch(e => console.warn('[Sync] Background sync failed:', e));
  };

  const addHabit = async (name: string, icon: string) => {
    if (!name.trim()) return;
    const newHabit: Habit = {
      id: generateId(),
      name: name.trim(),
      icon: icon,
      completedDates: [],
      streak: 0,
      bestStreak: 0,
      createdAt: new Date().toISOString(),
    };
    const updated = [...habits, newHabit];
    await saveHabits(updated);
    return newHabit;
  };

  const toggleHabit = async (id: string) => {
    const today = getToday();
    const updated = habits.map(h => {
      if (h.id !== id) return h;
      const dates = h.completedDates || [];
      const isCompleted = dates.includes(today);
      const newDates = isCompleted
        ? dates.filter(d => d !== today)
        : [...dates, today];

      const streak = habitStreak(newDates);

      const bestStreak = Math.max(h.bestStreak || 0, streak);

      if (!isCompleted) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        addXP('HABIT_DONE').then(result => {
          if (result.levelUp) setLevelUpData(result.newLevel);
          setXpToast(`+${result.xpGained} XP`);
          setTimeout(() => setXpToast(null), 2000);
        });
      }

      return { ...h, completedDates: newDates, streak, bestStreak };
    });
    await saveHabits(updated);
  };

  const deleteHabit = async (id: string) => {
    const updated = habits.filter(h => h.id !== id);
    await saveHabits(updated);
  };

  return {
    habits,
    loading,
    xpToast,
    levelUpData,
    setLevelUpData,
    addHabit,
    toggleHabit,
    deleteHabit,
    refreshHabits: loadHabits
  };
}
