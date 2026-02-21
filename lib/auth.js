'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const UserContext = createContext(null);

const USERS_KEY = 'superapp_users';
const CURRENT_USER_KEY = 'superapp_current_user';

const AVATAR_OPTIONS = [
  '😎', '🦊', '🐱', '🐶', '🦁', '🐼', '🐨', '🦄',
  '🐲', '🦅', '🐺', '🦈', '🐙', '🦋', '🌟', '🔥',
  '⚡', '🚀', '💎', '🎯', '🎨', '🎮', '🎵', '🌈',
  '🍀', '🌸', '🌊', '🏔️', '🌙', '☀️', '❄️', '🪐',
];

function generateUserId() {
  return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function generateUniqueCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 for clarity
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SA-${code}`;
}

function getUsers() {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveUsers(users) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUserId() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CURRENT_USER_KEY);
}

function setCurrentUserId(id) {
  if (typeof window === 'undefined') return;
  if (id) {
    localStorage.setItem(CURRENT_USER_KEY, id);
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

// Migrate old data (no prefix) to user-namespaced keys
function migrateOldData(userId) {
  if (typeof window === 'undefined') return;
  const OLD_KEYS = [
    'superapp_tasks', 'superapp_habits', 'superapp_transactions',
    'superapp_journal', 'superapp_goals', 'superapp_pomodoro',
    'superapp_health', 'superapp_reading', 'superapp_events',
  ];
  OLD_KEYS.forEach(key => {
    const oldData = localStorage.getItem(key);
    if (oldData) {
      const newKey = `${userId}_${key}`;
      // Only migrate if new key doesn't exist yet
      if (!localStorage.getItem(newKey)) {
        localStorage.setItem(newKey, oldData);
      }
      localStorage.removeItem(key);
    }
  });
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (userId) {
      const users = getUsers();
      const found = users.find(u => u.id === userId);
      if (found) {
        // Retroactively generate uniqueCode for older accounts
        if (!found.uniqueCode) {
          found.uniqueCode = generateUniqueCode();
          saveUsers(users);
        }
        setUser(found);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((name, avatar) => {
    const users = getUsers();
    // Check if user with same name exists
    let existingUser = users.find(u => u.name.toLowerCase() === name.toLowerCase());

    if (existingUser) {
      // Update avatar if changed
      existingUser.avatar = avatar;
      existingUser.lastLogin = new Date().toISOString();
      
      // Retroactively generate uniqueCode for older accounts
      if (!existingUser.uniqueCode) {
        existingUser.uniqueCode = generateUniqueCode();
      }

      saveUsers(users);
      setCurrentUserId(existingUser.id);
      setUser(existingUser);
      return existingUser;
    }

    // Create new user
    const newUser = {
      id: generateUserId(),
      uniqueCode: generateUniqueCode(),
      name: name.trim(),
      avatar,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
    users.push(newUser);
    saveUsers(users);
    setCurrentUserId(newUser.id);

    // Migrate any old non-namespaced data to this first user
    if (users.length === 1) {
      migrateOldData(newUser.id);
    }

    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(() => {
    setCurrentUserId(null);
    setUser(null);
  }, []);

  const switchUser = useCallback((userId) => {
    const users = getUsers();
    const found = users.find(u => u.id === userId);
    if (found) {
      found.lastLogin = new Date().toISOString();
      if (!found.uniqueCode) {
        found.uniqueCode = generateUniqueCode();
      }
      saveUsers(users);
      setCurrentUserId(found.id);
      setUser(found);
    }
  }, []);

  const deleteUser = useCallback((userId) => {
    let users = getUsers();
    users = users.filter(u => u.id !== userId);
    saveUsers(users);
    // Clean up user data
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(userId + '_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    if (user && user.id === userId) {
      logout();
    }
  }, [user, logout]);

  const updateProfile = useCallback((updates) => {
    if (!user) return null;
    const users = getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx === -1) return null;
    const updated = { ...users[idx], ...updates };
    users[idx] = updated;
    saveUsers(users);
    setUser(updated);
    return updated;
  }, [user]);

  const getAllUsers = useCallback(() => getUsers(), []);

  // Login by unique code — find user in local storage by their unique code
  const loginByCode = useCallback((code) => {
    const users = getUsers();
    const found = users.find(u => u.uniqueCode === code.toUpperCase().trim());
    if (found) {
      found.lastLogin = new Date().toISOString();
      saveUsers(users);
      setCurrentUserId(found.id);
      setUser(found);
      return { success: true, user: found };
    }
    return { success: false, error: 'User dengan kode tersebut tidak ditemukan' };
  }, []);

  return (
    <UserContext.Provider value={{ user, loading, login, loginByCode, logout, switchUser, deleteUser, updateProfile, getAllUsers, AVATAR_OPTIONS }}>
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
