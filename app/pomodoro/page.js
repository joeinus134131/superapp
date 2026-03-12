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
import PomodoroSoundscapes from '@/components/PomodoroSoundscapes';

export default function PomodoroPage() {
  const { t } = useLanguage();
  const {
    mode, isRunning, timeLeft, sessions, todaySessions, totalFocusMin,
    notification, levelUpData, showConfetti, xpToast, wakeLockActive,
    autoStart, toggleTimer, resetTimer, switchMode, toggleAutoStart,
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

  // Streak journey stats (21 days)
  const getStreakStats = () => {
    const stats = [];
    for (let i = 20; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = sessions.filter(s => s.date === dateStr).length;
      stats.push({
        date: dateStr,
        count,
        day: d.toLocaleDateString('id-ID', { weekday: 'short' }),
        dayNum: d.getDate(),
        month: d.toLocaleDateString('id-ID', { month: 'short' }),
        isToday: dateStr === getToday(),
      });
    }
    return stats;
  };

  const streakStats = getStreakStats();
  const maxSessions = Math.max(...streakStats.map(s => s.count), 1);
  
  // Calculate current streak
  const getCurrentStreak = () => {
    let streak = 0;
    for (let i = streakStats.length - 1; i >= 0; i--) {
      if (streakStats[i].count > 0) streak++;
      else break;
    }
    return streak;
  };
  const currentStreak = getCurrentStreak();

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

          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <input 
                type="checkbox" 
                checked={autoStart} 
                onChange={toggleAutoStart}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
              />
              {t('pomodoro.auto_start', 'Auto-start Next Session')}
            </label>
          </div>

          {/* Premium Soundscapes */}
          <PomodoroSoundscapes isTimerRunning={isRunning} />

          <div className="text-sm text-muted mt-2">
            {t('pomodoro.session_prefix')}{todaySessions + 1} • {todaySessions % 4 === 3 && mode === 'focus' ? t('pomodoro.long_break_after') : `${4 - (todaySessions % 4)} ${t('pomodoro.sessions_until_long')}`}
          </div>
        </div>

        {/* Streak Journey */}
        <div className="card card-padding">
          <div className="flex justify-between items-center mb-3">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart2 size={20} /> {t('pomodoro.weekly_stats')}</div>
            {currentStreak > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '12px', fontWeight: 700, color: 'var(--accent-yellow)' }}>
                <Flame size={14} /> {currentStreak} Day Streak
              </div>
            )}
          </div>

          {/* Scrollable Streak Journey */}
          <div style={{
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            padding: '8px 0 12px',
            margin: '0 -4px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(139,92,246,0.3) transparent',
          }}>
            <div style={{ display: 'flex', gap: '8px', minWidth: 'max-content', padding: '0 4px' }}>
              {streakStats.map((s, i) => (
                <div key={i} style={{
                  scrollSnapAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  minWidth: '56px',
                }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>{s.day}</span>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: s.count > 0 ? '16px' : '14px',
                    fontWeight: 700,
                    background: s.count > 0
                      ? 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.3))'
                      : 'rgba(255,255,255,0.03)',
                    border: s.isToday
                      ? '2px solid var(--accent-purple)'
                      : s.count > 0
                        ? '2px solid rgba(139,92,246,0.4)'
                        : '2px solid rgba(255,255,255,0.06)',
                    color: s.count > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: s.isToday
                      ? '0 0 12px rgba(139,92,246,0.4), inset 0 0 8px rgba(139,92,246,0.1)'
                      : s.count > 0
                        ? '0 0 8px rgba(139,92,246,0.15)'
                        : 'none',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                  }}>
                    {s.count > 0 ? (
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
                        <span style={{ fontSize: '10px', lineHeight: 1 }}>🔥</span>
                        <span style={{ fontSize: '13px', fontWeight: 800, marginTop: '1px' }}>{s.count}</span>
                      </span>
                    ) : (
                      <span style={{ fontSize: '13px' }}>—</span>
                    )}
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: s.isToday ? 700 : 500,
                    color: s.isToday ? 'var(--accent-purple)' : 'var(--text-muted)',
                  }}>
                    {s.isToday ? 'Hari ini' : s.dayNum}
                  </span>
                </div>
              ))}
            </div>
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
