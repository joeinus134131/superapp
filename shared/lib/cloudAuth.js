/**
 * Cloud account linking on top of Supabase Auth.
 *
 * The shared Supabase client runs with persistSession disabled (mobile manages
 * its own AsyncStorage session), so this module persists the session through
 * the platform storage adapter and re-establishes it with `auth.setSession`.
 * It gives the web app a real Supabase access token without replacing the
 * local, offline-first profile system.
 */

import { getSupabaseClient } from './supabaseClient';
import { getRawData, setRawData } from './storage';

export const CLOUD_SESSION_KEY = 'superapp_cloud_session';

async function persistSession(session) {
  await setRawData(CLOUD_SESSION_KEY, {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at || null,
    user_id: session.user?.id || null,
    email: session.user?.email || null,
  });
}

function friendlyError(message) {
  const text = String(message || '').toLowerCase();
  if (text.includes('invalid login credentials')) return 'Email atau password salah.';
  if (text.includes('already registered')) return 'Email ini sudah terdaftar. Pilih "Masuk" saja.';
  if (text.includes('email not confirmed')) return 'Email belum dikonfirmasi. Cek kotak masukmu.';
  if (text.includes('password')) return 'Password minimal 6 karakter.';
  return message || 'Tidak dapat menghubungi akun cloud.';
}

/**
 * Sign in to (or create) the Supabase account that will own this profile's
 * cloud data. Returns `{ userId, email }` on success.
 */
export async function connectCloudAccount(email, password, { create = false } = {}) {
  const client = getSupabaseClient();
  const credentials = { email: String(email || '').trim(), password };

  if (!credentials.email || !credentials.password) {
    throw new Error('Email dan password wajib diisi.');
  }

  const { data, error } = create
    ? await client.auth.signUp(credentials)
    : await client.auth.signInWithPassword(credentials);

  if (error) throw new Error(friendlyError(error.message));
  if (!data?.session) {
    throw new Error('Akun dibuat. Cek email untuk konfirmasi, lalu masuk kembali.');
  }

  await persistSession(data.session);
  return { userId: data.session.user?.id || null, email: data.session.user?.email || credentials.email };
}

/**
 * Re-establish a previously stored session. Returns the live session or null.
 */
export async function restoreCloudSession() {
  const saved = await getRawData(CLOUD_SESSION_KEY);
  if (!saved?.access_token || !saved?.refresh_token) return null;

  const { data, error } = await getSupabaseClient().auth.setSession({
    access_token: saved.access_token,
    refresh_token: saved.refresh_token,
  });

  if (error || !data?.session) {
    await setRawData(CLOUD_SESSION_KEY, null);
    return null;
  }

  await persistSession(data.session);
  return data.session;
}

/**
 * Resolve a live Supabase access token, refreshing it when needed. Returns
 * null when the profile has no linked cloud account.
 */
export async function getCloudAccessToken() {
  const client = getSupabaseClient();

  const current = await client.auth.getSession();
  if (current?.data?.session?.access_token) {
    await persistSession(current.data.session);
    return current.data.session.access_token;
  }

  const restored = await restoreCloudSession();
  if (restored?.access_token) return restored.access_token;

  const refreshed = await client.auth.refreshSession();
  if (refreshed?.data?.session?.access_token) {
    await persistSession(refreshed.data.session);
    return refreshed.data.session.access_token;
  }

  return null;
}

/**
 * The stored cloud account (does not verify the session). Returns
 * `{ userId, email }` or null.
 */
export async function getCloudAccount() {
  const saved = await getRawData(CLOUD_SESSION_KEY);
  if (!saved?.user_id) return null;
  return { userId: saved.user_id, email: saved.email || null };
}

export async function disconnectCloudAccount() {
  try {
    await getSupabaseClient().auth.signOut();
  } catch {
    // Ignore sign-out failures; the local session is cleared regardless.
  }
  await setRawData(CLOUD_SESSION_KEY, null);
}
