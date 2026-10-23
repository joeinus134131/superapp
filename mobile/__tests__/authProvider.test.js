jest.mock('react-native', () => ({ AppState: { currentState: 'active', addEventListener: jest.fn(() => ({ remove: jest.fn() })) } }));
jest.mock('@react-native-async-storage/async-storage', () => { const values = new Map(); return { __esModule: true, default: { getItem: jest.fn(async key => values.get(key) ?? null), setItem: jest.fn(async (key, value) => { values.set(key, value); }), removeItem: jest.fn(async key => { values.delete(key); }), multiRemove: jest.fn(async keys => { keys.forEach(key => values.delete(key)); }), clear: async () => values.clear() } }; });
jest.mock('expo-linking', () => ({ addEventListener: () => ({ remove: jest.fn() }), getInitialURL: jest.fn(async () => null), createURL: () => 'selfone://auth/callback' }));
jest.mock('@superapp/shared', () => ({ getSupabaseConfigStatus: () => ({ isConfigured: true, source: 'fixture' }), checkSupabaseConnection: async () => ({ ok: true, message: 'ready' }) }));
jest.mock('../lib/mobileAuthClient', () => ({ mobileAuthClient: { auth: { onAuthStateChange: jest.fn(), getSession: jest.fn(), signInWithPassword: jest.fn(), signOut: jest.fn(), startAutoRefresh: jest.fn(), stopAutoRefresh: jest.fn(), resetPasswordForEmail: jest.fn() } } }));
jest.mock('../lib/mobileOAuth', () => ({ consumeMobileAuthRedirect: Object.assign(jest.fn(), { clear: jest.fn() }), signInMobileOAuth: jest.fn() }));
jest.mock('../lib/authFetch', () => ({ authFetch: jest.fn(async () => ({ ok: true, status: 200 })) }));
jest.mock('../lib/runtimeConfig', () => ({ getMobileSupabaseConfig: () => ({ url: 'https://project.test', anonKey: 'public' }) }));
jest.mock('../lib/config', () => ({ CONFIG: { API_URL: 'https://api.test' } }));
jest.mock('axios', () => ({ __esModule: true, default: { post: jest.fn(async () => ({})) } }));
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileAuthClient } from '../lib/mobileAuthClient';
import { consumeMobileAuthRedirect, signInMobileOAuth } from '../lib/mobileOAuth';
import { AuthProvider, useAuth } from '../hooks/useAuth';
const { create, act } = require('./helpers/renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;
let tree, api, listener;
const session = { user: { id: 'one', email: 'test@example.test' }, access_token: 'secret-access', refresh_token: 'secret-refresh' };
function Probe() { api = useAuth(); return null; }
const mount = async () => { await act(async () => { tree = create(<AuthProvider><Probe /></AuthProvider>); }); };
beforeEach(async () => {
  jest.clearAllMocks(); await AsyncStorage.clear();
  mobileAuthClient.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mobileAuthClient.auth.onAuthStateChange.mockImplementation(fn => { listener = fn; return { data: { subscription: { unsubscribe: jest.fn() } } }; });
  mobileAuthClient.auth.signOut.mockResolvedValue({ error: null });
});
afterEach(async () => { if (tree) { await act(async () => tree.unmount()); tree = null; } });
test('restore secure SDK session writes only the non-secret account identity to AsyncStorage', async () => {
  mobileAuthClient.auth.getSession.mockResolvedValue({ data: { session }, error: null }); await mount();
  expect(api.user.id).toBe('one'); expect(api.loading).toBe(false);
  expect(await AsyncStorage.getItem('superapp_current_user')).toBe('one');
  expect(JSON.stringify(AsyncStorage.setItem.mock.calls)).not.toContain('secret-');
});
test('cancelled OAuth never updates the user or leaves a login lock behind', async () => {
  await mount(); signInMobileOAuth.mockResolvedValue({ success: false, cancelled: true });
  await act(async () => { expect((await api.loginWithOAuth('google')).cancelled).toBe(true); });
  expect(api.user).toBeNull();
  await act(async () => { await api.loginWithOAuth('apple'); }); expect(signInMobileOAuth).toHaveBeenCalledTimes(2);
});
test('logout clears the identity and callback cache without deleting application records', async () => {
  mobileAuthClient.auth.getSession.mockResolvedValue({ data: { session }, error: null }); await mount(); await AsyncStorage.setItem('one_superapp_tasks', 'saved tasks');
  await act(async () => api.logout()); expect(api.user).toBeNull(); expect(await AsyncStorage.getItem('superapp_current_user')).toBeNull();
  expect(await AsyncStorage.getItem('one_superapp_tasks')).toBe('saved tasks'); expect(consumeMobileAuthRedirect.clear).toHaveBeenCalled();
});
test('failed server signout is surfaced rather than claiming successful logout', async () => {
  mobileAuthClient.auth.getSession.mockResolvedValue({ data: { session }, error: null }); await mount();
  mobileAuthClient.auth.signOut.mockResolvedValueOnce({ error: { status: 500 } });
  await act(async () => { await expect(api.logout()).rejects.toThrow('Logout belum selesai'); }); expect(api.user.id).toBe('one');
});
test('recovery callback sets password-reset mode instead of treating it as a normal dashboard login', async () => {
  await mount(); consumeMobileAuthRedirect.mockResolvedValueOnce({ success: true, user: session.user, recovery: true });
  mobileAuthClient.auth.getSession.mockResolvedValue({ data: { session }, error: null });
  await act(async () => { expect((await api.consumeAuthRedirect('selfone://auth/callback?code=recovery')).recovery).toBe(true); });
  expect(api.needsPasswordReset).toBe(true); expect(api.user.id).toBe('one');
});
test('a late bootstrap response cannot overwrite a more recent SIGNED_IN event', async () => {
  let finish; mobileAuthClient.auth.getSession.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  await act(async () => { tree = create(<AuthProvider><Probe /></AuthProvider>); });
  await act(async () => { listener('SIGNED_IN', session); finish({ data: { session: null }, error: null }); });
  expect(api.user.id).toBe('one'); expect(await AsyncStorage.getItem('superapp_current_user')).toBe('one');
});
