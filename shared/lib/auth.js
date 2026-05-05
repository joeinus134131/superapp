'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getRawData, setRawData, STORAGE_KEYS } from './storage';

const UserContext = createContext(null);

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
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SA-${code}`;
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initAuth() {
      const userId = await getRawData(STORAGE_KEYS.AUTH_USER);
      const sessionToken = await getRawData(STORAGE_KEYS.SESSION_TOKEN);
      
      if (userId) {
        const users = await getRawData(STORAGE_KEYS.AUTH_USERS_LIST) || [];
        const found = users.find(u => u.id === userId);
        
        if (found && (!found.sessionToken || found.sessionToken === sessionToken)) {
          setUser(found);
        } else {
          await setRawData(STORAGE_KEYS.AUTH_USER, null);
          await setRawData(STORAGE_KEYS.SESSION_TOKEN, null);
        }
      }
      setLoading(false);
    }
    initAuth();
  }, []);

  const login = useCallback(async (name, avatar) => {
    const users = await getRawData(STORAGE_KEYS.AUTH_USERS_LIST) || [];
    let existingUser = users.find(u => u.name.toLowerCase() === name.toLowerCase());
    
    const token = generateUniqueCode() + '-' + Date.now().toString(36);

    if (existingUser) {
      existingUser.avatar = avatar;
      existingUser.lastLogin = new Date().toISOString();
      existingUser.sessionToken = token;
      
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

    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    await setRawData(STORAGE_KEYS.AUTH_USER, null);
    await setRawData(STORAGE_KEYS.SESSION_TOKEN, null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!user) return null;
    const users = await getRawData(STORAGE_KEYS.AUTH_USERS_LIST) || [];
    const idx = users.findIndex(u => u.id === user.id);
    if (idx === -1) return null;
    const updated = { ...users[idx], ...updates };
    users[idx] = updated;
    await setRawData(STORAGE_KEYS.AUTH_USERS_LIST, users);
    setUser(updated);
    return updated;
  }, [user]);

  return (
    <UserContext.Provider value={{ user, loading, login, logout, updateProfile, AVATAR_OPTIONS }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
}
