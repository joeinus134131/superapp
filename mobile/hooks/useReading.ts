import { DeviceEventEmitter } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { getData, setData, STORAGE_KEYS } from '../lib/storage';
import { generateId, normalizeBook } from '../lib/helpers';
import { addXP } from '../lib/gamification';
import * as Haptics from 'expo-haptics';

export type ReadingStatus = 'reading' | 'completed' | 'want_to_read' | 'paused';

export interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  status: ReadingStatus;
  genre: string;
  rating: number;
  notes: string;
  startDate: string;
  finishDate: string;
  createdAt: string;
  pagesRead?: number;
}

export function useReading() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [xpToast, setXpToast] = useState<string | null>(null);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getData(STORAGE_KEYS.READING);
      const list = Array.isArray(data) ? data.map(normalizeBook) : [];
      setBooks(list);
    } catch (e) {
      console.error('Failed to load books:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
    const subscription = DeviceEventEmitter.addListener('whenya:data-synced', loadBooks);
    return () => subscription.remove();
  }, [loadBooks]);

  const saveBooks = async (newBooks: Book[]) => {
    const normalized = newBooks.map(normalizeBook);
    setBooks(normalized);
    await setData(STORAGE_KEYS.READING, normalized);
  };

  const addBook = async (form: Omit<Book, 'id' | 'createdAt'>) => {
    const newBook: Book = {
      ...form,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...books, newBook];
    await saveBooks(updated);
    
    if (newBook.status === 'completed') {
      const result = await addXP('BOOK_COMPLETE');
      setXpToast(`+${result.xpGained} XP!`);
      setTimeout(() => setXpToast(null), 2500);
    }
    return newBook;
  };

  const updateBook = async (id: string, updates: Partial<Book>) => {
    const oldBook = books.find(b => b.id === id);
    const updated = books.map(b => b.id === id ? { ...b, ...updates } : b);
    await saveBooks(updated);

    if (oldBook && oldBook.status !== 'completed' && updates.status === 'completed') {
      const result = await addXP('BOOK_COMPLETE');
      setXpToast(`+${result.xpGained} XP!`);
      setTimeout(() => setXpToast(null), 2500);
    }
  };

  const deleteBook = async (id: string) => {
    const updated = books.filter(b => b.id !== id);
    await saveBooks(updated);
  };

  const updateProgress = async (bookId: string, delta: number) => {
    const rawBook = books.find(b => b.id === bookId);
    if (!rawBook) return;
    const book = normalizeBook(rawBook);

    const totalPages = Math.max(0, Number(book.totalPages) || 0);
    const current = Math.max(0, Number(book.currentPage) || 0);
    const newPage = totalPages > 0 ? Math.min(totalPages, Math.max(0, current + delta)) : Math.max(0, current + delta);
    const wasCompleted = book.status === 'completed';
    const nowCompleted = totalPages > 0 && newPage >= totalPages;
    
    const updates: Partial<Book> = {
      currentPage: newPage,
      pagesRead: newPage,
      totalPages,
      status: nowCompleted ? 'completed' : (book.status === 'want_to_read' ? 'reading' : book.status) as ReadingStatus
    };

    await updateBook(bookId, updates);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return {
    books,
    loading,
    xpToast,
    addBook,
    updateBook,
    deleteBook,
    updateProgress,
    refreshBooks: loadBooks
  };
}
