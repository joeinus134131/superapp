'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getData, setData, STORAGE_KEYS } from '@/lib/storage';
import { getToday } from '@/lib/helpers';

export default function PomodoroPage() {
  const [mode, setMode] = useState('focus'); // focus | break | longBreak
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [sessions, setSessions] = useState([]);
  const [todaySessions, setTodaySessions] = useState(0);
  const [totalFocusMin, setTotalFocusMin] = useState(0);
  const intervalRef = useRef(null);

  const MODES = {
    focus: { label: 'Fokus', duration: 25 * 60, color: 'var(--accent-purple)' },
    break: { label: 'Istirahat', duration: 5 * 60, color: 'var(--accent-green)' },
    longBreak: { label: 'Istirahat Panjang', duration: 15 * 60, color: 'var(--accent-cyan)' },
  };

  useEffect(() => {
    const saved = getData(STORAGE_KEYS.POMODORO) || { sessions: [] };
    setSessions(saved.sessions || []);
    const today = getToday();
    const todayCount = (saved.sessions || []).filter(s => s.date === today).length;
    const totalMin = (saved.sessions || []).reduce((sum, s) => sum + (s.duration || 25), 0);
    setTodaySessions(todayCount);
    setTotalFocusMin(totalMin);
  }, []);

  const completeSession = useCallback(() => {
    if (mode === 'focus') {
      const today = getToday();
      const newSession = { date: today, completedAt: new Date().toISOString(), duration: 25 };
      const updated = [...sessions, newSession];
      setSessions(updated);
      setData(STORAGE_KEYS.POMODORO, { sessions: updated });
      setTodaySessions(prev => prev + 1);
      setTotalFocusMin(prev => prev + 25);
    }
    // Auto switch
    if (mode === 'focus') {
      const nextSessions = todaySessions + 1;
      if (nextSessions % 4 === 0) {
        setMode('longBreak');
        setTimeLeft(MODES.longBreak.duration);
      } else {
        setMode('break');
        setTimeLeft(MODES.break.duration);
      }
    } else {
      setMode('focus');
      setTimeLeft(MODES.focus.duration);
    }
    setIsRunning(false);
  }, [mode, sessions, todaySessions, MODES]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            completeSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, completeSession]);

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(MODES[mode].duration);
  };

  const switchMode = (m) => {
    setIsRunning(false);
    setMode(m);
    setTimeLeft(MODES[m].duration);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = 1 - (timeLeft / MODES[mode].duration);
  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - progress);

  // Weekly stats
  const getWeekStats = () => {
    const stats = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = sessions.filter(s => s.date === dateStr).length;
      stats.push({ date: dateStr, count, day: d.toLocaleDateString('id-ID', { weekday: 'short' }) });
    }
    return stats;
  };

  const weekStats = getWeekStats();
  const maxSessions = Math.max(...weekStats.map(s => s.count), 1);

  return (
    <div>
      <div className="page-header">
        <h1>⏱️ Pomodoro Timer</h1>
        <p>Fokus mendalam dengan teknik Pomodoro — 25 menit fokus, 5 menit istirahat</p>
      </div>

      <div className="stats-grid mb-3">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>🎯</div>
          <div className="stat-info">
            <h3>{todaySessions}</h3>
            <p>Sesi Hari Ini</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)' }}>⏰</div>
          <div className="stat-info">
            <h3>{todaySessions * 25}<span className="text-sm text-muted"> min</span></h3>
            <p>Fokus Hari Ini</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>📊</div>
          <div className="stat-info">
            <h3>{totalFocusMin}<span className="text-sm text-muted"> min</span></h3>
            <p>Total Fokus</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>🔥</div>
          <div className="stat-info">
            <h3>{sessions.length}</h3>
            <p>Total Sesi</p>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Timer */}
        <div className="card card-padding text-center">
          <div className="tabs" style={{ justifyContent: 'center', display: 'inline-flex', margin: '0 auto 24px' }}>
            <button className={`tab ${mode === 'focus' ? 'active' : ''}`} onClick={() => switchMode('focus')}>🎯 Fokus</button>
            <button className={`tab ${mode === 'break' ? 'active' : ''}`} onClick={() => switchMode('break')}>☕ Istirahat</button>
            <button className={`tab ${mode === 'longBreak' ? 'active' : ''}`} onClick={() => switchMode('longBreak')}>🌴 Long Break</button>
          </div>

          <div className={`timer-circle ${isRunning ? (mode === 'focus' ? 'active' : 'break-time') : ''}`}>
            <svg width="280" height="280" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
              <circle cx="140" cy="140" r="120" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
              <circle cx="140" cy="140" r="120" fill="none"
                stroke={MODES[mode].color} strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <div className="timer-time">{formatTime(timeLeft)}</div>
            <div className="timer-label">{MODES[mode].label}</div>
          </div>

          <div className="timer-controls">
            <button className="btn btn-lg btn-primary" onClick={toggleTimer} style={{ minWidth: '140px' }}>
              {isRunning ? '⏸ Pause' : '▶ Start'}
            </button>
            <button className="btn btn-lg btn-secondary" onClick={resetTimer}>🔄 Reset</button>
          </div>

          <div className="text-sm text-muted mt-2">
            Sesi ke-{todaySessions + 1} • {todaySessions % 4 === 3 && mode === 'focus' ? 'Istirahat panjang setelah ini!' : `${4 - (todaySessions % 4)} sesi lagi untuk istirahat panjang`}
          </div>
        </div>

        {/* Weekly Chart */}
        <div className="card card-padding">
          <div className="card-title mb-3">📊 Statistik Mingguan</div>
          <div className="flex items-end gap-2 justify-between" style={{ height: '200px', padding: '0 8px' }}>
            {weekStats.map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-xs font-semibold">{s.count}</span>
                <div style={{
                  width: '100%',
                  maxWidth: '40px',
                  height: `${Math.max((s.count / maxSessions) * 160, 4)}px`,
                  background: s.date === getToday() ? 'var(--gradient-primary)' : 'rgba(139, 92, 246, 0.3)',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'height 0.3s ease',
                }} />
                <span className="text-xs text-muted">{s.day}</span>
              </div>
            ))}
          </div>

          <div className="mt-3" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <div className="card-title mb-2">💡 Tips Pomodoro</div>
            <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '20px', lineHeight: '1.8' }}>
              <li>Fokus pada satu tugas per sesi</li>
              <li>Hindari gangguan selama timer berjalan</li>
              <li>Gunakan istirahat untuk stretching</li>
              <li>Setelah 4 sesi, ambil istirahat panjang</li>
              <li>Konsistensi lebih penting dari jumlah sesi</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
