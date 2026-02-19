// Utility helpers

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('id-ID', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateShort(date) {
  return new Date(date).toLocaleDateString('id-ID', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(date) {
  return new Date(date).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function getToday() {
  return new Date().toISOString().split('T')[0];
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
  const diff = Math.abs(d2 - d1);
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
