import { authFetch } from './authFetch';
import { createClient } from '@supabase/supabase-js';
import { getMobileSupabaseConfig } from './runtimeConfig';
import { authSessionStorage, migrateLegacyAuthSession } from './authSessionStorage';

let cached: ReturnType<typeof createClient> | null = null;
let cachedConfig = '';
export function mobileAuthStorageKey() {
  const { url } = getMobileSupabaseConfig();
  return `whenya.auth.${new URL(url || 'https://placeholder.supabase.co').hostname}`;
}
export function getMobileAuthClient() {
  const { url, anonKey } = getMobileSupabaseConfig();
  const configKey = `${url}:${anonKey}`;
  if (!cached || cachedConfig !== configKey) {
    const storageKey = mobileAuthStorageKey();
    const storage = { ...authSessionStorage, getItem: async (key: string) => {
      if (key === storageKey) await migrateLegacyAuthSession(key);
      return authSessionStorage.getItem(key);
    } };
    cached = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder_key', {
      global: { fetch: authFetch },
      auth: { storageKey, storage, flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
    cachedConfig = configKey;
  }
  return cached;
}
export const mobileAuthClient = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, property) { return (getMobileAuthClient() as any)[property]; },
});
