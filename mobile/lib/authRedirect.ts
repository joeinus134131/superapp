import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export const AUTH_CALLBACK_PATH = 'auth/callback';
export const AUTH_SCHEME = 'selfone';
export function authRedirectUrl(recovery = false) {
  const base = Platform.OS === 'web'
    ? `${window.location.origin}/${AUTH_CALLBACK_PATH}`
    : Linking.createURL(AUTH_CALLBACK_PATH, { scheme: AUTH_SCHEME });
  return recovery ? `${base}?intent=recovery` : base;
}
export function parseAuthRedirect(value: string) {
  const url = new URL(value);
  const query = new URLSearchParams(url.search);
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
  for (const [key, item] of fragment) {
    if (query.has(key) && query.get(key) !== item) throw new Error('Parameter callback bertentangan.');
    query.set(key, item);
  }
  const native = url.protocol === `${AUTH_SCHEME}:`;
  const browser = Platform.OS === 'web' && url.origin === window.location.origin;
  if (!native && !browser) throw new Error('Asal callback autentikasi tidak diizinkan.');
  const path = decodeURIComponent(`${native ? url.hostname : ''}${url.pathname}`).replace(/^\/+|\/+$/g, '');
  if (![AUTH_CALLBACK_PATH, 'callback', '(auth)/callback'].includes(path)) throw new Error('Bukan callback autentikasi Whenya.');
  for (const key of ['code', 'token_hash', 'access_token', 'refresh_token', 'type', 'intent', 'error', 'error_description']) {
    if (query.getAll(key).length > 1) throw new Error('Parameter callback ganda.');
  }
  return query;
}
export interface AuthRedirectResult {
  success: boolean;
  user?: any;
  recovery?: boolean;
  cancelled?: boolean;
  error?: string;
}
// A callback may arrive through both the browser result and Linking/router.
// Coalesce the exchange: PKCE codes/OTP tokens are single-use.
export function createAuthRedirectConsumer(client: any) {
  const pending = new Map<string, Promise<AuthRedirectResult>>();
  const completed = new Map<string, { at: number; result: AuthRedirectResult }>();
  const consume = (url: string): Promise<AuthRedirectResult> => {
    let key: string;
    try { key = JSON.stringify([...parseAuthRedirect(url)].sort(([a], [b]) => a.localeCompare(b))); }
    catch (error) { return Promise.resolve({ success: false, error: error instanceof Error ? error.message : 'Callback tidak valid.' }); }
    const prior = completed.get(key);
    if (prior && Date.now() - prior.at < 5 * 60000) return Promise.resolve(prior.result);
    const running = pending.get(key); if (running) return running;
    const operation = (async (): Promise<AuthRedirectResult> => {
      try {
        const params = parseAuthRedirect(url);
        if (params.has('error') || params.has('error_description')) return { success: false, error: 'Autentikasi ditolak atau dibatalkan oleh provider. Silakan coba lagi.' };
        if (params.has('access_token') || params.has('refresh_token') || params.has('token_hash')) throw new Error('Tautan ini memakai format lama. Mulai login atau minta email verifikasi/reset yang baru.');
        if (!params.get('code')) throw new Error('Callback tidak berisi kode autentikasi yang valid.');
        const response = await client.auth.exchangeCodeForSession(params.get('code'));
        if (response.error) throw new Error('Tautan autentikasi tidak valid atau sudah kedaluwarsa. Silakan mulai lagi.');
        if (!response.data?.session || !response.data?.user) throw new Error('Sesi autentikasi tidak tersedia.');
        const result = { success: true, user: response.data.user, recovery: response.data.redirectType === 'PASSWORD_RECOVERY' };
        if (completed.size >= 20) completed.delete(completed.keys().next().value!);
        completed.set(key, { at: Date.now(), result });
        return result;
      } catch (error) { return { success: false, error: error instanceof Error ? error.message : 'Callback gagal diproses.' }; }
    })();
    pending.set(key, operation);
    void operation.finally(() => pending.delete(key));
    return operation;
  };
  return Object.assign(consume, { clear: () => completed.clear() });
}
