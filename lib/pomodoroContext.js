'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getData, setData, STORAGE_KEYS } from '@/lib/storage';
import { getToday } from '@/lib/helpers';
import { addXP, checkAchievements } from '@/lib/gamification';
import { playPomodoroDone } from '@/lib/sounds';

// ─── Notification configs ──────────────────────────────────────────────────────
export const SESSION_NOTIFICATIONS = {
  focus: {
    emoji: '🔥',
    title: 'FOKUS SELESAI!',
    messages: [
      'Luar biasa! Kamu baru saja menyelesaikan 25 menit penuh fokus! 💪',
      'MANTAP! Satu sesi Pomodoro berhasil! Produktivitasmu meningkat! 🚀',
      'YESSS! 25 menit fokus penuh selesai! Kamu luar biasa! ⚡',
      'KEREN BANGET! Otak kamu baru bekerja keras 25 menit non-stop! 🧠',
    ],
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.15)',
    border: 'rgba(139, 92, 246, 0.5)',
    badge: '🎯 +XP Didapat!',
    nextHint: '☕ Saatnya istirahat sejenak...',
  },
  break: {
    emoji: '☕',
    title: 'ISTIRAHAT SELESAI!',
    messages: [
      'Refreshed! Siap untuk sesi fokus berikutnya? Ayo gaz! 🔥',
      'Otak sudah segar! Saatnya kembali ke mode TURBO! ⚡',
      'Istirahat selesai! Energi sudah penuh, ayo lanjut! 💪',
    ],
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.5)',
    badge: '✅ Istirahat Selesai',
    nextHint: '🎯 Kembali ke mode fokus!',
  },
  longBreak: {
    emoji: '🌴',
    title: 'LONG BREAK SELESAI!',
    messages: [
      'WOW! Kamu sudah menyelesaikan 4 sesi fokus! LUAR BIASA! 🌟',
      'SUPER! Long break selesai, kamu sudah kerja keras banget hari ini! 🏆',
      'AMAZING! Istirahat panjang selesai. Siap conquer dunia lagi? 🚀',
    ],
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.15)',
    border: 'rgba(6, 182, 212, 0.5)',
    badge: '🌴 Long Break Selesai!',
    nextHint: '🎯 Siap untuk sesi baru?',
  },
};

export const MODES = {
  focus:     { label: 'Fokus',            duration: 25 * 60, color: 'var(--accent-purple)' },
  break:     { label: 'Istirahat',        duration: 5 * 60,  color: 'var(--accent-green)'  },
  longBreak: { label: 'Istirahat Panjang', duration: 15 * 60, color: 'var(--accent-cyan)'   },
};

// ─── Context ──────────────────────────────────────────────────────────────────
const PomodoroContext = createContext(null);

export function PomodoroProvider({ children }) {
  const [mode, setMode]               = useState('focus');
  const [isRunning, setIsRunning]     = useState(false);
  const [timeLeft, setTimeLeft]       = useState(25 * 60);
  const [sessions, setSessions]       = useState([]);
  const [todaySessions, setTodaySessions] = useState(0);
  const [totalFocusMin, setTotalFocusMin] = useState(0);
  const [notification, setNotification]   = useState(null);
  const [levelUpData, setLevelUpData]     = useState(null);
  const [showConfetti, setShowConfetti]   = useState(false);
  const [xpToast, setXpToast]             = useState(null);

  const intervalRef  = useRef(null);
  const wakeLockRef  = useRef(null);
  const modeRef      = useRef(mode);
  const sessionsRef  = useRef(sessions);
  const todayRef     = useRef(todaySessions);

  // Keep refs in sync so the interval closure always has fresh values
  useEffect(() => { modeRef.current = mode; },           [mode]);
  useEffect(() => { sessionsRef.current = sessions; },   [sessions]);
  useEffect(() => { todayRef.current = todaySessions; }, [todaySessions]);

  // Load stored sessions on mount
  useEffect(() => {
    const saved = getData(STORAGE_KEYS.POMODORO) || { sessions: [] };
    const list = saved.sessions || [];
    setSessions(list);
    const today = getToday();
    setTodaySessions(list.filter(s => s.date === today).length);
    setTotalFocusMin(list.reduce((sum, s) => sum + (s.duration || 25), 0));
  }, []);

  // ── Wake Lock ──────────────────────────────────────────────────────────────
  const acquireWakeLock = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      wakeLockRef.current.addEventListener('release', () => {
        wakeLockRef.current = null;
      });
    } catch (_) { /* not supported / denied — silently ignore */ }
  }, []);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  }, []);

  // Re-acquire wake lock when visibility returns (page was backgrounded)
  useEffect(() => {
    const onVisible = () => {
      if (isRunning && document.visibilityState === 'visible') acquireWakeLock();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isRunning, acquireWakeLock]);

  // ── Session completion ─────────────────────────────────────────────────────
  const completeSession = useCallback(() => {
    const currentMode = modeRef.current;
    const currentSessions = sessionsRef.current;
    const currentToday = todayRef.current;

    if (currentMode === 'focus') {
      const today = getToday();
      const newSession = { date: today, completedAt: new Date().toISOString(), duration: 25 };
      const updated = [...currentSessions, newSession];
      setSessions(updated);
      sessionsRef.current = updated;
      setData(STORAGE_KEYS.POMODORO, { sessions: updated });
      setTodaySessions(prev => prev + 1);
      setTotalFocusMin(prev => prev + 25);

      playPomodoroDone();
      const result = addXP('POMODORO_DONE');
      if (result.levelUp) {
        setLevelUpData(result.newLevel);
        setShowConfetti(true);
      }
      setXpToast(`+${result.xpGained} XP`);
      setTimeout(() => setXpToast(null), 2000);
      checkAchievements();
    }

    // Notification
    const config = SESSION_NOTIFICATIONS[currentMode];
    const message = config.messages[Math.floor(Math.random() * config.messages.length)];
    setNotification({ ...config, message });
    setTimeout(() => setNotification(null), 6000);

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`${config.emoji} ${config.title}`, { body: message });
    }

    // Auto switch mode
    if (currentMode === 'focus') {
      const nextCount = currentToday + 1;
      todayRef.current = nextCount;
      if (nextCount % 4 === 0) {
        setMode('longBreak');
        modeRef.current = 'longBreak';
        setTimeLeft(MODES.longBreak.duration);
      } else {
        setMode('break');
        modeRef.current = 'break';
        setTimeLeft(MODES.break.duration);
      }
    } else {
      setMode('focus');
      modeRef.current = 'focus';
      setTimeLeft(MODES.focus.duration);
    }

    setIsRunning(false);
    releaseWakeLock();
  }, [releaseWakeLock]);

  // ── Global interval — kept in ref, survives navigation ────────────────────
  useEffect(() => {
    if (isRunning) {
      acquireWakeLock();
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            completeSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      if (!isRunning) releaseWakeLock();
    }
    return () => {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [isRunning, completeSession, acquireWakeLock, releaseWakeLock]);

  // Request browser notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // ── Public API ─────────────────────────────────────────────────────────────
  const toggleTimer = useCallback(() => setIsRunning(r => !r), []);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(MODES[modeRef.current].duration);
  }, []);

  const switchMode = useCallback((m) => {
    setIsRunning(false);
    setMode(m);
    modeRef.current = m;
    setTimeLeft(MODES[m].duration);
  }, []);

  const dismissNotification = useCallback(() => setNotification(null), []);

  const wakeLockActive = !!wakeLockRef.current;

  return (
    <PomodoroContext.Provider value={{
      mode, isRunning, timeLeft, sessions, todaySessions, totalFocusMin,
      notification, levelUpData, showConfetti, xpToast,
      wakeLockActive,
      toggleTimer, resetTimer, switchMode,
      dismissNotification,
      setLevelUpData, setShowConfetti,
    }}>
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error('usePomodoro must be used inside PomodoroProvider');
  return ctx;
}
