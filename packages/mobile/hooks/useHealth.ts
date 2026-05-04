import { useState, useCallback, useEffect } from 'react';
import { getData, setData, STORAGE_KEYS } from '../lib/storage';
import { generateId, getToday } from '../lib/helpers';
import { addXP } from '../lib/gamification';
import * as Haptics from 'expo-haptics';

export interface Workout {
  id: string;
  type: string;
  duration: number;
  calories: number;
  notes: string;
  date: string;
}

export interface DailyHealth {
  date: string;
  steps: number;
  water: number;
  sleep: number;
  weight: number;
}

export function useHealth() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [dailyHistory, setDailyHistory] = useState<Record<string, DailyHealth>>({});
  const [dailyData, setDailyData] = useState<DailyHealth>({ 
    date: getToday(), steps: 0, water: 0, sleep: 0, weight: 0 
  });
  const [loading, setLoading] = useState(true);
  const [xpToast, setXpToast] = useState<string | null>(null);

  const loadHealthData = useCallback(async () => {
    setLoading(true);
    try {
      const today = getToday();
      const saved = await getData(STORAGE_KEYS.HEALTH);
      if (saved) {
        if (saved.workouts) setWorkouts(saved.workouts);
        if (saved.daily) setDailyHistory(saved.daily);
        const todayData = saved.daily?.[today] || { 
          date: today, steps: 0, water: 0, sleep: 0, weight: 0 
        };
        setDailyData(todayData);
      }
    } catch (e) {
      console.error('Failed to load health data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealthData();
  }, [loadHealthData]);

  const saveToStorage = async (updates: { workouts?: Workout[]; daily?: Record<string, DailyHealth> }) => {
    const current = await getData(STORAGE_KEYS.HEALTH) || {};
    const newData = { ...current, ...updates };
    await setData(STORAGE_KEYS.HEALTH, newData);
  };

  const addWorkout = async (form: Omit<Workout, 'id' | 'date'>) => {
    const today = getToday();
    const workout: Workout = {
      ...form,
      id: generateId(),
      date: today
    };
    const updatedWorkouts = [workout, ...workouts];
    setWorkouts(updatedWorkouts);
    await saveToStorage({ workouts: updatedWorkouts });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const result = await addXP('WORKOUT');
    setXpToast(`+${result.xpGained} XP 💪`);
    setTimeout(() => setXpToast(null), 2500);
    return workout;
  };

  const updateDailyData = async (data: Partial<DailyHealth>) => {
    const today = getToday();
    const updated: DailyHealth = {
      ...dailyData,
      ...data,
      date: today
    };
    setDailyData(updated);
    const updatedHistory = { ...dailyHistory, [today]: updated };
    setDailyHistory(updatedHistory);
    await saveToStorage({ daily: updatedHistory });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return {
    workouts,
    dailyData,
    dailyHistory,
    loading,
    xpToast,
    setXpToast,
    addWorkout,
    updateDailyData,
    refreshHealth: loadHealthData
  };
}
