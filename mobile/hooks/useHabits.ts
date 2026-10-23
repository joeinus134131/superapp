import { DeviceEventEmitter } from 'react-native';
import { useState, useCallback, useEffect, useRef } from 'react';
import { getData, STORAGE_KEYS } from '../lib/storage';
import { generateId, getToday } from '../lib/helpers';
import { updateHabits, toggleHabitPersisted, retryHabitReward as retryReward } from '../lib/habitRepository';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  completedDates: string[];
  streak: number;
  bestStreak: number;
  createdAt: string;
  rewardedDates?: string[];
  pendingRewardDates?: string[];
}

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rewardError, setRewardError] = useState<string | null>(null);
  const pending = useRef(false);
  const [xpToast, setXpToast] = useState<string | null>(null);
  const [levelUpData, setLevelUpData] = useState<{level: number, title: string} | null>(null);

  const loadHabits = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const saved = await getData(STORAGE_KEYS.HABITS, true);
      if (saved && Array.isArray(saved)) {
        const migrated = saved.map((h: any) => ({
          ...h,
          icon: h.icon || 'star'
        }));
        setHabits(migrated);
        const today = getToday();
        setRewardError(migrated.find((habit: Habit) => habit.completedDates?.includes(today) && habit.pendingRewardDates?.includes(today))?.id || null);
      } else { setHabits([]); setRewardError(null); }
    } catch (e) {
      setError(true);
      console.error('Failed to load habits:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHabits();
    const subscription = DeviceEventEmitter.addListener('whenya:data-synced', loadHabits);
    const habitSubscription = DeviceEventEmitter.addListener('whenya:habits-updated', loadHabits);
    return () => { subscription.remove(); habitSubscription.remove(); };
  }, [loadHabits]);

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
    const updated = await updateHabits(items => [...items, newHabit]);
    setHabits(updated);
    DeviceEventEmitter.emit('whenya:habits-updated');
    return newHabit;
  };

  const applyToggle = async (id: string, retry = false) => {
    if (pending.current) return;
    pending.current = true; setPendingId(id);
    try {
      const result = await (retry ? retryReward(id) : toggleHabitPersisted(id));
      setHabits(result.habits); setRewardError(result.rewardPending ? id : null);
      if (result.reward?.levelUp) setLevelUpData(result.reward.newLevel);
      if (result.reward?.xpGained) {
        setXpToast(`+${result.reward.xpGained} XP`); setTimeout(() => setXpToast(null), 2500);
      }
      DeviceEventEmitter.emit('whenya:habits-updated');
      return result;
    } finally { pending.current = false; setPendingId(null); }
  };
  const toggleHabit = (id: string) => applyToggle(id);
  const retryHabitReward = (id: string) => applyToggle(id, true);
  const deleteHabit = async (id: string) => {
    setHabits(await updateHabits(items => items.filter(item => item.id !== id)));
    DeviceEventEmitter.emit('whenya:habits-updated');
  };

  return {
    habits,
    loading, error, pendingId, rewardError, retryHabitReward,
    xpToast,
    levelUpData,
    setLevelUpData,
    addHabit,
    toggleHabit,
    deleteHabit,
    refreshHabits: loadHabits
  };
}
