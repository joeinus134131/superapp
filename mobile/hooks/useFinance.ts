import { useState, useCallback, useEffect } from 'react';
import { STORAGE_KEYS } from '../lib/storage';
import { EncryptedStorage } from '../lib/secureStorage';
import { generateId, parseRupiahInput } from '../lib/helpers';
import * as Haptics from 'expo-haptics';
import { SyncService } from '../lib/syncService';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
}

export interface CustomCategory {
  id: string;
  label: string;
  emoji: string;
  color: string;
  type: 'income' | 'expense';
}

export function useFinance() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFinanceData = useCallback(async () => {
    setLoading(true);
    try {
      const savedTransactions = await EncryptedStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (savedTransactions && Array.isArray(savedTransactions)) {
        setTransactions(savedTransactions);
      }
      
      const savedCats = await EncryptedStorage.getItem(STORAGE_KEYS.CUSTOM_CATEGORIES);
      if (savedCats && Array.isArray(savedCats)) {
        setCustomCategories(savedCats);
      }
    } catch (e) {
      console.error('Failed to load finance data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFinanceData();
  }, [loadFinanceData]);

  const saveTransactions = async (newTransactions: Transaction[]) => {
    setTransactions(newTransactions);
    await EncryptedStorage.setItem(STORAGE_KEYS.TRANSACTIONS, newTransactions);
    SyncService.runSync().catch(e => console.warn('[Sync] Background sync failed:', e));
  };

  const addTransaction = async (form: Omit<Transaction, 'id'>) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newTx: Transaction = {
      ...form,
      id: generateId()
    };
    const updated = [newTx, ...transactions];
    await saveTransactions(updated);
    return newTx;
  };

  const deleteTransaction = async (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    await saveTransactions(updated);
  };

  const addCustomCategory = async (cat: Omit<CustomCategory, 'id'>) => {
    const newCat: CustomCategory = {
      ...cat,
      id: generateId()
    };
    const updated = [...customCategories, newCat];
    setCustomCategories(updated);
    await EncryptedStorage.setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, updated);
    SyncService.runSync().catch(e => console.warn('[Sync] Background sync failed:', e));
    return newCat;
  };

  const deleteCustomCategory = async (id: string) => {
    const updated = customCategories.filter(c => c.id !== id);
    setCustomCategories(updated);
    await EncryptedStorage.setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, updated);
  };

  return {
    transactions,
    customCategories,
    loading,
    addTransaction,
    deleteTransaction,
    addCustomCategory,
    deleteCustomCategory,
    refreshFinance: loadFinanceData
  };
}
