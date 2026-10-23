export interface SyncStatus {
  state: 'success' | 'conflict' | 'error';
  at: string;
  error?: string;
  modules?: string[];
  uploaded?: number;
  downloaded?: number;
}
export interface SyncResult { uploaded: number; downloaded: number; paused?: boolean }
export interface SyncOptions { automatic?: boolean; dirty?: boolean; expectedOwner?: string; resolutions?: Record<string, any> }
// Serialize manual and automatic calls. A resolution must never be swallowed by
// an in-flight background call; unresolved conflicts pause automatic retries only.
export function createSyncCoordinator(deps: {
  identity: () => Promise<string | null>;
  perform: (options: SyncOptions) => Promise<SyncResult>;
  readStatus: (owner: string) => Promise<SyncStatus | null>;
  writeStatus: (owner: string, status: SyncStatus) => Promise<void>;
  onStatus: (status: SyncStatus) => void;
  onDownloaded: () => void;
}) {
  let queue = Promise.resolve();
  let automatic: Promise<SyncResult> | undefined;
  let automaticStarted = false;
  async function execute(options: SyncOptions) {
    const owner = await deps.identity();
    if (!owner) {
      if (options.automatic) return { uploaded: 0, downloaded: 0, paused: true };
      throw new Error('Profil aktif tidak ditemukan.');
    }
    if (options.expectedOwner && options.expectedOwner !== owner) throw new Error('Akun berubah saat meninjau konflik. Periksa ulang pilihan Anda.');
    const prior = await deps.readStatus(owner);
    if (options.automatic && prior?.state === 'conflict') return { uploaded: 0, downloaded: 0, paused: true };
    try {
      const result = await deps.perform(options);
      if (await deps.identity() !== owner) throw new Error('Akun berubah saat sinkronisasi. Coba kembali.');
      const status: SyncStatus = { state: 'success', at: new Date().toISOString(), uploaded: result.uploaded, downloaded: result.downloaded };
      await deps.writeStatus(owner, status); deps.onStatus(status);
      if (result.downloaded) deps.onDownloaded();
      return result;
    } catch (error) {
      const conflict = (error as any)?.code === 'SYNC_CONFLICT';
      const status: SyncStatus = {
        state: conflict || prior?.state === 'conflict' ? 'conflict' : 'error', at: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        ...(conflict ? { modules: (error as any).conflicts.map((item: any) => item.key) } : prior?.modules ? { modules: prior.modules } : {}),
      };
      await deps.writeStatus(owner, status);
      if (await deps.identity() === owner) deps.onStatus(status);
      // Automatic conflict is an actionable paused state, not a failed retry loop.
      if (options.automatic && conflict) return { uploaded: 0, downloaded: 0, paused: true };
      throw error;
    }
  }
  return (options: SyncOptions = {}) => {
    if (options.automatic && automatic && (!options.dirty || !automaticStarted)) return automatic;
    const job = queue.then(() => {
      if (options.automatic && automatic === job) automaticStarted = true;
      return execute(options);
    });
    queue = job.then(() => {}, () => {});
    if (options.automatic) {
      automatic = job; automaticStarted = false;
      const clear = () => { if (automatic === job) { automatic = undefined; automaticStarted = false; } };
      job.then(clear, clear);
    }
    return job;
  };
}
