import { useState, useCallback, useEffect } from 'react';
import { STORAGE_KEYS } from '../lib/storage';
import { EncryptedStorage } from '../lib/secureStorage';
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
  createdAt: string;
}

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [xpToast, setXpToast] = useState<string | null>(null);

  const loadJournal = useCallback(async () => {
    setLoading(true);
    try {
      const saved = await EncryptedStorage.getItem(STORAGE_KEYS.JOURNAL);
      if (saved && Array.isArray(saved)) {
        setEntries(saved);
      }
    } catch (e) {
      console.error('Failed to load journal entries:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJournal();
  }, [loadJournal]);

  const saveEntries = async (newEntries: JournalEntry[]) => {
    setEntries(newEntries);
    await EncryptedStorage.setItem(STORAGE_KEYS.JOURNAL, newEntries);
  };

  const addEntry = async (form: Omit<JournalEntry, 'id' | 'date' | 'createdAt'>) => {
    const today = getToday();
    const newEntry: JournalEntry = {
      ...form,
      id: generateId(),
      date: today,
      createdAt: new Date().toISOString(),
    };
    const updated = [newEntry, ...entries];
    await saveEntries(updated);
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const result = await addXP('JOURNAL_ENTRY');
    setXpToast(`+${result.xpGained} XP ✍️`);
    setTimeout(() => setXpToast(null), 2500);
    return newEntry;
  };

  const updateEntry = async (id: string, updates: Partial<JournalEntry>) => {
    const updated = entries.map(e => e.id === id ? { ...e, ...updates } : e);
    await saveEntries(updated);
  };

  const deleteEntry = async (id: string) => {
    const updated = entries.filter(e => e.id !== id);
    await saveEntries(updated);
  };

  return {
    entries,
    loading,
    xpToast,
    addEntry,
    updateEntry,
    deleteEntry,
    refreshJournal: loadJournal
  };
}
