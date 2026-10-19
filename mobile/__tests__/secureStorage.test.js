jest.mock('@react-native-async-storage/async-storage', () => {
  const values = new Map();
  return { __esModule: true, default: {
    getItem: jest.fn(async key => values.get(key) ?? null),
    setItem: jest.fn(async (key, value) => { values.set(key, value); }),
    removeItem: jest.fn(async key => { values.delete(key); }),
    clear: async () => values.clear(),
  } };
});
jest.mock('expo-secure-store', () => ({ getItemAsync: async () => 'test-master-key', setItemAsync: jest.fn() }));
jest.mock('expo-crypto', () => ({
  getRandomBytes: size => new Uint8Array(require('crypto').randomBytes(size)),
  getRandomBytesAsync: async size => new Uint8Array(require('crypto').randomBytes(size)),
}));
jest.mock('../lib/databaseSync', () => ({ scheduleDatabaseSync: jest.fn() }));
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EncryptedStorage } from '../lib/secureStorage';

beforeEach(async () => { await AsyncStorage.clear(); await AsyncStorage.setItem('superapp_current_user', 'one'); });

test('encrypted module roundtrip uses current profile namespace', async () => {
  await EncryptedStorage.setItem('superapp_transactions', [{ id: 'tx1' }]);
  const raw = await AsyncStorage.getItem('one_superapp_transactions');
  expect(raw).not.toContain('tx1');
  expect(await EncryptedStorage.getItem('superapp_transactions')).toEqual([{ id: 'tx1' }]);
  await AsyncStorage.setItem('superapp_current_user', 'two');
  expect(await EncryptedStorage.getItem('superapp_transactions')).toBeNull();
});

test('web JSON and tombstones remain readable, corrupt ciphertext fails explicitly', async () => {
  await AsyncStorage.setItem('one_superapp_journal', '[{"id":"web"}]');
  expect(await EncryptedStorage.getItem('superapp_journal')).toEqual([{ id: 'web' }]);
  await EncryptedStorage.setItem('superapp_journal', null);
  expect(await EncryptedStorage.getItem('superapp_journal')).toBeNull();
  await AsyncStorage.setItem('one_superapp_journal', 'broken ciphertext');
  await expect(EncryptedStorage.getItem('superapp_journal')).rejects.toThrow('tidak dapat didekripsi');
});

test('legacy data is claimed once and does not leak into a second account', async () => {
  await AsyncStorage.setItem('superapp_journal', '[{"id":"legacy"}]');
  expect(await EncryptedStorage.getItem('superapp_journal')).toEqual([{ id: 'legacy' }]);
  await AsyncStorage.setItem('superapp_current_user', 'two');
  expect(await EncryptedStorage.getItem('superapp_journal')).toBeNull();
});

test('deletion does not reclaim a stale unscoped legacy module', async () => {
  await AsyncStorage.setItem('superapp_journal', '[{"id":"legacy"}]');
  await EncryptedStorage.getItem('superapp_journal');
  await EncryptedStorage.removeItem('superapp_journal');
  expect(await EncryptedStorage.getItem('superapp_journal')).toBeNull();
});
