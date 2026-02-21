'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getData, setData, STORAGE_KEYS } from '@/lib/storage';
import { generateId, getToday } from '@/lib/helpers';
import { addXP, checkAchievements } from '@/lib/gamification';
import { playHabitDone, playStreakBreak, playXPGain } from '@/lib/sounds';
import { getStreakDeathMessage } from '@/lib/roast';
import StreakDeath from '@/components/StreakDeath';
import Confetti from '@/components/Confetti';
import LevelUpModal from '@/components/LevelUpModal';
import { useLanguage } from '@/lib/language';
import {
  Flame, CheckSquare, TrendingUp, Plus, CalendarDays,
  ListTodo, Trash2
} from 'lucide-react';

export default function HabitsPage() {
  const { t } = useLanguage();
  const [habits, setHabits] = useState([]);
  const [newHabit, setNewHabit] = useState('');
  const [newEmoji, setNewEmoji] = useState('⭐');
  const [showConfetti, setShowConfetti] = useState(false);
  const [levelUpData, setLevelUpData] = useState(null);
  const [xpToast, setXpToast] = useState(null);
  const [streakDeathMsg, setStreakDeathMsg] = useState(null);
  const [dateOffset, setDateOffset] = useState(0); // Offset in days
  const [historyPage, setHistoryPage] = useState(1);
  const [listPage, setListPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const today = getToday();

  useEffect(() => {
    const saved = getData(STORAGE_KEYS.HABITS);
    if (saved) setHabits(saved);
  }, []);

  const save = (h) => { setHabits(h); setData(STORAGE_KEYS.HABITS, h); };

  const showXPToast = (text) => {
    setXpToast(text);
    setTimeout(() => setXpToast(null), 2000);
  };

  const addHabit = (e) => {
    e.preventDefault();
    if (!newHabit.trim()) return;
    save([...habits, {
      id: generateId(),
      name: newHabit.trim(),
      emoji: newEmoji,
      completedDates: [],
      streak: 0,
      bestStreak: 0,
      createdAt: new Date().toISOString()
    }]);
    setNewHabit('');
  };

  const toggleHabit = (id) => {
    save(habits.map(h => {
      if (h.id !== id) return h;
      const dates = h.completedDates || [];
      const isCompleted = dates.includes(today);
      let newDates;
      if (isCompleted) {
        newDates = dates.filter(d => d !== today);
      } else {
        newDates = [...dates, today];
      }

      // Calculate streak
      let streak = 0;
      const sorted = [...newDates].sort().reverse();
      const todayDate = new Date(today);
      for (let i = 0; i < sorted.length; i++) {
        const check = new Date(today);
        check.setDate(todayDate.getDate() - i);
        const checkStr = check.toISOString().split('T')[0];
        if (sorted.includes(checkStr)) {
          streak++;
        } else {
          break;
        }
      }

      const oldStreak = h.streak || 0;
      const bestStreak = Math.max(h.bestStreak || 0, streak);

      // Streak death detection
      if (!isCompleted && oldStreak >= 3 && streak === 0) {
        // Was completing, but somehow streak reset — not applicable here
      }

      // Completing habit
      if (!isCompleted) {
        playHabitDone();
        const result = addXP('HABIT_DONE');
        if (result.levelUp) {
          setLevelUpData(result.newLevel);
          setShowConfetti(true);
        }
        showXPToast(`+${result.xpGained} XP`);

        // Streak milestones
        if (streak === 7) {
          addXP('STREAK_7');
          setShowConfetti(true);
          showXPToast('+50 XP 🔥 7 Day Streak!');
        }
        if (streak === 30) {
          addXP('STREAK_30');
          setShowConfetti(true);
          showXPToast('+200 XP 🏔️ 30 Day Streak!');
        }

        checkAchievements();
      }

      // Un-completing — check if streak breaks
      if (isCompleted && oldStreak >= 3 && streak < oldStreak) {
        playStreakBreak();
        setStreakDeathMsg(getStreakDeathMessage(oldStreak));
      }

      return { ...h, completedDates: newDates, streak, bestStreak };
    }));
  };

  const deleteHabit = (id) => save(habits.filter(h => h.id !== id));

  const getVisibleDays = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i - dateOffset);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      days.push(`${year}-${month}-${day}`);
    }
    return days;
  };

  const visibleDays = getVisibleDays();

  const handlePrevDays = () => setDateOffset(prev => prev + 7);
  const handleNextDays = () => setDateOffset(prev => Math.max(0, prev - 7));

  const todayCompleted = habits.filter(h => h.completedDates && h.completedDates.includes(today)).length;
  const completionRate = habits.length > 0 ? Math.round((todayCompleted / habits.length) * 100) : 0;
  const maxStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);

  const HABIT_EMOJIS = ['⭐', '💪', '📚', '🧘', '🏃', '💧', '🥗', '😴', '✍️', '🎯', '🧹', '💊'];

  return (
    <div>
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />
      {levelUpData && <LevelUpModal level={levelUpData} onClose={() => setLevelUpData(null)} />}
      {xpToast && <div className="xp-toast">⚡ {xpToast}</div>}
      <StreakDeath message={streakDeathMsg} onDismiss={() => setStreakDeathMsg(null)} />

      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Flame size={32} color="var(--accent-red)" /> {t('habits.title')}</h1>
        <p>{t('habits.desc')}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' }}><CheckSquare size={28} /></div>
          <div className="stat-info">
            <h3>{todayCompleted}<span className="text-sm text-muted">/{habits.length}</span></h3>
            <p>{t('habits.completed_today')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)' }}><TrendingUp size={28} /></div>
          <div className="stat-info">
            <h3>{completionRate}%</h3>
            <p>{t('habits.completion_rate')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)' }}><Flame size={28} /></div>
          <div className="stat-info">
            <h3>{maxStreak}</h3>
            <p>{t('habits.longest_streak')}</p>
          </div>
        </div>
      </div>

      {/* Add Habit */}
      <form onSubmit={addHabit} className="card card-padding mb-3">
        <div className="card-title mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Plus size={20} /> {t('habits.add_habit')}</div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-1 flex-wrap" style={{ maxWidth: '100%' }}>
            {HABIT_EMOJIS.map(e => (
              <button key={e} type="button" className={`mood-btn ${newEmoji === e ? 'selected' : ''}`}
                style={{ width: '32px', height: '32px', fontSize: '16px' }}
                onClick={() => setNewEmoji(e)}>
                {e}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <input className="form-input" value={newHabit} onChange={e => setNewHabit(e.target.value)}
              placeholder={t('habits.habit_name_placeholder')} style={{ flex: 1 }} />
            <button type="submit" className="btn btn-primary">{t('habits.add_btn')}</button>
          </div>
        </div>
      </form>

      {/* History Grid */}
      <div className="card card-padding mb-3">
        <div className="flex justify-between items-center mb-2">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CalendarDays size={20} /> {t('habits.history')}</div>
            <div className="flex gap-2">
                <button onClick={handlePrevDays} className="btn btn-secondary btn-sm">{t('habits.prev_short')}</button>
                <button onClick={handleNextDays} className="btn btn-secondary btn-sm" disabled={dateOffset === 0}>{t('habits.next_short')}</button>
            </div>
        </div>
        <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>{t('habits.habit_th')}</th>
                {visibleDays.map(d => (
                  <th key={d} style={{ textAlign: 'center', padding: '8px', fontSize: '11px', color: d === today ? 'var(--accent-purple)' : 'var(--text-muted)', fontWeight: d === today ? '700' : '500' }}>
                    {new Date(d).toLocaleDateString('id-ID', { weekday: 'short' })}
                    <br />{new Date(d).getDate()}
                  </th>
                ))}
                <th style={{ textAlign: 'center', padding: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}><Flame size={16} style={{ display: 'inline', color: 'var(--accent-red)' }} /></th>
              </tr>
            </thead>
            <tbody>
              {habits.slice((historyPage - 1) * ITEMS_PER_PAGE, historyPage * ITEMS_PER_PAGE).map(h => (
                <tr key={h.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '8px', fontSize: '14px', whiteSpace: 'nowrap' }}>
                    <span style={{ marginRight: '6px' }}>{h.emoji}</span>{h.name}
                  </td>
                  {visibleDays.map(d => {
                    const done = h.completedDates && h.completedDates.includes(d);
                    const isToday = d === today;
                    return (
                      <td key={d} style={{ textAlign: 'center', padding: '4px' }}>
                        <div
                          className={`heatmap-cell ${done ? 'completed' : ''}`}
                          style={{
                            margin: '0 auto',
                            cursor: isToday ? 'pointer' : 'default',
                            opacity: isToday ? 1 : 0.8,
                          }}
                          onClick={() => isToday && toggleHabit(h.id)}
                        >
                          {done ? '✓' : ''}
                        </div>
                      </td>
                    );
                  })}
                  <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--accent-yellow)', padding: '8px' }}>
                    {h.streak || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {habits.length > ITEMS_PER_PAGE && (
            <div className="flex justify-between items-center mt-3 border-t border-color pt-3">
                <span className="text-sm text-secondary">
                    {t('habits.showing')} {(historyPage - 1) * ITEMS_PER_PAGE + 1} {t('habits.to')} {Math.min(historyPage * ITEMS_PER_PAGE, habits.length)} {t('habits.of_habits')} {habits.length} {t('habits.habits_word')}
                </span>
                <div className="flex gap-2">
                    <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1} className="btn btn-secondary btn-sm">{t('habits.prev')}</button>
                    <button onClick={() => setHistoryPage(p => p + 1)} disabled={historyPage * ITEMS_PER_PAGE >= habits.length} className="btn btn-secondary btn-sm">{t('habits.next')}</button>
                </div>
            </div>
        )}
        {habits.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}><Flame size={48} color="var(--accent-red)" /></div>
            <h3>{t('habits.no_habits_yet')}</h3>
            <p>{t('habits.start_adding')}</p>
          </div>
        )}
      </div>

      {/* Habits List */}
      <div className="card card-padding">
        <div className="card-title mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ListTodo size={20} /> {t('habits.habit_list')}</div>
        {habits.slice((listPage - 1) * ITEMS_PER_PAGE, listPage * ITEMS_PER_PAGE).map(h => {
          const todayDone = h.completedDates && h.completedDates.includes(today);
          return (
            <div key={h.id} className="list-item">
              <div className={`checkbox ${todayDone ? 'checked' : ''}`} onClick={() => toggleHabit(h.id)}>
                {todayDone ? '✓' : ''}
              </div>
              <span style={{ fontSize: '20px' }}>{h.emoji}</span>
              <div className="flex-1">
                <div className="font-semibold" style={{ opacity: todayDone ? 0.6 : 1, textDecoration: todayDone ? 'line-through' : 'none' }}>
                  {h.name}
                </div>
                <div className="text-xs text-muted">
                  <Flame size={12} style={{ display: 'inline', color: 'var(--accent-red)' }} /> {t('habits.streak')}: {h.streak || 0} {t('habits.days')} • {t('habits.best')}: {h.bestStreak || 0} • {t('habits.total')}: {h.completedDates ? h.completedDates.length : 0} {t('habits.days')}
                </div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => deleteHabit(h.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></button>
            </div>
          );
        })}
        
        {habits.length > ITEMS_PER_PAGE && (
            <div className="flex justify-between items-center mt-3 border-t border-color pt-3">
                <span className="text-sm text-secondary">
                    {t('habits.page')} {listPage} {t('habits.of')} {Math.ceil(habits.length / ITEMS_PER_PAGE)}
                </span>
                <div className="flex gap-2">
                    <button onClick={() => setListPage(p => Math.max(1, p - 1))} disabled={listPage === 1} className="btn btn-secondary btn-sm">{t('habits.prev')}</button>
                    <button onClick={() => setListPage(p => p + 1)} disabled={listPage * ITEMS_PER_PAGE >= habits.length} className="btn btn-secondary btn-sm">{t('habits.next')}</button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
