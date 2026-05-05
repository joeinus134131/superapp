import { useState, useCallback, useEffect } from 'react';
import { getData, setData, STORAGE_KEYS } from '../lib/storage';
import { generateId } from '../lib/helpers';
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
}

export function useReading() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [xpToast, setXpToast] = useState<string | null>(null);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getData(STORAGE_KEYS.READING);
      if (data && Array.isArray(data)) {
        setBooks(data);
      }
    } catch (e) {
      console.error('Failed to load books:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const saveBooks = async (newBooks: Book[]) => {
    setBooks(newBooks);
    await setData(STORAGE_KEYS.READING, newBooks);
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
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    const newPage = Math.min(book.totalPages, Math.max(0, book.currentPage + delta));
    const wasCompleted = book.status === 'completed';
    const nowCompleted = book.totalPages > 0 && newPage >= book.totalPages;
    
    const updates: Partial<Book> = {
      currentPage: newPage,
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
