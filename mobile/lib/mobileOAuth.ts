import { authFetch } from './authFetch';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getMobileSupabaseConfig } from './runtimeConfig';
import { mobileAuthClient } from './mobileAuthClient';
import { authRedirectUrl, createAuthRedirectConsumer } from './authRedirect';

let WebBrowser: any = null;
try {
  WebBrowser = require('expo-web-browser');
  WebBrowser?.maybeCompleteAuthSession?.();
} catch {
  // Fallback if not available in current bundler cycle
}
export const consumeMobileAuthRedirect = createAuthRedirectConsumer(mobileAuthClient);
let active = false;
export async function signInMobileOAuth(provider: 'google' | 'apple') {
  if (active) return { success: false, error: 'Proses login lain masih berjalan.' };
  if (Platform.OS !== 'web' && Constants.executionEnvironment === 'storeClient') {
    return { success: false, error: 'Login Google/Apple memerlukan development build atau aplikasi terpasang. Expo Go belum mendukung callback aplikasi ini.' };
  }
  active = true;
  try {
    const { url, anonKey } = getMobileSupabaseConfig();
    const settings = await authFetch(`${url}/auth/v1/settings`, { headers: { apikey: anonKey } });
    if (!settings.ok) return { success: false, error: 'Konfigurasi login belum dapat diperiksa. Silakan coba lagi.' };
    const availability = await settings.json();
    if (availability.external?.[provider] !== true) return { success: false, error: `${provider === 'google' ? 'Google' : 'Apple'} belum diaktifkan di Supabase. Hubungi pengelola aplikasi.` };
    const redirectTo = authRedirectUrl();
    const { data, error } = await mobileAuthClient.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
    if (error || !data?.url) return { success: false, error: 'Provider login belum tersedia. Periksa konfigurasi Google/Apple di Supabase.' };
    if (Platform.OS === 'web') { window.location.assign(data.url); return { success: false, error: undefined }; }
    if (!WebBrowser?.openAuthSessionAsync) {
      try {
        WebBrowser = require('expo-web-browser');
      } catch {}
    }
    if (!WebBrowser?.openAuthSessionAsync) {
      return { success: false, error: 'Modul browser autentikasi tidak tersedia.' };
    }
    const browser = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (browser.type === 'cancel' || browser.type === 'dismiss') return { success: false, cancelled: true };
    if (browser.type !== 'success') return { success: false, error: 'Browser autentikasi tidak dapat dibuka.' };
    return consumeMobileAuthRedirect(browser.url);
  } catch { return { success: false, error: 'Login tidak dapat diselesaikan. Periksa koneksi, lalu coba lagi.' }; }
  finally { active = false; }
}
