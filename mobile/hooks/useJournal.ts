import { getData, STORAGE_KEYS } from '../lib/storage';
import { readJournalEntries, updateJournalEntries } from '../lib/journalRepository';
import { DeviceEventEmitter } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { generateId, getToday } from '../lib/helpers';
import { addXP } from '../lib/gamification';
import * as Haptics from 'expo-haptics';

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: string;
  tags: string[];
  aiReflection?: string;
  createdAt: string;
}

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rewardError, setRewardError] = useState<string | null>(null);
  const [xpToast, setXpToast] = useState<string | null>(null);

  const loadJournal = useCallback(async () => {
    setLoading(true); setError(false);
    try {
      setEntries(await readJournalEntries());
    } catch (e) {
      setError(true);
      console.error('Failed to load journal entries:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJournal();
    const subscription = DeviceEventEmitter.addListener('whenya:data-synced', loadJournal);
    return () => subscription.remove();
  }, [loadJournal]);

  const saveEntries = async (change: (entries: JournalEntry[]) => JournalEntry[]) => {
    const next = await updateJournalEntries(change);
    setEntries(next); DeviceEventEmitter.emit('whenya:journal-updated');
  };
  const rewardEntry = async (id: string, owner?: string) => {
    try {
      const result = await addXP('JOURNAL_ENTRY', 1, `journal:${id}`, owner);
      setRewardError(null);
      if (result.xpGained) { setXpToast(`+${result.xpGained} XP`); setTimeout(() => setXpToast(null), 2500); }
    } catch { setRewardError(id); }
  };

  const addEntry = async (form: Omit<JournalEntry, 'id' | 'date' | 'createdAt'>) => {
    const owner = await getData(STORAGE_KEYS.CURRENT_USER, true);
    const today = getToday();
    const newEntry: JournalEntry = {
      ...form,
      id: generateId(),
      date: today,
      createdAt: new Date().toISOString(),
    };
    await saveEntries(items => [newEntry, ...items]);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await rewardEntry(newEntry.id, owner);
    return newEntry;
  };

  const updateEntry = async (id: string, updates: Partial<JournalEntry>) => {
    await saveEntries(items => items.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const deleteEntry = async (id: string) => {
    await saveEntries(items => items.filter(e => e.id !== id));
  };

  return {
    entries,
    loading, error, rewardError, retryJournalReward: rewardEntry,
    xpToast,
    addEntry,
    updateEntry,
    deleteEntry,
    refreshJournal: loadJournal
  };
}
