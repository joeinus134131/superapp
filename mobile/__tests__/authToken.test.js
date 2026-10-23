jest.mock('../lib/mobileAuthClient', () => ({ mobileAuthClient: { auth: { getSession: jest.fn(), refreshSession: jest.fn() } } }));
import { mobileAuthClient as client } from '../lib/mobileAuthClient';
import { getValidAuthToken, refreshAuthToken } from '../lib/authToken';
beforeEach(() => jest.clearAllMocks());
test('valid session tokens come from the secure SDK session', async () => {
  client.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'valid', expires_at: Date.now() / 1000 + 3600 } }, error: null });
  expect(await getValidAuthToken()).toBe('valid'); expect(client.auth.refreshSession).not.toHaveBeenCalled();
});
test('failed refresh never falls back to the expired access token', async () => {
  client.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'expired', expires_at: 1 } }, error: null });
  client.auth.refreshSession.mockResolvedValue({ data: { session: null }, error: { message: 'offline' } });
  expect(await getValidAuthToken()).toBeNull();
});
test('concurrent refresh requests share one SDK refresh operation', async () => {
  client.auth.refreshSession.mockResolvedValue({ data: { session: { access_token: 'new' } }, error: null });
  expect(await Promise.all([refreshAuthToken(), refreshAuthToken()])).toEqual(['new', 'new']);
  expect(client.auth.refreshSession).toHaveBeenCalledTimes(1);
});
