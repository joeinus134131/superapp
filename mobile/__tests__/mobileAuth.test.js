jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
jest.mock('expo-linking', () => ({ createURL: (path, options) => `${options.scheme}://${path}` }));
jest.mock('../lib/runtimeConfig', () => ({ getMobileSupabaseConfig: () => ({ url: 'https://project.supabase.co', anonKey: 'public-key' }) }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { executionEnvironment: 'bare' } }));
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn(), openAuthSessionAsync: jest.fn() }));
jest.mock('../lib/mobileAuthClient', () => ({ mobileAuthClient: { auth: { signInWithOAuth: jest.fn(), exchangeCodeForSession: jest.fn(), setSession: jest.fn(), verifyOtp: jest.fn() } } }));
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { mobileAuthClient } from '../lib/mobileAuthClient';
import { authRedirectUrl, parseAuthRedirect, createAuthRedirectConsumer } from '../lib/authRedirect';
import { signInMobileOAuth, consumeMobileAuthRedirect } from '../lib/mobileOAuth';
const session = { user: { id: 'one' }, access_token: 'access', refresh_token: 'refresh' };
const success = { data: { user: session.user, session }, error: null };
beforeEach(() => {
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ external: { google: true, apple: true } }) }));
  jest.clearAllMocks(); consumeMobileAuthRedirect.clear(); Platform.OS = 'ios'; Constants.executionEnvironment = 'bare';
  mobileAuthClient.auth.exchangeCodeForSession.mockResolvedValue(success);
  mobileAuthClient.auth.setSession.mockResolvedValue(success);
  mobileAuthClient.auth.verifyOtp.mockResolvedValue(success);
  mobileAuthClient.auth.signInWithOAuth.mockResolvedValue({ data: { url: 'https://project.supabase.co/auth/v1/authorize' }, error: null });
});
test('one canonical callback supports double/triple slash and legacy router links', () => {
  expect(authRedirectUrl()).toBe('selfone://auth/callback');
  for (const url of ['selfone://auth/callback?code=one', 'selfone:///auth/callback?code=one', 'selfone://callback?code=one', 'selfone:///(auth)/callback?code=one']) expect(parseAuthRedirect(url).get('code')).toBe('one');
});
test('reject unrelated origins, paths, duplicate and conflicting parameters before contacting Supabase', async () => {
  const consume = createAuthRedirectConsumer(mobileAuthClient);
  for (const url of ['https://evil.test/auth/callback?code=x', 'evil://auth/callback?code=x', 'selfone://evil/auth/callback?code=x', 'selfone://auth/callback?code=a&code=b', 'selfone://auth/callback?code=a#code=b']) expect((await consume(url)).success).toBe(false);
  expect(mobileAuthClient.auth.exchangeCodeForSession).not.toHaveBeenCalled();
});
test('single-use PKCE callback is exchanged once across concurrent equivalent URL deliveries', async () => {
  const consume = createAuthRedirectConsumer(mobileAuthClient);
  const results = await Promise.all([consume('selfone://auth/callback?code=single'), consume('selfone:///auth/callback?code=single')]);
  expect(results.every(result => result.success)).toBe(true); expect(mobileAuthClient.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  expect((await consume('selfone://auth/callback?code=single')).success).toBe(true);
  expect(mobileAuthClient.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
});
test('expired code and provider rejection do not return success or echo provider details', async () => {
  const consume = createAuthRedirectConsumer(mobileAuthClient);
  mobileAuthClient.auth.exchangeCodeForSession.mockResolvedValueOnce({ data: {}, error: { message: 'private provider diagnostics' } });
  expect(await consume('selfone://auth/callback?code=expired')).toEqual(expect.objectContaining({ success: false }));
  expect(JSON.stringify(await consume('selfone://auth/callback?error=access_denied&error_description=private'))).not.toContain('diagnostics');
});
test('only the verified SDK recovery type selects password reset, not an untrusted URL hint', async () => {
  const consume = createAuthRedirectConsumer(mobileAuthClient);
  expect((await consume('selfone://auth/callback?code=normal&intent=recovery')).recovery).toBe(false);
  mobileAuthClient.auth.exchangeCodeForSession.mockResolvedValueOnce({ ...success, data: { ...success.data, redirectType: 'PASSWORD_RECOVERY' } });
  expect((await consume('selfone://auth/callback?code=recover')).recovery).toBe(true);
  expect(authRedirectUrl(true)).toContain('intent=recovery');
});
test('bearer-token callback injection and old OTP links cannot bypass PKCE', async () => {
  const consume = createAuthRedirectConsumer(mobileAuthClient);
  for (const link of ['selfone://auth/callback#access_token=old&refresh_token=refresh', 'selfone://auth/callback?token_hash=hash&type=recovery', 'selfone://auth/callback?code=one&access_token=injected']) expect((await consume(link)).success).toBe(false);
  expect(mobileAuthClient.auth.setSession).not.toHaveBeenCalled(); expect(mobileAuthClient.auth.exchangeCodeForSession).not.toHaveBeenCalled(); expect(mobileAuthClient.auth.verifyOtp).not.toHaveBeenCalled();
});
test('OAuth success means a browser callback was exchanged, not merely that the browser opened', async () => {
  WebBrowser.openAuthSessionAsync.mockResolvedValueOnce({ type: 'success', url: 'selfone://auth/callback?code=google' });
  expect((await signInMobileOAuth('google')).success).toBe(true);
  expect(mobileAuthClient.auth.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: 'selfone://auth/callback', skipBrowserRedirect: true } });
  expect(mobileAuthClient.auth.exchangeCodeForSession).toHaveBeenCalledWith('google');
});
test('cancel, browser failure, disabled provider, and Expo Go never report an authenticated user', async () => {
  WebBrowser.openAuthSessionAsync.mockResolvedValueOnce({ type: 'cancel' });
  expect(await signInMobileOAuth('apple')).toEqual({ success: false, cancelled: true });
  WebBrowser.openAuthSessionAsync.mockRejectedValueOnce(new Error('browser failure'));
  expect((await signInMobileOAuth('google')).success).toBe(false);
  mobileAuthClient.auth.signInWithOAuth.mockResolvedValueOnce({ error: { message: 'disabled' } });
  expect((await signInMobileOAuth('apple')).success).toBe(false);
  Constants.executionEnvironment = 'storeClient'; expect((await signInMobileOAuth('google')).error).toContain('development build');
});
test('second OAuth attempt is blocked until the active browser completes', async () => {
  let finish; WebBrowser.openAuthSessionAsync.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const first = signInMobileOAuth('google'); for (let i = 0; i < 8; i++) await Promise.resolve();
  expect((await signInMobileOAuth('apple')).success).toBe(false);
  finish({ type: 'dismiss' }); expect((await first).cancelled).toBe(true);
});

test('disabled provider is explained before opening the browser', async () => {
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ external: { google: false } }) });
  expect((await signInMobileOAuth('google')).error).toContain('belum diaktifkan');
  expect(WebBrowser.openAuthSessionAsync).not.toHaveBeenCalled(); expect(mobileAuthClient.auth.signInWithOAuth).not.toHaveBeenCalled();
});
