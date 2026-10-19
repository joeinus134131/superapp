import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@superapp/shared';

const authClient: any = supabase;

/**
 * Pure base64 decoder compatible with Hermes / React Native
 */
function decodeBase64(input: string): string {
  if (typeof atob === 'function') {
    return atob(input);
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const str = input.replace(/=+$/, '');
  let output = '';
  for (let bc = 0, bs = 0, buffer: any, idx = 0; (buffer = str.charAt(idx++)); ) {
    const charIndex = chars.indexOf(buffer);
    if (~charIndex) {
      bs = bc % 4 ? bs * 64 + charIndex : charIndex;
      if (bc++ % 4) {
        output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
      }
    }
  }
  return output;
}

/**
 * Extract expiration timestamp (seconds) from JWT payload safely
 */
function parseJwtExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = decodeBase64(base64);
    const parsed = JSON.parse(decoded);
    return typeof parsed.exp === 'number' ? parsed.exp : null;
  } catch {
    return null;
  }
}

/**
 * Force refresh Supabase session using refresh_token stored in AsyncStorage
 */
export async function refreshAuthToken(): Promise<string | null> {
  try {
    const sessionPayload = await AsyncStorage.getItem('superapp_session');
    if (!sessionPayload) {
      return null;
    }
    const parsedSession = JSON.parse(sessionPayload);
    const refreshToken = parsedSession?.refresh_token;
    if (!refreshToken) {
      return null;
    }

    console.log('[AuthToken] Melakukan refresh session Supabase...');
    const { data, error } = await authClient.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      console.warn('[AuthToken] refreshSession gagal, mencoba setSession fallback:', error?.message);
      const { data: fallbackData, error: fallbackError } = await authClient.auth.setSession({
        access_token: parsedSession.access_token,
        refresh_token: refreshToken,
      });

      if (fallbackError || !fallbackData.session) {
        console.error('[AuthToken] Gagal memperbarui session:', fallbackError?.message);
        return null;
      }
      data.session = fallbackData.session;
    }

    const newSession = data.session;
    await AsyncStorage.multiSet([
      ['superapp_session_token', newSession.access_token || ''],
      ['superapp_session', JSON.stringify(newSession)],
    ]);

    console.log('[AuthToken] Token berhasil diperbarui.');
    return newSession.access_token || null;
  } catch (err) {
    console.error('[AuthToken] Error refreshAuthToken:', err);
    return null;
  }
}

/**
 * Gets a valid (non-expired) Supabase access token.
 * If expired or expiring within 60s, it auto-refreshes using refresh_token.
 */
export async function getValidAuthToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem('superapp_session_token');
    if (!token) return null;

    const exp = parseJwtExp(token);
    const now = Math.floor(Date.now() / 1000);

    // If token still valid for at least another 60 seconds, return it
    if (exp && exp - now > 60) {
      return token;
    }

    // Token is expired or expiring soon -> refresh
    console.log(`[AuthToken] Token terdeteksi kadaluarsa (exp: ${exp}, now: ${now}). Memperbarui otomatis...`);
    const refreshed = await refreshAuthToken();
    return refreshed || token;
  } catch (err) {
    console.error('[AuthToken] Error getValidAuthToken:', err);
    return await AsyncStorage.getItem('superapp_session_token');
  }
}
