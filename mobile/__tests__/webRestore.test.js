jest.mock('localforage', () => {
  const values = new Map();
  return { __esModule: true, default: {
    config: jest.fn(),
    getItem: jest.fn(async key => values.get(key) ?? null),
    setItem: jest.fn(async (key, value) => { values.set(key, value); }),
    removeItem: jest.fn(async key => { values.delete(key); }),
    clear: async () => values.clear(),
  } };
}, { virtual: true });
import localforage from 'localforage';
import { persistRestoredEntries, getData } from '../../web/lib/storage';

beforeEach(async () => {
  await localforage.clear();
  const values = new Map([['superapp_current_user', '"active"']]);
  global.window = {};
  global.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: jest.fn((key, value) => values.set(key, value)),
    removeItem: key => values.delete(key),
  };
});
afterEach(() => { delete global.window; delete global.localStorage; });

test('restore replaces stale IndexedDB and localStorage before subsequent reads', async () => {
  await localforage.setItem('active_superapp_tasks', [{ id: 'stale' }]);
  await persistRestoredEntries([['active_superapp_tasks', '[{"id":"restored"}]']]);
  expect(await getData('superapp_tasks')).toEqual([{ id: 'restored' }]);
  expect(JSON.parse(localStorage.getItem('active_superapp_tasks'))).toEqual([{ id: 'restored' }]);
  expect(localStorage.getItem('superapp_current_user')).toBe('"active"');
});

test('storage quota failure rejects restore and restores prior cache values', async () => {
  await localforage.setItem('active_superapp_tasks', [{ id: 'prior' }]);
  localStorage.setItem('active_superapp_tasks', '[{"id":"prior"}]');
  localStorage.setItem.mockImplementationOnce(() => { throw new Error('quota exceeded'); });
  await expect(persistRestoredEntries([['active_superapp_tasks', '[{"id":"new"}]']])).rejects.toThrow('quota');
  expect(await getData('superapp_tasks')).toEqual([{ id: 'prior' }]);
  expect(localStorage.getItem('active_superapp_tasks')).toBe('[{"id":"prior"}]');
});

test('cloud deletion does not resurrect stale quoted-identity legacy data', async () => {
  await localforage.setItem('"active"_superapp_tasks', [{ id: 'stale' }]);
  await persistRestoredEntries([['active_superapp_tasks', 'null']]);
  expect(await getData('superapp_tasks')).toBeNull();
});
