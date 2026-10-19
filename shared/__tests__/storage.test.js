import {
  STORAGE_KEYS,
  getData,
  getRawData,
  normalizeStorageIdentity,
  setRawData,
  setStorageAdapter,
} from '../lib/storage.js';

function createAdapter(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: jest.fn(async key => values.has(key) ? values.get(key) : null),
    setItem: jest.fn(async (key, value) => { values.set(key, value); }),
    removeItem: jest.fn(async key => { values.delete(key); }),
  };
}

describe('storage identity and raw values', () => {
  test.each([
    ['user_123', 'user_123'],
    ['"user_123"', 'user_123'],
    ['null', null],
    [null, null],
  ])('normalizes %p to %p', (stored, expected) => {
    expect(normalizeStorageIdentity(stored)).toBe(expected);
  });

  test('uses the normalized user id for namespaced reads', async () => {
    const adapter = createAdapter({
      [STORAGE_KEYS.AUTH_USER]: '"user_123"',
      'user_123_superapp_tasks': '[{"id":"task_1"}]',
    });
    setStorageAdapter(adapter);

    await expect(getData(STORAGE_KEYS.TASKS)).resolves.toEqual([{ id: 'task_1' }]);
    expect(adapter.getItem).toHaveBeenCalledWith('user_123_superapp_tasks');
  });

  test('removes raw keys instead of persisting a JSON null string', async () => {
    const adapter = createAdapter({ [STORAGE_KEYS.SESSION_TOKEN]: '"token"' });
    setStorageAdapter(adapter);

    await setRawData(STORAGE_KEYS.SESSION_TOKEN, null);

    expect(adapter.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.SESSION_TOKEN);
    await expect(getRawData(STORAGE_KEYS.SESSION_TOKEN)).resolves.toBeNull();
  });
});

test('raw native session IDs and bearer tokens are readable without JSON encoding', async () => {
  setStorageAdapter(createAdapter({
    [STORAGE_KEYS.AUTH_USER]: 'native-user-id',
    [STORAGE_KEYS.SESSION_TOKEN]: 'eyJ.native.token',
  }));
  await expect(getRawData(STORAGE_KEYS.AUTH_USER)).resolves.toBe('native-user-id');
  await expect(getRawData(STORAGE_KEYS.SESSION_TOKEN)).resolves.toBe('eyJ.native.token');
});
