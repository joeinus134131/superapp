'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getRawData, setRawData, STORAGE_KEYS } from './storage';
import { getSupabaseClient } from './supabaseClient';

const UserContext = createContext(null);

const AVATAR_OPTIONS = [
  '😎', '🦊', '🐱', '🐶', '🦁', '🐼', '🐨', '🦄',
  '🐲', '🦅', '🐺', '🦈', '🐙', '🦋', '🌟', '🔥',
  '⚡', '🚀', '💎', '🎯', '🎨', '🎮', '🎵', '🌈',
  '🍀', '🌸', '🌊', '🏔️', '🌙', '☀️', '❄️', '🪐',
];

function generateUserId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'user_' + crypto.randomUUID().replace(/-/g, '');
  }
  return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function generateUniqueCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const randomArray = new Uint8Array(8);
    crypto.getRandomValues(randomArray);
    for (let i = 0; i < 8; i++) {
      code += chars[randomArray[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return `SA-${code}`;
}

function friendlyAuthError(message) {
  const text = String(message || '').toLowerCase();
  if (text.includes('invalid login credentials') || text.includes('invalid_grant')) {
    return 'Email atau kata sandi salah. Silakan periksa kembali.';
  }
  if (text.includes('user not found')) {
    return 'Akun dengan email ini belum terdaftar.';
  }
  if (text.includes('already registered')) {
    return 'Email ini sudah terdaftar. Silakan pilih Masuk.';
  }
  if (text.includes('email not confirmed')) {
    return 'Email belum dikonfirmasi. Cek kotak masuk atau spam email Anda.';
  }
  if (text.includes('password') && (text.includes('least') || text.includes('short') || text.includes('character'))) {
    return 'Kata sandi minimal 6 karakter.';
  }
  return message || 'Terjadi kendala saat menghubungi akun cloud.';
}

const getApiBaseUrl = () => {
  if (typeof process !== 'undefined') {
    if (process.env?.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
    if (process.env?.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  }
  return 'http://localhost:8080/api/v1';
};

const syncUserToBackend = async (user, token) => {
  if (!user?.id || !token) return;
  try {
    const baseUrl = getApiBaseUrl();
    await fetch(`${baseUrl}/users/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: user.id,
        email: user.email || '',
      }),
    });
  } catch (err) {
    console.warn('[Sync] User sync error:', err);
  }
};

const pullUserDataFromBackend = async (userId, token) => {
  if (!userId || !token) return;
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/context/sync`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      const items = data.items || [];
      const keyMap = {
        'TASK': STORAGE_KEYS.TASKS,
        'HABIT': STORAGE_KEYS.HABITS,
        'FINANCE': STORAGE_KEYS.TRANSACTIONS,
        'JOURNAL': STORAGE_KEYS.JOURNAL,
        'HEALTH': STORAGE_KEYS.HEALTH,
        'GOALS': STORAGE_KEYS.GOALS,
        'GAMIFICATION': STORAGE_KEYS.GAMIFICATION,
      };

      for (const item of items) {
        const localKey = keyMap[item.module_type];
        if (localKey && item.data_payload) {
          await setRawData(`${userId}_${localKey}`, item.data_payload);
        }
      }
      console.log(`[Sync] Berhasil sinkronisasi ${items.length} item data dari backend untuk user ${userId}`);
    }
  } catch (err) {
    console.warn('[Sync] Pull user data error:', err);
  }
};

// Migrate old non-namespaced data to user-namespaced keys
async function migrateOldData(userId) {
  const OLD_KEYS = [
    'superapp_tasks', 'superapp_habits', 'superapp_transactions',
    'superapp_journal', 'superapp_goals', 'superapp_pomodoro',
    'superapp_health', 'superapp_reading', 'superapp_events',
  ];
  for (const key of OLD_KEYS) {
    const oldData = await getRawData(key);
    if (oldData !== null && oldData !== undefined) {
      const newKey = `${userId}_${key}`;
      const existing = await getRawData(newKey);
      if (existing === null || existing === undefined) {
        await setRawData(newKey, oldData);
      }
      await setRawData(key, null);
    }
  }
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      try {
        if (typeof window !== 'undefined') {
          const hash = window.location.hash || '';
          const search = window.location.search || '';
          if (hash.includes('access_token=') || search.includes('code=')) {
            const client = getSupabaseClient();
            const { data: sessionData } = await client.auth.getSession();
            if (sessionData?.session?.user) {
              const sess = sessionData.session;
              const u = sess.user;
              const token = sess.access_token;
              const uid = u.id;
              const displayName = u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Pengguna Whenya';

              const users = (await getRawData(STORAGE_KEYS.AUTH_USERS_LIST)) || [];
              let existingUser = users.find(usr => usr.id === uid || usr.email === u.email);
              if (existingUser) {
                existingUser.id = uid;
                existingUser.email = u.email;
                existingUser.name = existingUser.name || displayName;
                existingUser.lastLogin = new Date().toISOString();
                existingUser.sessionToken = token;
              } else {
                existingUser = {
                  id: uid,
                  email: u.email,
                  name: displayName,
                  avatar: u.user_metadata?.avatar_url || '🌿',
                  uniqueCode: generateUniqueCode(),
                  sessionToken: token,
                  createdAt: u.created_at || new Date().toISOString(),
                  lastLogin: new Date().toISOString(),
                };
                users.push(existingUser);
              }
              await setRawData(STORAGE_KEYS.AUTH_USERS_LIST, users);
              await setRawData(STORAGE_KEYS.AUTH_USER, uid);
              await setRawData(STORAGE_KEYS.SESSION_TOKEN, token);
              await setRawData('superapp_cloud_session', {
                access_token: token,
                refresh_token: sess.refresh_token,
                expires_at: sess.expires_at || null,
                user_id: uid,
                email: u.email,
              });
              await setRawData('superapp_session', sess);

              setUser(existingUser);
              syncUserToBackend(existingUser, token);
              pullUserDataFromBackend(uid, token);

              if (window.history?.replaceState) {
                window.history.replaceState(null, '', window.location.pathname);
              }
              setLoading(false);
              return;
            }
          }
        }

        const userId = await getRawData(STORAGE_KEYS.AUTH_USER);
        const sessionToken = await getRawData(STORAGE_KEYS.SESSION_TOKEN);

        if (userId) {
          const users = (await getRawData(STORAGE_KEYS.AUTH_USERS_LIST)) || [];
          let found = users.find(u => u.id === userId);

          // If user logged in via cloud / Supabase, restore or create profile in list
          if (!found) {
            const cloudSession = await getRawData('superapp_cloud_session');
            if (cloudSession && cloudSession.user_id === userId) {
              found = {
                id: userId,
                email: cloudSession.email,
                name: cloudSession.email ? cloudSession.email.split('@')[0] : 'Pengguna Whenya',
                avatar: '🌿',
                uniqueCode: generateUniqueCode(),
                sessionToken: sessionToken || cloudSession.access_token,
                lastLogin: new Date().toISOString(),
              };
              users.push(found);
              await setRawData(STORAGE_KEYS.AUTH_USERS_LIST, users);
            }
          }

          if (found) {
            let changed = false;

            // Retroactively generate uniqueCode for older accounts
            if (!found.uniqueCode) {
              found.uniqueCode = generateUniqueCode();
              changed = true;
            }

            // Establish session token
            if (!found.sessionToken) {
              const newToken = generateUniqueCode() + '-' + Date.now().toString(36);
              found.sessionToken = newToken;
              await setRawData(STORAGE_KEYS.SESSION_TOKEN, newToken);
              changed = true;
            } else if (!sessionToken) {
              await setRawData(STORAGE_KEYS.SESSION_TOKEN, found.sessionToken);
            }

            if (changed) await setRawData(STORAGE_KEYS.AUTH_USERS_LIST, users);
            setUser(found);

            // Pull fresh cloud data in background if connected
            if (found.email && found.sessionToken) {
              pullUserDataFromBackend(found.id, found.sessionToken);
            }
          } else {
            await setRawData(STORAGE_KEYS.AUTH_USER, null);
            await setRawData(STORAGE_KEYS.SESSION_TOKEN, null);
          }
        }
      } catch (e) {
        console.error('[Auth] initAuth error:', e);
      } finally {
        setLoading(false);
      }
    }
    initAuth();
  }, []);

  const loginWithEmail = useCallback(async (email, password) => {
    const cleanEmail = String(email || '').trim();
    if (!cleanEmail || !password) {
      throw new Error('Email dan kata sandi wajib diisi.');
    }

    const client = getSupabaseClient();
    const { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      throw new Error(friendlyAuthError(error.message));
    }

    if (!data?.user || !data?.session) {
      throw new Error('Tidak ada respon sesi dari server.');
    }

    const token = data.session.access_token;
    const userId = data.user.id;
    const displayName = data.user.user_metadata?.display_name || data.user.user_metadata?.name || cleanEmail.split('@')[0];

    const users = (await getRawData(STORAGE_KEYS.AUTH_USERS_LIST)) || [];
    let existingUser = users.find(u => u.id === userId || u.email === data.user.email);

    if (existingUser) {
      existingUser.id = userId;
      existingUser.email = data.user.email;
      existingUser.name = existingUser.name || displayName;
      existingUser.lastLogin = new Date().toISOString();
      existingUser.sessionToken = token;
      if (!existingUser.uniqueCode) existingUser.uniqueCode = generateUniqueCode();
    } else {
      existingUser = {
        id: userId,
        email: data.user.email,
        name: displayName,
        avatar: '🌿',
        uniqueCode: generateUniqueCode(),
        sessionToken: token,
        createdAt: data.user.created_at || new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };
      users.push(existingUser);
    }

    await setRawData(STORAGE_KEYS.AUTH_USERS_LIST, users);
    await setRawData(STORAGE_KEYS.AUTH_USER, userId);
    await setRawData(STORAGE_KEYS.SESSION_TOKEN, token);
    await setRawData('superapp_cloud_session', {
      access_token: token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at || null,
      user_id: userId,
      email: data.user.email,
    });
    await setRawData('superapp_session', data.session);

    setUser(existingUser);

    // Sync with backend and pull existing data from PostgreSQL
    syncUserToBackend(existingUser, token);
    await pullUserDataFromBackend(userId, token);

    return { success: true, user: existingUser };
  }, []);

  const registerWithEmail = useCallback(async (email, password, name) => {
    const cleanEmail = String(email || '').trim();
    const cleanName = String(name || '').trim();
    if (!cleanEmail || !password) {
      throw new Error('Email dan kata sandi wajib diisi.');
    }

    const client = getSupabaseClient();
    const { data, error } = await client.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          display_name: cleanName || cleanEmail.split('@')[0],
          name: cleanName,
        },
      },
    });

    if (error) {
      throw new Error(friendlyAuthError(error.message));
    }

    if (data?.session && data?.user) {
      const token = data.session.access_token;
      const userId = data.user.id;
      const displayName = cleanName || cleanEmail.split('@')[0];

      const users = (await getRawData(STORAGE_KEYS.AUTH_USERS_LIST)) || [];
      let existingUser = users.find(u => u.id === userId);
      if (!existingUser) {
        existingUser = {
          id: userId,
          email: data.user.email,
          name: displayName,
          avatar: '🌿',
          uniqueCode: generateUniqueCode(),
          sessionToken: token,
          createdAt: data.user.created_at || new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
        users.push(existingUser);
      }
      await setRawData(STORAGE_KEYS.AUTH_USERS_LIST, users);
      await setRawData(STORAGE_KEYS.AUTH_USER, userId);
      await setRawData(STORAGE_KEYS.SESSION_TOKEN, token);
      await setRawData('superapp_cloud_session', {
        access_token: token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at || null,
        user_id: userId,
        email: data.user.email,
      });
      await setRawData('superapp_session', data.session);

      setUser(existingUser);
      syncUserToBackend(existingUser, token);
      return { success: true, user: existingUser };
    }

    return {
      success: true,
      requiresVerification: true,
      message: 'Akun berhasil didaftarkan! Silakan cek email Anda untuk verifikasi atau langsung coba masuk.',
    };
  }, []);

  const login = useCallback(async (name, avatar) => {
    const users = (await getRawData(STORAGE_KEYS.AUTH_USERS_LIST)) || [];
    let existingUser = users.find(u => String(u.name || '').toLowerCase() === String(name || '').toLowerCase());

    const token = generateUniqueCode() + '-' + Date.now().toString(36);

    if (existingUser) {
      existingUser.avatar = avatar;
      existingUser.lastLogin = new Date().toISOString();
      existingUser.sessionToken = token;

      if (!existingUser.uniqueCode) {
        existingUser.uniqueCode = generateUniqueCode();
      }

      await setRawData(STORAGE_KEYS.AUTH_USERS_LIST, users);
      await setRawData(STORAGE_KEYS.AUTH_USER, existingUser.id);
      await setRawData(STORAGE_KEYS.SESSION_TOKEN, token);
      setUser(existingUser);
      return existingUser;
    }

    const newUser = {
      id: generateUserId(),
      uniqueCode: generateUniqueCode(),
      sessionToken: token,
      name: name.trim(),
      avatar,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
    users.push(newUser);
    await setRawData(STORAGE_KEYS.AUTH_USERS_LIST, users);
    await setRawData(STORAGE_KEYS.AUTH_USER, newUser.id);
    await setRawData(STORAGE_KEYS.SESSION_TOKEN, token);

    if (users.length === 1) {
      await migrateOldData(newUser.id);
    }

    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      const client = getSupabaseClient();
      await client.auth.signOut();
    } catch {}
    await setRawData(STORAGE_KEYS.AUTH_USER, null);
    await setRawData(STORAGE_KEYS.SESSION_TOKEN, null);
    await setRawData('superapp_cloud_session', null);
    await setRawData('superapp_session', null);
    setUser(null);
  }, []);

  const switchUser = useCallback(async (userId) => {
    const users = (await getRawData(STORAGE_KEYS.AUTH_USERS_LIST)) || [];
    const found = users.find(u => u.id === userId);
    if (found) {
      const token = found.sessionToken || (generateUniqueCode() + '-' + Date.now().toString(36));
      found.lastLogin = new Date().toISOString();
      found.sessionToken = token;
      if (!found.uniqueCode) {
        found.uniqueCode = generateUniqueCode();
      }
      await setRawData(STORAGE_KEYS.AUTH_USERS_LIST, users);
      await setRawData(STORAGE_KEYS.AUTH_USER, found.id);
      await setRawData(STORAGE_KEYS.SESSION_TOKEN, token);
      setUser(found);
    }
  }, []);

  const deleteUser = useCallback(async (userId) => {
    let users = (await getRawData(STORAGE_KEYS.AUTH_USERS_LIST)) || [];
    users = users.filter(u => u.id !== userId);
    await setRawData(STORAGE_KEYS.AUTH_USERS_LIST, users);

    const oldKeys = [
      'superapp_tasks', 'superapp_habits', 'superapp_transactions',
      'superapp_journal', 'superapp_goals', 'superapp_pomodoro',
      'superapp_health', 'superapp_reading', 'superapp_events',
      'superapp_reminders', 'superapp_notification_history',
    ];
    for (const key of oldKeys) {
      await setRawData(`${userId}_${key}`, null);
    }

    if (user && user.id === userId) {
      await logout();
    }
  }, [user, logout]);

  const updateProfile = useCallback(async (updates) => {
    if (!user) return null;
    const users = (await getRawData(STORAGE_KEYS.AUTH_USERS_LIST)) || [];
    const idx = users.findIndex(u => u.id === user.id);
    if (idx === -1) return null;
    const updated = { ...users[idx], ...updates };
    users[idx] = updated;
    await setRawData(STORAGE_KEYS.AUTH_USERS_LIST, users);
    setUser(updated);
    return updated;
  }, [user]);

  const getAllUsers = useCallback(async () => {
    return (await getRawData(STORAGE_KEYS.AUTH_USERS_LIST)) || [];
  }, []);

  const loginByCode = useCallback(async (code) => {
    const users = (await getRawData(STORAGE_KEYS.AUTH_USERS_LIST)) || [];
    const found = users.find(u => u.uniqueCode === code.toUpperCase().trim());
    if (found) {
      const token = found.sessionToken || (generateUniqueCode() + '-' + Date.now().toString(36));
      found.lastLogin = new Date().toISOString();
      found.sessionToken = token;

      await setRawData(STORAGE_KEYS.AUTH_USERS_LIST, users);
      await setRawData(STORAGE_KEYS.AUTH_USER, found.id);
      await setRawData(STORAGE_KEYS.SESSION_TOKEN, token);
      setUser(found);
      return { success: true, user: found };
    }
    return { success: false, error: 'User dengan kode tersebut tidak ditemukan' };
  }, []);

  const loginWithOAuth = useCallback(async (provider) => {
    if (typeof window === 'undefined') return;
    const client = getSupabaseClient();
    const { data, error } = await client.auth.signInWithOAuth({
      provider, // 'google' | 'apple'
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      throw new Error(friendlyAuthError(error.message));
    }
    if (data?.url) {
      window.location.href = data.url;
    }
  }, []);

  return (
    <UserContext.Provider value={{
      user,
      loading,
      login,
      loginWithEmail,
      loginWithOAuth,
      registerWithEmail,
      loginByCode,
      logout,
      switchUser,
      deleteUser,
      updateProfile,
      getAllUsers,
      pullUserDataFromBackend,
      AVATAR_OPTIONS,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
}

export { UserContext, AVATAR_OPTIONS };
