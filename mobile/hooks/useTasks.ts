import { useState, useCallback, useEffect } from 'react';
import { getData, setData, STORAGE_KEYS } from '../lib/storage';
import { generateId } from '../lib/helpers';
import { addXP } from '../lib/gamification';
import * as Haptics from 'expo-haptics';
import { SyncService } from '../lib/syncService';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  deadline: string;
  status: string;
  createdAt: string;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [xpToast, setXpToast] = useState<string | null>(null);
  const [levelUpData, setLevelUpData] = useState<any>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const saved = await getData(STORAGE_KEYS.TASKS);
      if (saved && Array.isArray(saved)) {
        setTasks(saved);
      }
    } catch (e) {
      console.error('Failed to load tasks:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const saveTasks = async (newTasks: Task[]) => {
    setTasks(newTasks);
    await setData(STORAGE_KEYS.TASKS, newTasks);
    // Trigger Cloud Sync in background
    SyncService.runSync().catch(e => console.warn('[Sync] Background sync failed:', e));
  };

  const rewardXP = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const result = await addXP('TASK_COMPLETE');
    if (result.levelUp) setLevelUpData(result.newLevel);
    setXpToast(`+${result.xpGained} XP 🎉`);
    setTimeout(() => setXpToast(null), 3000);
  };

  const addTask = async (form: Omit<Task, 'id' | 'createdAt'>) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newTask: Task = {
      ...form,
      id: generateId(),
      createdAt: new Date().toISOString()
    };
    const updatedTasks = [newTask, ...tasks];
    await saveTasks(updatedTasks);
    if (form.status === 'done') await rewardXP();
    return newTask;
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;

    const oldTask = tasks[taskIndex];
    const wasDone = oldTask.status === 'done';
    const newTask = { ...oldTask, ...updates };
    const nowDone = newTask.status === 'done';

    const updatedTasks = tasks.map(t => t.id === id ? newTask : t);
    await saveTasks(updatedTasks);

    if (!wasDone && nowDone) await rewardXP();
  };

  const deleteTask = async (id: string) => {
    const updatedTasks = tasks.filter(t => t.id !== id);
    await saveTasks(updatedTasks);
  };

  const moveTask = async (id: string, newStatus: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateTask(id, { status: newStatus });
  };

  return {
    tasks,
    loading,
    xpToast,
    setXpToast,
    levelUpData,
    setLevelUpData,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    refreshTasks: loadTasks
  };
}
