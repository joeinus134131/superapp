/** User-authenticated canonical finance transport, shared by mobile and tests.
 * No integration/delegation secret or local optimistic ledger mutation.
 */
export type FinanceSession = { userId: string; token: string };
export type Entity = { id: string; display_name: string; kind: string; role: 'owner' | 'editor' | 'viewer' };
export type Account = { id: string; display_name: string; kind: string; currency: string };
export type Balance = { account_id: string; currency: string; debit_less_credit: string };
export type Source = { id: string; state: string; source_kind: string; text: string; revision: number | null; review_state: string | null };
export type ResearchJob = { schema_version: '1'; job_id: string; state: string; report_available?: boolean; data_as_of?: string; failure_code?: string };
export type ResearchReport = { data_as_of: string; baseline: string; engine_version: string; rl_executed: boolean; sources: Array<{provider: string; synthetic: boolean; rows: number}>; limitations: string[]; screening: Array<{ticker: string; score: number | null; confidence: number | null; label: string}>; laya: {state: string}; input: {as_of: string} };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function id(value: string) { if (!uuid.test(value)) throw new Error('UUID tidak valid.'); return value; }
export class FinanceAPIError extends Error { status: number; code: string; constructor(status: number, code: string) { super(`${code} (HTTP ${status})`); this.status = status; this.code = code; } }
export function createFinanceClient(config: { baseURL: string; userId: string; session: () => Promise<FinanceSession | null>; fetcher?: typeof fetch }) {
  const fetcher = config.fetcher || fetch;
  async function request<T>(path: string, options: { signal?: AbortSignal; body?: unknown; key?: string } = {}): Promise<T> {
    const session = await config.session();
    if (!session || session.userId !== config.userId) throw new Error('Sesi berubah. Masuk kembali sebelum membuka buku ini.');
    const response = await fetcher(`${config.baseURL.replace(/\/$/, '')}/finance${path}`, { method: options.body ? 'POST' : 'GET', signal: options.signal, headers: { Authorization: `Bearer ${session.token}`, ...(options.body ? { 'Content-Type': 'application/json', 'Idempotency-Key': options.key || '' } : {}) }, ...(options.body ? { body: JSON.stringify(options.body) } : {}) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new FinanceAPIError(response.status, data.error?.code || 'finance_unavailable');
    // An account switch during a request must not render the previous user's data.
    const current = await config.session();
    if (!current || current.userId !== config.userId) throw new Error('Sesi berubah; hasil tidak ditampilkan.');
    return data as T;
  }
  const entityPath = (entity: string) => `/entities/${id(entity)}`;
  return {
    createEntity: (body: {id: string; kind: string; display_name: string; base_currency: string}, signal?: AbortSignal) => request<{entity_id: string}>('/entities', {body, signal}),
    createAccount: (entity: string, body: {id: string; kind: string; display_name: string; currency: string}, signal?: AbortSignal) => request<{account_id: string}>(`${entityPath(entity)}/accounts`, {body, signal}),
    entities: (signal?: AbortSignal) => request<{entities: Entity[]}>('/entities', {signal}),
    accounts: (entity: string, signal?: AbortSignal) => request<{accounts: Account[]}>(`${entityPath(entity)}/accounts`, {signal}),
    balances: (entity: string, signal?: AbortSignal) => request<{balances: Balance[]}>(`${entityPath(entity)}/balances`, {signal}),
    sources: (entity: string, signal?: AbortSignal) => request<{imports: Source[]}>(`${entityPath(entity)}/imports`, {signal}),
    review: (entity: string, source: string, body: unknown, key: string, signal?: AbortSignal) => request<{review_state: string; revision: number; journal_id: string}>(`${entityPath(entity)}/imports/${id(source)}/review`, {body, key, signal}),
    submitResearch: (entity: string, body: unknown, key: string, signal?: AbortSignal) => request<ResearchJob>(`${entityPath(entity)}/research/jobs`, {body, key, signal}),
    researchStatus: (entity: string, job: string, signal?: AbortSignal) => request<ResearchJob>(`${entityPath(entity)}/research/jobs/${id(job)}`, {signal}),
    researchReport: (entity: string, job: string, signal?: AbortSignal) => request<ResearchReport>(`${entityPath(entity)}/research/jobs/${id(job)}/report`, {signal}),
  };
}
