export type Money = { amount: string; currency: string };
export type ImportState = 'received' | 'processing' | 'needs_review' | 'completed' | 'failed';
export type ImportResult = { schema_version: '1'; import_id: string; state: ImportState; duplicate: boolean };
export type JournalLine = { account_id: string; side: 'debit' | 'credit'; money: Money };
export type FinanceCache<T> = { entity_id: string; revision: number; checksum: string; confirmed: boolean; data: T };
/** Never equate a local optimistic/cache write with a posted journal. */
export function mergeConfirmedCache<T>(current: FinanceCache<T> | null, incoming: FinanceCache<T>): FinanceCache<T> {
  if (!incoming.confirmed) throw new Error('Server confirmation required');
  if (!current) return incoming;
  if (current.entity_id !== incoming.entity_id) throw new Error('Entity scope mismatch');
  if (incoming.revision < current.revision) return current;
  if (incoming.revision === current.revision && incoming.checksum !== current.checksum) throw new Error('Revision conflict');
  return incoming;
}
/** Legacy numbers are evidence to review, never automatically posted. */
export function stageLegacyRecord(sourceKey: string, legacyId: string, payload: unknown) {
  if (!sourceKey || !legacyId) throw new Error('Stable legacy provenance required');
  return { source_key: sourceKey, legacy_id: legacyId, payload, state: 'needs_review' as const, journal_id: null };
}
