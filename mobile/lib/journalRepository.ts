import { EncryptedStorage } from './secureStorage';
import { STORAGE_KEYS, getData } from './storage';
import type { JournalEntry } from '../hooks/useJournal';
export async function readJournalEntries(): Promise<JournalEntry[]> {
  const data = await EncryptedStorage.getItem(STORAGE_KEYS.JOURNAL);
  if (data !== null && !Array.isArray(data)) throw new Error('Invalid journal data');
  return data || [];
}
let queue = Promise.resolve();
export function updateJournalEntries(change: (entries: JournalEntry[]) => JournalEntry[]) {
  const job = queue.then(async () => {
    const owner = await getData(STORAGE_KEYS.CURRENT_USER, true);
    const entries = change(await readJournalEntries());
    await EncryptedStorage.setItem(STORAGE_KEYS.JOURNAL, entries, { owner });
    return entries;
  });
  queue = job.then(() => {}, () => {}); return job;
}
