import { translateText, resolveTranslation } from '../lib/translations';
import { TEXT_CATALOG } from '../lib/textCatalog';
import { DICTIONARIES } from '../lib/dictionaries';
import { formatDate, formatCurrency } from '../lib/helpers';

describe('multilingual copy', () => {
  test('uses English by default and supports switching back to Indonesian', () => {
    expect(translateText('Tugas')).toBe('Tasks');
    expect(translateText('Tasks', 'id')).toBe('Tugas');
    expect(translateText('Tugas', 'id')).toBe('Tugas');
  });

  test('preserves unknown text and interpolated user content exactly', () => {
    expect(translateText('My own journal title')).toBe('My own journal title');
    expect(translateText('Tugas "{0}" ditambahkan', 'en', ['$& {1} Keuangan']))
      .toBe('Task "$& {1} Keuangan" added');
  });

  test('translates previously generated activity messages in either direction', () => {
    expect(translateText('Streak 12 Hari!', 'en')).toBe('12 Day Streak!');
    expect(translateText('12 Day Streak!', 'id')).toBe('Streak 12 Hari!');
    expect(translateText('Token tidak cukup. Butuh 4 token, saldomu 2.', 'en'))
      .toBe('Not enough tokens. You need 4 tokens and have 2.');
  });

  test('retains numeric placeholder parity for all catalog translations', () => {
    for (const [id, en] of Object.entries(TEXT_CATALOG)) {
      expect((id.match(/\{\d+\}/g) || []).sort()).toEqual((en.match(/\{\d+\}/g) || []).sort());
    }
  });

  test('falls back to English for missing, nested and unsupported locale keys', () => {
    const dictionaries = { en: { nested: { title: 'Title', days: ['Sunday'] } }, id: {} };
    expect(resolveTranslation(dictionaries, 'id', 'nested.title')).toBe('Title');
    expect(resolveTranslation(dictionaries, 'fr', 'nested.days')).toEqual(['Sunday']);
    expect(resolveTranslation(dictionaries, 'id', 'missing.deep.key')).toBe('missing.deep.key');
  });

  test('both dictionaries contain all the same nested paths and types', () => {
    function shape(value) {
      return typeof value === 'object' && value !== null
        ? Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, shape(entry)]))
        : typeof value;
    }
    expect(shape(DICTIONARIES.en)).toEqual(shape(DICTIONARIES.id));
    expect(resolveTranslation(DICTIONARIES, 'en', 'gamification.level1')).toBe('Chapter 1: The Awakening');
    expect(resolveTranslation(DICTIONARIES, 'id', 'gamification.level1')).toBe('Bab 1: Kebangkitan');
  });

  test('formats dates in the selected language while retaining IDR currency', () => {
    expect(formatDate('2026-08-15')).toContain('Aug');
    expect(formatDate('2026-08-15', 'id')).toContain('Agu');
    expect(formatCurrency(15000, 'en')).toContain('IDR');
    expect(formatCurrency(15000, 'id')).toContain('Rp');
  });
});
