import { createSyncCoordinator } from '../lib/syncCoordinator';
const conflict = () => Object.assign(new Error('Konflik data'), { code: 'SYNC_CONFLICT', conflicts: [{ key: 'superapp_tasks' }] });
function setup(perform = jest.fn(async () => ({ uploaded: 1, downloaded: 0 }))) {
  let owner = 'one'; const statuses = new Map();
  const deps = { identity: async () => owner, perform, readStatus: async id => statuses.get(id) || null,
    writeStatus: jest.fn(async (id, value) => { statuses.set(id, value); }), onStatus: jest.fn(), onDownloaded: jest.fn() };
  return { deps, statuses, sync: createSyncCoordinator(deps), setOwner: value => { owner = value; } };
}
test('automatic conflict pauses future automatic calls without discarding data or retrying', async () => {
  const perform = jest.fn(async () => { throw conflict(); }); const c = setup(perform);
  await expect(c.sync({ automatic: true })).resolves.toMatchObject({ paused: true });
  await expect(c.sync({ automatic: true })).resolves.toMatchObject({ paused: true });
  expect(perform).toHaveBeenCalledTimes(1); expect(c.statuses.get('one').state).toBe('conflict'); expect(c.deps.onStatus).toHaveBeenCalledTimes(1);
});
test('pause survives coordinator recreation, manual review still retrieves conflicts', async () => {
  const c = setup(jest.fn(async () => { throw conflict(); })); await c.sync({ automatic: true });
  const recreated = createSyncCoordinator(c.deps);
  await expect(recreated({ automatic: true })).resolves.toMatchObject({ paused: true });
  await expect(recreated()).rejects.toMatchObject({ code: 'SYNC_CONFLICT' });
  expect(c.deps.perform).toHaveBeenCalledTimes(2);
});
test('manual resolution waits behind automatic job instead of losing its choices', async () => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  const perform = jest.fn(async options => { if (!options.resolutions) { await gate; throw conflict(); } return { uploaded: 0, downloaded: 1 }; });
  const c = setup(perform);
  const background = c.sync({ automatic: true });
  const resolutions = { superapp_tasks: { choice: 'cloud' } };
  const manual = c.sync({ resolutions }); release();
  await background; await expect(manual).resolves.toEqual({ uploaded: 0, downloaded: 1 });
  expect(perform).toHaveBeenLastCalledWith({ resolutions }); expect(c.statuses.get('one').state).toBe('success'); expect(c.deps.onDownloaded).toHaveBeenCalledTimes(1);
});
test('automatic callers coalesce into one job', async () => {
  const c = setup(); await Promise.all([c.sync({ automatic: true }), c.sync({ automatic: true }), c.sync({ automatic: true })]);
  expect(c.deps.perform).toHaveBeenCalledTimes(1);
});
test('a paused account cannot pause a different account', async () => {
  const c = setup(); c.statuses.set('one', { state: 'conflict' }); c.setOwner('two');
  await expect(c.sync({ automatic: true })).resolves.toEqual({ uploaded: 1, downloaded: 0 }); expect(c.deps.perform).toHaveBeenCalledTimes(1);
});
test('account change during sync prevents successful status or downloaded events', async () => {
  const c = setup(); c.deps.perform.mockImplementation(async () => { c.setOwner('two'); return { uploaded: 0, downloaded: 1 }; });
  await expect(c.sync()).rejects.toThrow('Akun berubah'); expect(c.deps.onDownloaded).not.toHaveBeenCalled(); expect(c.deps.onStatus).not.toHaveBeenCalled();
});
test('ordinary transport failure remains retryable and prior conflict pause survives manual network failure', async () => {
  const c = setup(jest.fn(async () => { throw new Error('offline'); }));
  await expect(c.sync({ automatic: true })).rejects.toThrow('offline');
  expect(c.statuses.get('one').state).toBe('error');
  await expect(c.sync({ automatic: true })).rejects.toThrow('offline'); expect(c.deps.perform).toHaveBeenCalledTimes(2);
  c.statuses.set('one', { state: 'conflict', modules: ['superapp_tasks'] });
  await expect(c.sync()).rejects.toThrow('offline'); expect(c.statuses.get('one')).toMatchObject({ state: 'conflict', modules: ['superapp_tasks'] });
});
test('stale review from another account is rejected before requests', async () => {
  const c = setup(); c.setOwner('two');
  await expect(c.sync({ expectedOwner: 'one', resolutions: {} })).rejects.toThrow('Akun berubah'); expect(c.deps.perform).not.toHaveBeenCalled();
});
test('automatic call without a profile makes no remote request', async () => {
  const c = setup(); c.setOwner(null);
  await expect(c.sync({ automatic: true })).resolves.toMatchObject({ paused: true }); expect(c.deps.perform).not.toHaveBeenCalled();
});

test('a local save while automatic sync is running queues one follow-up for the latest data', async () => {
  let release, started; const gate = new Promise(resolve => { release = resolve; }); const ready = new Promise(resolve => { started = resolve; });
  let local = 'initial'; const observed = [];
  const c = setup(jest.fn(async () => { observed.push(local); if (observed.length === 1) { started(); await gate; } return { uploaded: 1, downloaded: 0 }; }));
  const first = c.sync({ automatic: true }); await ready;
  local = 'latest'; const followup = c.sync({ automatic: true, dirty: true }); const duplicate = c.sync({ automatic: true, dirty: true }); release();
  await Promise.all([first, followup, duplicate]); expect(observed).toEqual(['initial', 'latest']);
});
