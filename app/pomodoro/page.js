'use client';

import { usePomodoro, MODES, SESSION_NOTIFICATIONS } from '@/lib/pomodoroContext';
import { getToday } from '@/lib/helpers';
import Confetti from '@/components/Confetti';
import LevelUpModal from '@/components/LevelUpModal';
import { useLanguage } from '@/lib/language';
import {
  Timer, Target, Clock, BarChart2, Flame, Coffee,
  TreePalm, Play, Pause, RefreshCw, Lightbulb, Zap, X
} from 'lucide-react';

export default function PomodoroPage() {
  const { t } = useLanguage();
  const {
    mode, isRunning, timeLeft, sessions, todaySessions, totalFocusMin,
    notification, levelUpData, showConfetti, xpToast, wakeLockActive,
    toggleTimer, resetTimer, switchMode,
    dismissNotification, setLevelUpData, setShowConfetti,
  } = usePomodoro();

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
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />
      {levelUpData && <LevelUpModal level={levelUpData} onClose={() => setLevelUpData(null)} />}
      {xpToast && <div className="xp-toast" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={16} color="var(--accent-yellow)" /> {xpToast}</div>}

      {/* Session Completion Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            maxWidth: '360px',
            borderRadius: '16px',
            padding: '20px',
            background: notification.bg,
            border: `2px solid ${notification.border}`,
            backdropFilter: 'blur(16px)',
            boxShadow: `0 8px 32px ${notification.border}, 0 0 0 1px rgba(255,255,255,0.05)`,
            animation: 'slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ fontSize: '40px', lineHeight: 1, flexShrink: 0 }}>{notification.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '15px', color: notification.color, letterSpacing: '0.5px', marginBottom: '6px' }}>
                {notification.title}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '10px' }}>
                {notification.message}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', background: notification.color, color: '#fff', fontSize: '11px', fontWeight: 700 }}>
                  {notification.badge}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{notification.nextHint}</span>
              </div>
            </div>
            <button onClick={dismissNotification} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={14} /></button>
          </div>
          <div style={{ marginTop: '12px', height: '3px', borderRadius: '3px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: notification.color, borderRadius: '3px', animation: 'drainBar 6s linear forwards' }} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight { from { transform: translateX(120%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes drainBar { from { width: 100%; } to { width: 0%; } }
      `}</style>

      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Timer size={32} color="var(--accent-purple)" /> {t('pomodoro.title')}</h1>
            <p>{t('pomodoro.desc')}</p>
          </div>
          {/* Wake Lock indicator */}
          {wakeLockActive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', fontSize: '12px', color: 'var(--accent-green)' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              {t('pomodoro.wake_lock')}
            </div>
          )}
        </div>
      </div>

      <div className="stats-grid mb-3">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)' }}><Target size={28} /></div>
          <div className="stat-info"><h3>{todaySessions}</h3><p>{t('pomodoro.sessions_today')}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)' }}><Clock size={28} /></div>
          <div className="stat-info"><h3>{todaySessions * 25}<span className="text-sm text-muted">min</span></h3><p>{t('pomodoro.focus_today')}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' }}><BarChart2 size={28} /></div>
          <div className="stat-info"><h3>{totalFocusMin}<span className="text-sm text-muted">min</span></h3><p>{t('pomodoro.total_focus')}</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-yellow)' }}><Flame size={28} /></div>
          <div className="stat-info"><h3>{sessions.length}</h3><p>{t('pomodoro.total_sessions')}</p></div>
        </div>
      </div>

      <div className="grid-2">
        {/* Timer */}
        <div className="card card-padding text-center">
          <div className="tabs" style={{ justifyContent: 'center', display: 'inline-flex', margin: '0 auto 24px' }}>
            <button className={`tab ${mode === 'focus' ? 'active' : ''}`} onClick={() => switchMode('focus')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Target size={16} /> {t('pomodoro.focus_tab')}</button>
            <button className={`tab ${mode === 'break' ? 'active' : ''}`} onClick={() => switchMode('break')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Coffee size={16} /> {t('pomodoro.break_tab')}</button>
            <button className={`tab ${mode === 'longBreak' ? 'active' : ''}`} onClick={() => switchMode('longBreak')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><TreePalm size={16} /> {t('pomodoro.long_break_tab')}</button>
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
            <button className="btn btn-lg btn-primary" onClick={toggleTimer} style={{ minWidth: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {isRunning ? <><Pause size={18} /> {t('pomodoro.pause')}</> : <><Play size={18} /> {t('pomodoro.start')}</>}
            </button>
            <button className="btn btn-lg btn-secondary" onClick={resetTimer} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><RefreshCw size={18} /> {t('pomodoro.reset')}</button>
          </div>

          <div className="text-sm text-muted mt-2">
            {t('pomodoro.session_prefix')}{todaySessions + 1} • {todaySessions % 4 === 3 && mode === 'focus' ? t('pomodoro.long_break_after') : `${4 - (todaySessions % 4)} ${t('pomodoro.sessions_until_long')}`}
          </div>
        </div>

        {/* Weekly Chart */}
        <div className="card card-padding">
          <div className="card-title mb-3" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart2 size={20} /> {t('pomodoro.weekly_stats')}</div>
          <div className="flex items-end gap-2 justify-between" style={{ height: '200px', padding: '0 8px' }}>
            {weekStats.map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-xs font-semibold">{s.count}</span>
                <div style={{
                  width: '100%', maxWidth: '40px',
                  height: `${Math.max((s.count / maxSessions) * 160, 4)}px`,
                  background: s.date === getToday() ? 'var(--gradient-primary)' : 'rgba(139, 92, 246, 0.3)',
                  borderRadius: 'var(--radius-sm)', transition: 'height 0.3s ease',
                }} />
                <span className="text-xs text-muted">{s.day}</span>
              </div>
            ))}
          </div>

          <div className="mt-3" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <div className="card-title mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Lightbulb size={20} color="var(--accent-yellow)" /> {t('pomodoro.tips_title')}</div>
            <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '20px', lineHeight: '1.8' }}>
              <li>{t('pomodoro.tip_1')}</li>
              <li>{t('pomodoro.tip_2')}</li>
              <li>{t('pomodoro.tip_3')}</li>
              <li>{t('pomodoro.tip_4')}</li>
              <li>{t('pomodoro.tip_5')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
