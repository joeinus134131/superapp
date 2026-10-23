import { mobileAuthClient } from './mobileAuthClient';
let refreshing: Promise<string | null> | null = null;
export async function refreshAuthToken(): Promise<string | null> {
  if (!refreshing) refreshing = (async () => {
    const { data, error } = await mobileAuthClient.auth.refreshSession();
    return error ? null : data.session?.access_token || null;
  })().catch(() => null).finally(() => { refreshing = null; });
  return refreshing;
}
export async function getValidAuthToken(): Promise<string | null> {
  try {
    const { data, error } = await mobileAuthClient.auth.getSession();
    if (error || !data.session) return null;
    if (!data.session.expires_at || data.session.expires_at <= Date.now() / 1000 + 60) return refreshAuthToken();
    return data.session.access_token;
  } catch { return null; }
}
