import {
  generateId,
  formatDate,
  formatDateShort,
  formatTime,
  formatCurrency,
  formatRupiahInput,
  parseRupiahInput,
  getToday,
  getDaysInMonth,
  getFirstDayOfMonth,
  getDaysBetween,
  isToday,
  getRandomQuote,
  MOTIVATIONAL_QUOTES,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  MOOD_EMOJIS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from '../lib/helpers';

describe('Helpers', () => {
  describe('generateId', () => {
    test('returns a string', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
    });

    test('generates unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('formatDate', () => {
    test('formats a valid date string', () => {
      const result = formatDate('2025-01-15');
      expect(result).toContain('2025');
      expect(result).toContain('15');
    });

    test('formats a Date object', () => {
      const result = formatDate(new Date(2025, 0, 15));
      expect(result).toContain('2025');
    });
  });

  describe('formatDateShort', () => {
    test('returns short date format', () => {
      const result = formatDateShort('2025-06-20');
      expect(result).toMatch(/\d{1,2}/);
    });
  });

  describe('formatTime', () => {
    test('returns time format with hour and minute', () => {
      const result = formatTime('2025-01-15T14:30:00');
      // Indonesian locale may use '.' or ':' as separator
      expect(result).toMatch(/\d{2}[.:]\d{2}/);
    });
  });

  describe('formatCurrency', () => {
    test('formats IDR currency', () => {
      const result = formatCurrency(15000);
      expect(result).toContain('15');
      expect(result).toContain('000');
    });

    test('formats zero', () => {
      const result = formatCurrency(0);
      expect(result).toContain('0');
    });

    test('formats large numbers', () => {
      const result = formatCurrency(1000000);
      expect(result).toContain('1');
    });
  });

  describe('formatRupiahInput', () => {
    test('formats number with dots', () => {
      expect(formatRupiahInput('1000000')).toBe('1.000.000');
    });

    test('handles empty input', () => {
      expect(formatRupiahInput('')).toBe('');
      expect(formatRupiahInput(null)).toBe('');
    });

    test('strips non-numeric characters', () => {
      expect(formatRupiahInput('abc123def')).toBe('123');
    });

    test('handles single digit', () => {
      expect(formatRupiahInput('5')).toBe('5');
    });
  });

  describe('parseRupiahInput', () => {
    test('removes dots', () => {
      expect(parseRupiahInput('1.000.000')).toBe('1000000');
    });

    test('handles empty input', () => {
      expect(parseRupiahInput('')).toBe('');
      expect(parseRupiahInput(null)).toBe('');
    });
  });

  describe('getToday', () => {
    test('returns YYYY-MM-DD format', () => {
      const today = getToday();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('returns current date', () => {
      const today = getToday();
      const now = new Date();
      expect(today).toBe(
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      );
    });
  });

  describe('getDaysInMonth', () => {
    test('returns correct days for January', () => {
      expect(getDaysInMonth(2025, 0)).toBe(31);
    });

    test('returns correct days for February in leap year', () => {
      expect(getDaysInMonth(2024, 1)).toBe(29);
    });

    test('returns correct days for February in non-leap year', () => {
      expect(getDaysInMonth(2025, 1)).toBe(28);
    });

    test('returns correct days for April', () => {
      expect(getDaysInMonth(2025, 3)).toBe(30);
    });
  });

  describe('getFirstDayOfMonth', () => {
    test('January 1 2025 is Wednesday (3)', () => {
      expect(getFirstDayOfMonth(2025, 0)).toBe(3);
    });

    test('March 1 2025 is Saturday (6)', () => {
      expect(getFirstDayOfMonth(2025, 2)).toBe(6);
    });
  });

  describe('getDaysBetween', () => {
    test('same date returns 0', () => {
      expect(getDaysBetween('2025-01-01', '2025-01-01')).toBe(0);
    });

    test('one day apart', () => {
      expect(getDaysBetween('2025-01-01', '2025-01-02')).toBe(1);
    });

    test('order does not matter', () => {
      expect(getDaysBetween('2025-01-05', '2025-01-01')).toBe(4);
    });

    test('across months', () => {
      expect(getDaysBetween('2025-01-30', '2025-02-02')).toBe(3);
    });
  });

  describe('isToday', () => {
    test('returns true for today', () => {
      expect(isToday(getToday())).toBe(true);
    });

    test('returns false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      expect(isToday(yesterdayStr)).toBe(false);
    });
  });

  describe('getRandomQuote', () => {
    test('returns an object with text and author', () => {
      const quote = getRandomQuote();
      expect(quote).toHaveProperty('text');
      expect(quote).toHaveProperty('author');
      expect(typeof quote.text).toBe('string');
      expect(typeof quote.author).toBe('string');
    });

    test('returns a quote from the MOTIVATIONAL_QUOTES list', () => {
      const quote = getRandomQuote();
      expect(MOTIVATIONAL_QUOTES).toContainEqual(quote);
    });
  });

  describe('constants', () => {
    test('PRIORITY_COLORS has all priorities', () => {
      expect(PRIORITY_COLORS).toHaveProperty('P1');
      expect(PRIORITY_COLORS).toHaveProperty('P2');
      expect(PRIORITY_COLORS).toHaveProperty('P3');
      expect(PRIORITY_COLORS).toHaveProperty('P4');
    });

    test('PRIORITY_LABELS has all labels', () => {
      expect(PRIORITY_LABELS.P1).toBe('Urgent');
      expect(PRIORITY_LABELS.P4).toBe('Low');
    });

    test('MOOD_EMOJIS has all moods', () => {
      expect(Object.keys(MOOD_EMOJIS)).toHaveLength(5);
      expect(MOOD_EMOJIS.great).toBe('😄');
    });

    test('EXPENSE_CATEGORIES is an array with entries', () => {
      expect(Array.isArray(EXPENSE_CATEGORIES)).toBe(true);
      expect(EXPENSE_CATEGORIES.length).toBeGreaterThan(0);
      EXPENSE_CATEGORIES.forEach(cat => {
        expect(cat).toHaveProperty('id');
        expect(cat).toHaveProperty('label');
        expect(cat).toHaveProperty('emoji');
        expect(cat).toHaveProperty('color');
      });
    });

    test('INCOME_CATEGORIES is an array with entries', () => {
      expect(Array.isArray(INCOME_CATEGORIES)).toBe(true);
      expect(INCOME_CATEGORIES.length).toBeGreaterThan(0);
    });

    test('MOTIVATIONAL_QUOTES has at least 10 quotes', () => {
      expect(MOTIVATIONAL_QUOTES.length).toBeGreaterThanOrEqual(10);
    });
  });
});
