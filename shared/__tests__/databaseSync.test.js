import { createHash } from 'node:crypto';
import { createDatabaseSync, isSyncModule } from '../lib/databaseSync';
import { prepareRestore } from '../lib/backup';

const digest = async text => createHash('sha256').update(text).digest('hex');
function server() {
  const items = new Map();
  return { items, request: jest.fn(async (path, body) => {
    if (!body) return { items: [...items.values()] };
    for (const item of body.items) {
      const prior = items.get(item.storage_key);
      if (prior && prior.revision >= item.revision && prior.checksum !== item.checksum) throw new Error('409 conflict');
      items.set(item.storage_key, item);
    }
    return {};
  }) };
}
function client(remote, initial = {}) {
  const values = new Map(Object.entries(initial));
  const options = {
    identity: async () => 'active',
    read: async key => values.has(key) ? values.get(key) : null,
    write: async (key, value) => { values.set(key, value); },
    list: async () => [...values.keys()],
    request: remote.request, digest, uuid: () => 'request-id',
  };
  return { values, options, sync: createDatabaseSync(options) };
}

test('restore remaps legacy identity, excludes sessions, rejects duplicate canonical keys', () => {
  const backup = { version: 1, userId: 'old', data: {
    old_superapp_tasks: [{ id: 'task' }], superapp_current_user: 'old',
    superapp_users: [{ password: 'private' }], superapp_session_token: 'secret',
    old_superapp_cloud_session: { access_token: 'private' }, other_superapp_tasks: ['foreign'],
  } };
  expect(prepareRestore(backup, 'active')).toEqual([['active_superapp_tasks', '[{"id":"task"}]']]);
  backup.data['"old"_superapp_tasks'] = [];
  expect(() => prepareRestore(backup, 'active')).toThrow('duplikat');
});

test('two clients upload, pull, edit, delete, and repeat without duplicate records', async () => {
  const remote = server();
  const web = client(remote, { active_superapp_tasks: [{ id: 'one' }] });
  const mobile = client(remote);
  expect(await web.sync()).toEqual({ uploaded: 1, downloaded: 0 });
  expect(await mobile.sync()).toEqual({ uploaded: 0, downloaded: 1 });
  expect(mobile.values.get('active_superapp_tasks')).toEqual([{ id: 'one' }]);
  mobile.values.set('active_superapp_tasks', [{ id: 'one', title: 'edited' }]);
  await mobile.sync();
  await web.sync();
  expect(web.values.get('active_superapp_tasks')).toEqual([{ id: 'one', title: 'edited' }]);
  web.values.delete('active_superapp_tasks');
  await web.sync();
  await mobile.sync();
  expect(mobile.values.get('active_superapp_tasks')).toBeNull();
  expect(await mobile.sync()).toEqual({ uploaded: 0, downloaded: 0 });
  expect(remote.items.size).toBe(1);
});

test('concurrent edits preserve local data and cloud data', async () => {
  const remote = server();
  const a = client(remote, { active_superapp_tasks: [1] });
  const b = client(remote);
  await a.sync(); await b.sync();
  a.values.set('active_superapp_tasks', [2]);
  b.values.set('active_superapp_tasks', [3]);
  await a.sync();
  await expect(b.sync()).rejects.toThrow('Konflik');
  expect(b.values.get('active_superapp_tasks')).toEqual([3]);
  expect(remote.items.get('superapp_tasks').payload).toEqual([2]);
});

test('network failure rejects and retry after lost response is idempotent', async () => {
  const remote = server();
  const a = client(remote, { active_superapp_tasks: [1] });
  const original = remote.request;
  a.options.request = async (path, body) => {
    const result = await original(path, body);
    if (body) throw new Error('lost response');
    return result;
  };
  const sync = createDatabaseSync(a.options);
  await expect(sync()).rejects.toThrow('lost response');
  expect(a.values.has('active_whenya_sync_baseline_v1')).toBe(false);
  await expect(sync()).resolves.toEqual({ uploaded: 0, downloaded: 0 });
});

test('foreign accounts and authentication metadata never upload', async () => {
  const remote = server();
  const a = client(remote, { other_superapp_tasks: [1], active_superapp_session_token: 'secret', superapp_current_user: 'other' });
  await a.sync();
  expect(remote.items.size).toBe(0);
  expect(isSyncModule('superapp_cloud_session')).toBe(false);
});

test('local edit during cloud request is not overwritten by pull', async () => {
  const remote = server();
  const a = client(remote, { active_superapp_tasks: [1] });
  const b = client(remote);
  await a.sync(); await b.sync();
  a.values.set('active_superapp_tasks', [2]); await a.sync();
  b.options.request = async (...args) => {
    const result = await remote.request(...args);
    b.values.set('active_superapp_tasks', [3]);
    return result;
  };
  // Mutation during GET is observed as a conflict, never silently replaced.
  await expect(createDatabaseSync(b.options)()).rejects.toThrow('Konflik');
  expect(b.values.get('active_superapp_tasks')).toEqual([3]);
});

test('module selection excludes private encryption keys and per-device view preferences', () => {
  expect(isSyncModule('superapp_master_encryption_key')).toBe(false);
  expect(isSyncModule('superapp_task_view_mode')).toBe(false);
});

test.each(['local', 'cloud'])('explicit %s resolution uses a new revision without duplicating records', async choice => {
  const remote = server();
  const a = client(remote, { active_superapp_tasks: [1] });
  const b = client(remote);
  await a.sync(); await b.sync();
  a.values.set('active_superapp_tasks', [2]); b.values.set('active_superapp_tasks', [3]);
  await a.sync();
  await expect(b.sync()).rejects.toMatchObject({ code: 'SYNC_CONFLICT', conflicts: [{ key: 'superapp_tasks', local: [3], cloud: [2] }] });
  let conflict;
  try { await b.sync(); } catch (error) { conflict = error.conflicts[0]; }
  await b.sync({ resolutions: { superapp_tasks: { ...conflict, choice } } });
  const expected = choice === 'local' ? [3] : [2];
  expect(b.values.get('active_superapp_tasks')).toEqual(expected);
  expect(remote.items.get('superapp_tasks').payload).toEqual(expected);
  expect(remote.items.size).toBe(1);
});

test('stale conflict resolution cannot overwrite a newer cloud revision', async () => {
  const remote = server();
  const a = client(remote, { active_superapp_tasks: [1] });
  const b = client(remote);
  await a.sync(); await b.sync();
  a.values.set('active_superapp_tasks', [2]); b.values.set('active_superapp_tasks', [3]); await a.sync();
  let conflict;
  try { await b.sync(); } catch (error) { conflict = error.conflicts[0]; }
  a.values.set('active_superapp_tasks', [4]); await a.sync();
  await expect(b.sync({ resolutions: { superapp_tasks: { ...conflict, choice: 'local' } } })).rejects.toMatchObject({ code: 'SYNC_CONFLICT' });
  expect(remote.items.get('superapp_tasks').payload).toEqual([4]);
});

test('missing cloud records are repopulated even when local data matches an older baseline', async () => {
  const remote = server();
  const a = client(remote, { active_superapp_tasks: [1] });
  await a.sync();
  remote.items.clear();
  expect(await a.sync()).toEqual({ uploaded: 1, downloaded: 0 });
  expect(remote.items.get('superapp_tasks').payload).toEqual([1]);
});
