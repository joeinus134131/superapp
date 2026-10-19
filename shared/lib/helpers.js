// Utility helpers

export function generateId() {
  // Gunakan Web Crypto API yang sangat aman (standar industri & blockchain-grade cryptography)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID(); // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  }
  
  // Fallback kriptografi (menggunakan entropy murni jika randomUUID tidak tersedia)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return String(1e7).replace(/[018]/g, c =>
      (Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16)
    );
  }
  
  // Fallback terakhir
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function formatDate(date, language = 'en') {
  return new Date(date).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateShort(date, language = 'en') {
  return new Date(date).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(date, language = 'en') {
  return new Date(date).toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount, language = 'en') {
  return new Intl.NumberFormat(language === 'id' ? 'id-ID' : 'en-US', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

// Format number with dots for input (e.g. 1.000.000)
export function formatRupiahInput(value) {
  if (!value) return '';
  const numberString = value.toString().replace(/[^0-9]/g, '');
  return numberString.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Strip dots for saving
export function parseRupiahInput(value) {
  if (!value) return '';
  return value.toString().replace(/\./g, '');
}

export function getToday() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export function getDaysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isToday(dateStr) {
  return dateStr === getToday();
}

export const MOTIVATIONAL_QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Your limitation—it's only your imagination.", author: "Unknown" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Dream it. Wish it. Do it.", author: "Unknown" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
];

export function getRandomQuote() {
  const today = new Date();
  const index = (today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate()) % MOTIVATIONAL_QUOTES.length;
  return MOTIVATIONAL_QUOTES[index];
}

export const PRIORITY_COLORS = {
  P1: '#ef4444',
  P2: '#f59e0b',
  P3: '#3b82f6',
  P4: '#6b7280',
};

export const PRIORITY_LABELS = {
  P1: 'Urgent',
  P2: 'High',
  P3: 'Medium',
  P4: 'Low',
};

export const MOOD_EMOJIS = {
  great: '😄',
  good: '🙂',
  okay: '😐',
  bad: '😔',
  terrible: '😢',
};

export const EXPENSE_CATEGORIES = [
  { id: 'food', label: 'Makanan', emoji: '🍔', color: '#ef4444' },
  { id: 'transport', label: 'Transportasi', emoji: '🚗', color: '#f59e0b' },
  { id: 'shopping', label: 'Belanja', emoji: '🛍️', color: '#8b5cf6' },
  { id: 'bills', label: 'Tagihan', emoji: '📄', color: '#3b82f6' },
  { id: 'entertainment', label: 'Hiburan', emoji: '🎮', color: '#ec4899' },
  { id: 'health', label: 'Kesehatan', emoji: '💊', color: '#10b981' },
  { id: 'education', label: 'Edukasi', emoji: '📚', color: '#06b6d4' },
  { id: 'other', label: 'Lainnya', emoji: '📦', color: '#6b7280' },
];

export const INCOME_CATEGORIES = [
  { id: 'salary', label: 'Gaji', emoji: '💼', color: '#10b981' },
  { id: 'freelance', label: 'Freelance', emoji: '💻', color: '#3b82f6' },
  { id: 'investment', label: 'Investasi', emoji: '📈', color: '#8b5cf6' },
  { id: 'other', label: 'Lainnya', emoji: '💰', color: '#6b7280' },
];

/**
 * Safely coercing any value (including double-stringified JSON or wrapped objects) into an Array.
 */
export function ensureArray(val) {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.tasks)) return parsed.tasks;
        if (Array.isArray(parsed.data)) return parsed.data;
        if (Array.isArray(parsed.items)) return parsed.items;
        return Object.values(parsed);
      }
    } catch {
      return [];
    }
  }
  if (typeof val === 'object') {
    if (Array.isArray(val.tasks)) return val.tasks;
    if (Array.isArray(val.data)) return val.data;
    if (Array.isArray(val.items)) return val.items;
    return Object.values(val);
  }
  return [];
}

export function normalizeBook(raw) {
  if (!raw || typeof raw !== 'object') return raw;

  const totalPages = Math.max(0, Number(raw.totalPages) || 0);
  const rawCurrent = raw.currentPage !== undefined && raw.currentPage !== null
    ? raw.currentPage
    : raw.pagesRead;
  const parsedCurrent = Number(rawCurrent);
  const safeCurrent = Number.isFinite(parsedCurrent) ? Math.max(0, parsedCurrent) : 0;
  const currentPage = totalPages > 0 ? Math.min(totalPages, safeCurrent) : safeCurrent;

  let status = 'want_to_read';
  const rawStatus = String(raw.status || '').toLowerCase().trim();
  if (['reading', 'sedang_dibaca', 'sedang'].includes(rawStatus)) {
    status = 'reading';
  } else if (['completed', 'finished', 'selesai', 'done'].includes(rawStatus)) {
    status = 'completed';
  } else if (['paused', 'jeda', 'ditunda'].includes(rawStatus)) {
    status = 'paused';
  } else if (['want_to_read', 'wishlist', 'ingin_dibaca'].includes(rawStatus)) {
    status = 'want_to_read';
  } else if (totalPages > 0 && currentPage >= totalPages) {
    status = 'completed';
  } else if (currentPage > 0) {
    status = 'reading';
  }

  return {
    ...raw,
    id: raw.id || String(Date.now()),
    title: String(raw.title || '').trim(),
    author: String(raw.author || '').trim(),
    totalPages,
    currentPage,
    pagesRead: currentPage,
    status,
    genre: raw.genre || 'gen_other',
    rating: Number(raw.rating) || 0,
    notes: raw.notes || '',
    startDate: raw.startDate || '',
    finishDate: raw.finishDate || '',
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

