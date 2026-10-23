jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('@react-native-async-storage/async-storage', () => { const values = new Map(); return { __esModule: true, default: { getItem: jest.fn(async key => values.get(key) ?? null), setItem: jest.fn(async (key, value) => { values.set(key, value); }), multiRemove: jest.fn(async keys => { keys.forEach(key => values.delete(key)); }), removeItem: jest.fn(async key => { values.delete(key); }), clear: async () => values.clear() } }; });
jest.mock('expo-secure-store', () => { const values = new Map(); return { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1, getItemAsync: jest.fn(async key => values.get(key) ?? null), setItemAsync: jest.fn(async (key, value) => { values.set(key, value); }) }; });
jest.mock('expo-crypto', () => ({ getRandomBytesAsync: async count => new Uint8Array(require('crypto').randomBytes(count)) }));
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { authSessionStorage, migrateLegacyAuthSession } from '../lib/authSessionStorage';
const key = 'whenya.auth.project.supabase.co';
let originalSet;
beforeEach(async () => { await AsyncStorage.clear(); jest.clearAllMocks(); originalSet = AsyncStorage.setItem.getMockImplementation(); });
afterEach(() => { AsyncStorage.setItem.mockImplementation(originalSet); });
test('unavailable native key storage never falls back to plaintext persistence', async () => {
  SecureStore.getItemAsync.mockRejectedValueOnce(new Error('keychain locked'));
  await expect(authSessionStorage.setItem(key, 'private-token')).rejects.toThrow('keychain locked');
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});
test('large native sessions and PKCE verifiers roundtrip encrypted; native keystore only stores small keys', async () => {
  const value = JSON.stringify({ access_token: 'private-access', refresh_token: 'private-refresh', user: { metadata: 'x'.repeat(10000) } });
  await authSessionStorage.setItem(key, value); expect(await authSessionStorage.getItem(key)).toBe(value);
  await authSessionStorage.setItem(key + '-code-verifier', 'secret-verifier'); expect(await authSessionStorage.getItem(key + '-code-verifier')).toBe('secret-verifier');
  const raw = await AsyncStorage.getItem('whenya_auth_v2.' + key); expect(raw).not.toContain('private-access'); expect(raw).not.toContain('private-refresh');
  expect(SecureStore.setItemAsync.mock.calls.every(call => call[1].length <= 128)).toBe(true);
});
test('tampering and copying an encrypted record under a different key are rejected', async () => {
  await authSessionStorage.setItem(key, 'secret');
  const raw = await AsyncStorage.getItem('whenya_auth_v2.' + key);
  await AsyncStorage.setItem('whenya_auth_v2.other', raw);
  await expect(authSessionStorage.getItem('other')).rejects.toThrow('Integritas');
  const changed = JSON.parse(raw); changed.ciphertext += 'A'; await AsyncStorage.setItem('whenya_auth_v2.' + key, JSON.stringify(changed));
  await expect(authSessionStorage.getItem(key)).rejects.toThrow('Integritas');
});
test('legacy migration verifies encrypted persistence before deleting plaintext tokens', async () => {
  const session = { access_token: 'legacy-access', refresh_token: 'legacy-refresh', user: { id: 'one' } };
  await AsyncStorage.setItem('superapp_session', JSON.stringify(session)); await AsyncStorage.setItem('superapp_session_token', 'legacy-access');
  await migrateLegacyAuthSession(key); expect(JSON.parse(await authSessionStorage.getItem(key))).toEqual(session);
  expect(await AsyncStorage.getItem('superapp_session')).toBeNull(); expect(await AsyncStorage.getItem('superapp_session_token')).toBeNull();
});
test('failed encrypted write preserves the legacy session for a later retry', async () => {
  const saved = JSON.stringify({ access_token: 'legacy', refresh_token: 'refresh' }); await AsyncStorage.setItem('superapp_session', saved);
  AsyncStorage.setItem.mockImplementation(async (name, value) => { if (name.startsWith('whenya_auth_v2.')) throw new Error('disk'); return originalSet(name, value); });
  await expect(migrateLegacyAuthSession(key)).rejects.toThrow('disk'); expect(await AsyncStorage.getItem('superapp_session')).toBe(saved);
});
test('migration does not overwrite an existing newer encrypted session', async () => {
  await authSessionStorage.setItem(key, 'new-session'); await AsyncStorage.setItem('superapp_session', JSON.stringify({ access_token: 'old', refresh_token: 'old' }));
  await migrateLegacyAuthSession(key); expect(await authSessionStorage.getItem(key)).toBe('new-session');
});
test('removing a session leaves encrypted application modules untouched', async () => {
  await AsyncStorage.setItem('one_superapp_transactions', 'unrelated ciphertext'); await authSessionStorage.setItem(key, 'session'); await authSessionStorage.removeItem(key);
  expect(await authSessionStorage.getItem(key)).toBeNull(); expect(await AsyncStorage.getItem('one_superapp_transactions')).toBe('unrelated ciphertext');
});

test('legacy shared cloud-link credentials are also encrypted before plaintext removal', async () => {
  const cloud = JSON.stringify({ access_token: 'cloud-access', refresh_token: 'cloud-refresh' });
  await AsyncStorage.setItem('superapp_cloud_session', cloud); await migrateLegacyAuthSession(key);
  expect(await authSessionStorage.getItem('superapp_cloud_session')).toBe(cloud);
  expect(await AsyncStorage.getItem('superapp_cloud_session')).toBeNull();
  expect(await AsyncStorage.getItem('whenya_auth_v2.superapp_cloud_session')).not.toContain('cloud-refresh');
});
