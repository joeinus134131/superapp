import { getData, STORAGE_KEYS } from './storage';
import { EncryptedStorage } from './secureStorage';
import { readJournalEntries } from './journalRepository';
export async function readDashboardSources() {
  const sources = {
    goals: () => getData(STORAGE_KEYS.GOALS, true),
    profile: () => getData(STORAGE_KEYS.USER_PROFILE, true),
    pomodoro: () => getData(STORAGE_KEYS.POMODORO, true),
    health: () => getData(STORAGE_KEYS.HEALTH, true),
    journal: readJournalEntries,
    transactions: () => EncryptedStorage.getItem(STORAGE_KEYS.TRANSACTIONS),
  };
  const keys = Object.keys(sources) as (keyof typeof sources)[];
  const results = await Promise.allSettled(keys.map(key => sources[key]()));
  const values: Partial<Record<keyof typeof sources, any>> = {}, errors: string[] = [];
  results.forEach((result, index) => {
    const key = keys[index];
    if (result.status === 'fulfilled') {
      const value = result.value;
      if (['goals', 'journal', 'transactions'].includes(key) && value !== null && !Array.isArray(value)) errors.push(key);
      else values[key] = value;
    } else errors.push(key);
  });
  return { values, errors };
}
