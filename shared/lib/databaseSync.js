// Platform-neutral, account-scoped synchronization of module snapshots.
// A module is the conflict boundary: concurrent edits require explicit resolution.
export const isSyncModule = key => /^superapp_/.test(key) && !/superapp_(current_user|users|session|cloud_session|sync_id|database_|legacy_data_owner|master_encryption_key|task_view_mode)/.test(key);
const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);

export function createDatabaseSync({ read, write, list, request, digest, uuid, identity, beforeResolve = undefined }) {
  let running;
  const sync = async ({ resolutions = {} } = {}) => {
    const owner = await identity();
    if (!owner) throw new Error('Profil aktif tidak ditemukan.');
    const assertOwner = async () => {
      if (await identity() !== owner) throw new Error('Akun berubah saat sinkronisasi. Coba kembali.');
    };
    const metadataKey = `${owner}_whenya_sync_baseline_v1`;
    const baseline = await read(metadataKey) || {};
    const remote = await request('/storage');
    if (!Array.isArray(remote.items)) throw new Error('Respons penyimpanan cloud tidak valid.');
    const cloud = new Map(remote.items.filter(item => isSyncModule(item.storage_key)).map(item => [item.storage_key, item]));
    const prefix = `${owner}_`;
    const localKeys = (await list()).filter(key => key.startsWith(prefix) && isSyncModule(key.slice(prefix.length))).map(key => key.slice(prefix.length));
    const keys = new Set([...localKeys, ...cloud.keys(), ...Object.keys(baseline)]);
    const outgoing = [], incoming = [], next = {}, conflicts = [], observed = new Map(), resolved = [];
    for (const key of keys) {
      const value = await read(prefix + key);
      const hash = await digest(canonical(value));
      observed.set(key, hash);
      const stored = cloud.get(key);
      const remoteHash = stored ? await digest(canonical(stored.payload)) : null;
      const prior = baseline[key];
      const localChanged = prior ? hash !== prior.hash : value !== null;
      const remoteChanged = stored && (!prior || remoteHash !== prior.hash);
      if (localChanged && remoteChanged && hash !== remoteHash) {
        const resolution = resolutions[key];
        const reviewed = resolution?.localHash === hash && resolution?.revision === stored.revision && resolution?.checksum === stored.checksum;
        if (reviewed && ['local', 'cloud'].includes(resolution.choice)) resolved.push({ key, local: value, cloud: stored.payload, choice: resolution.choice });
        if (reviewed && resolution.choice === 'cloud') {
          incoming.push([prefix + key, stored.payload]);
          next[key] = { hash: remoteHash };
          continue;
        }
        if (!reviewed || resolution.choice !== 'local') {
          conflicts.push({ key, local: value, cloud: stored.payload, localHash: hash, revision: stored.revision, checksum: stored.checksum });
          continue;
        }
      }
      if ((localChanged || (!stored && value !== null)) && hash !== remoteHash) {
        const payload = value;
        outgoing.push({ storage_key: key, payload, checksum: await digest(JSON.stringify(payload)),
          revision: (stored?.revision || 0) + 1, schema_version: 1, client_updated_at: new Date().toISOString() });
      } else if (stored && hash !== remoteHash) {
        incoming.push([prefix + key, stored.payload]);
      }
      next[key] = { hash: stored && !localChanged ? remoteHash : hash };
    }
    if (conflicts.length) throw Object.assign(new Error(`Konflik data: ${conflicts.map(item => item.key).join(', ')}. Data lokal dipertahankan; pilih versi yang benar sebelum mencoba lagi.`), { code: 'SYNC_CONFLICT', conflicts });
    await assertOwner();
    if (resolved.length && beforeResolve) await beforeResolve({ owner, conflicts: resolved });
    await assertOwner();
    if (outgoing.length) {
      await request('/storage/migrations', { idempotency_key: uuid(), items: outgoing });
      const verified = await request('/storage');
      const stored = new Map((verified.items || []).map(item => [item.storage_key, item]));
      if (outgoing.some(item => stored.get(item.storage_key)?.checksum !== item.checksum)) throw new Error('Verifikasi cloud gagal. Data lokal dipertahankan.');
    }
    await assertOwner();
    for (const [key] of incoming) {
      const suffix = key.slice(prefix.length);
      if (await digest(canonical(await read(key))) !== observed.get(suffix)) throw new Error('Data lokal berubah saat sinkronisasi. Coba kembali.');
    }
    for (const [key, value] of incoming) await write(key, value);
    await write(metadataKey, next);
    return { uploaded: outgoing.length, downloaded: incoming.length };
  };
  return (options = {}) => {
    if (!running) running = sync(options).finally(() => { running = null; });
    return running;
  };
}
