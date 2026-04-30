// Port of web's lib/helpers.js for React Native

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function getToday(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getRandomQuote(): string {
  const quotes = [
    '🚀 Satu langkah kecil hari ini, lompatan besar besok.',
    '💪 Konsistensi mengalahkan motivasi.',
    '🎯 Fokus pada progress, bukan performa sempurna.',
    '⚡ Mulai dari yang paling kecil, sekarang.',
    '🔥 Streak-mu adalah bukti disiplinmu.',
    '🌟 Hari ini adalah kesempatan baru.',
    '📈 Progress, bukan perfection.',
    '🧠 Otakmu suka rutinitas. Bangun kebiasaan.',
    '🏆 Champion dibentuk dari kebiasaan harian.',
    '💡 Kerja cerdas + kerja keras = hasil nyata.',
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export const PRIORITY_COLORS: Record<string, string> = {
  P1: '#ef4444',
  P2: '#f59e0b',
  P3: '#3b82f6',
  P4: '#9ca3af',
};

export const PRIORITY_LABELS: Record<string, string> = {
  P1: 'Urgent',
  P2: 'High',
  P3: 'Medium',
  P4: 'Low',
};

export const CATEGORIES = ['Personal', 'Kerja', 'Proyek', 'Belajar', 'Lainnya'];

export function greetingTime(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Selamat Pagi';
  if (hour < 17) return 'Selamat Siang';
  if (hour < 20) return 'Selamat Sore';
  return 'Selamat Malam';
}

export function parseRupiahInput(value: string): string {
  if (!value) return '';
  return value.replace(/[^0-9]/g, '');
}

export function formatRupiahInput(value: string): string {
  const parsed = parseRupiahInput(value);
  if (!parsed) return '';
  return parsed.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
