'use client';

import { useState, useEffect } from 'react';
import { getData, setData, STORAGE_KEYS } from '@/lib/storage';
import { generateId, getToday } from '@/lib/helpers';

export default function HabitsPage() {
  const [habits, setHabits] = useState([]);
  const [newHabit, setNewHabit] = useState('');
  const [newEmoji, setNewEmoji] = useState('⭐');
  const today = getToday();

  useEffect(() => {
    const saved = getData(STORAGE_KEYS.HABITS);
    if (saved) setHabits(saved);
  }, []);

  const save = (h) => { setHabits(h); setData(STORAGE_KEYS.HABITS, h); };

  const addHabit = (e) => {
    e.preventDefault();
    if (!newHabit.trim()) return;
    save([...habits, {
      id: generateId(),
      name: newHabit.trim(),
      emoji: newEmoji,
      completedDates: [],
      streak: 0,
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

      return { ...h, completedDates: newDates, streak };
    }));
  };

  const deleteHabit = (id) => save(habits.filter(h => h.id !== id));

  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  };

  const last7 = getLast7Days();
  const todayCompleted = habits.filter(h => h.completedDates && h.completedDates.includes(today)).length;
  const completionRate = habits.length > 0 ? Math.round((todayCompleted / habits.length) * 100) : 0;
  const maxStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);

  const HABIT_EMOJIS = ['⭐', '💪', '📚', '🧘', '🏃', '💧', '🥗', '😴', '✍️', '🎯', '🧹', '💊'];

  return (
    <div>
      <div className="page-header">
        <h1>🔥 Habit Tracker</h1>
        <p>Bangun kebiasaan baik dan raih streak terpanjang!</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>✅</div>
          <div className="stat-info">
            <h3>{todayCompleted}<span className="text-sm text-muted">/{habits.length}</span></h3>
            <p>Selesai Hari Ini</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>📊</div>
          <div className="stat-info">
            <h3>{completionRate}%</h3>
            <p>Completion Rate</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>🔥</div>
          <div className="stat-info">
            <h3>{maxStreak}</h3>
            <p>Streak Terpanjang</p>
          </div>
        </div>
      </div>

      {/* Add Habit */}
      <form onSubmit={addHabit} className="card card-padding mb-3">
        <div className="card-title mb-2">➕ Tambah Kebiasaan Baru</div>
        <div className="flex gap-1 items-center">
          <div className="flex gap-1 flex-wrap" style={{ maxWidth: '200px' }}>
            {HABIT_EMOJIS.map(e => (
              <button key={e} type="button" className={`mood-btn ${newEmoji === e ? 'selected' : ''}`}
                style={{ width: '32px', height: '32px', fontSize: '16px' }}
                onClick={() => setNewEmoji(e)}>
                {e}
              </button>
            ))}
          </div>
          <input className="form-input" value={newHabit} onChange={e => setNewHabit(e.target.value)}
            placeholder="Nama kebiasaan baru..." style={{ flex: 1 }} />
          <button type="submit" className="btn btn-primary">Tambah</button>
        </div>
      </form>

      {/* 7-Day Grid */}
      <div className="card card-padding mb-3">
        <div className="card-title mb-2">📅 7 Hari Terakhir</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>Habit</th>
                {last7.map(d => (
                  <th key={d} style={{ textAlign: 'center', padding: '8px', fontSize: '11px', color: d === today ? 'var(--accent-purple)' : 'var(--text-muted)', fontWeight: d === today ? '700' : '500' }}>
                    {new Date(d).toLocaleDateString('id-ID', { weekday: 'short' })}
                    <br />{new Date(d).getDate()}
                  </th>
                ))}
                <th style={{ textAlign: 'center', padding: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>🔥</th>
              </tr>
            </thead>
            <tbody>
              {habits.map(h => (
                <tr key={h.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '8px', fontSize: '14px' }}>
                    <span style={{ marginRight: '6px' }}>{h.emoji}</span>{h.name}
                  </td>
                  {last7.map(d => {
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
                  <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--accent-yellow)' }}>
                    {h.streak || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {habits.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🔥</div>
            <h3>Belum ada habit</h3>
            <p>Mulai tambahkan kebiasaan baik pertamamu!</p>
          </div>
        )}
      </div>

      {/* Habits List */}
      <div className="card card-padding">
        <div className="card-title mb-2">📋 Daftar Kebiasaan</div>
        {habits.map(h => {
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
                  🔥 Streak: {h.streak || 0} hari • Total: {h.completedDates ? h.completedDates.length : 0} hari
                </div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => deleteHabit(h.id)}>🗑</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
