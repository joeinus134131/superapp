import { DeviceEventEmitter } from 'react-native';
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
  const [error, setError] = useState(false);

  const loadFinanceData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const savedTransactions = await EncryptedStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      setTransactions(Array.isArray(savedTransactions) ? savedTransactions : []);
      
      const savedCats = await EncryptedStorage.getItem(STORAGE_KEYS.CUSTOM_CATEGORIES);
      setCustomCategories(Array.isArray(savedCats) ? savedCats : []);
    } catch (e) {
      setError(true);
      console.error('Failed to load finance data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFinanceData();
    const subscription = DeviceEventEmitter.addListener('whenya:data-synced', loadFinanceData);
    return () => subscription.remove();
  }, [loadFinanceData]);

  const saveTransactions = async (newTransactions: Transaction[]) => {
    await EncryptedStorage.setItem(STORAGE_KEYS.TRANSACTIONS, newTransactions);
    setTransactions(newTransactions);
    DeviceEventEmitter.emit('whenya:finance-updated');
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
    error,
    addTransaction,
    deleteTransaction,
    addCustomCategory,
    deleteCustomCategory,
    refreshFinance: loadFinanceData
  };
}
