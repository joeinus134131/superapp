'use client';

import { useState, useEffect } from 'react';
import { getData, STORAGE_KEYS } from '@/lib/storage';
import { getRandomQuote, getToday, formatCurrency } from '@/lib/helpers';

export default function Dashboard() {
  const [stats, setStats] = useState({
    tasksCompleted: 0,
    tasksTotal: 0,
    habitsToday: 0,
    habitsTotal: 0,
    streak: 0,
    totalIncome: 0,
    totalExpense: 0,
    focusSessions: 0,
    goalsActive: 0,
    booksReading: 0,
    journalEntries: 0,
    workoutsThisWeek: 0,
  });
  const [quote] = useState(getRandomQuote());
  const today = getToday();

  useEffect(() => {
    const tasks = getData(STORAGE_KEYS.TASKS) || [];
    const habits = getData(STORAGE_KEYS.HABITS) || [];
    const transactions = getData(STORAGE_KEYS.TRANSACTIONS) || [];
    const pomodoro = getData(STORAGE_KEYS.POMODORO) || { sessions: [] };
    const goals = getData(STORAGE_KEYS.GOALS) || [];
    const books = getData(STORAGE_KEYS.READING) || [];
    const journal = getData(STORAGE_KEYS.JOURNAL) || [];
    const health = getData(STORAGE_KEYS.HEALTH) || { workouts: [] };

    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const todayHabits = habits.filter(h => h.completedDates && h.completedDates.includes(today)).length;

    // Calculate longest current streak from habits
    let maxStreak = 0;
    habits.forEach(h => {
      if (h.streak && h.streak > maxStreak) maxStreak = h.streak;
    });

    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const todaySessions = pomodoro.sessions
      ? pomodoro.sessions.filter(s => s.date === today).length
      : 0;

    const activeGoals = goals.filter(g => !g.completed).length;
    const readingBooks = books.filter(b => b.status === 'reading').length;

    // Workouts this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const workoutsWeek = health.workouts
      ? health.workouts.filter(w => new Date(w.date) >= weekAgo).length
      : 0;

    setStats({
      tasksCompleted: completedTasks,
      tasksTotal: tasks.length,
      habitsToday: todayHabits,
      habitsTotal: habits.length,
      streak: maxStreak,
      totalIncome: income,
      totalExpense: expense,
      focusSessions: todaySessions,
      goalsActive: activeGoals,
      booksReading: readingBooks,
      journalEntries: journal.length,
      workoutsThisWeek: workoutsWeek,
    });
  }, [today]);

  const greetingTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 17) return 'Selamat Siang';
    if (hour < 20) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  return (
    <div>
      <div className="page-header">
        <h1>{greetingTime()} 👋</h1>
        <p>Ini adalah ringkasan aktivitas dan progres kamu hari ini.</p>
      </div>

      {/* Motivational Quote */}
      <div className="quote-card mb-3">
        <p className="quote-text">{quote.text}</p>
        <p className="quote-author">— {quote.author}</p>
      </div>

      {/* Main Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>✅</div>
          <div className="stat-info">
            <h3>{stats.tasksCompleted}<span className="text-sm text-muted">/{stats.tasksTotal}</span></h3>
            <p>Tasks Selesai</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>🔥</div>
          <div className="stat-info">
            <h3>{stats.streak}</h3>
            <p>Streak Terpanjang</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>💰</div>
          <div className="stat-info">
            <h3 className="text-lg">{formatCurrency(stats.totalIncome - stats.totalExpense)}</h3>
            <p>Saldo Bersih</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(6, 182, 212, 0.15)' }}>⏱️</div>
          <div className="stat-info">
            <h3>{stats.focusSessions}</h3>
            <p>Sesi Fokus Hari Ini</p>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid-2 mb-3">
        <div className="card card-padding">
          <div className="card-title mb-2">📈 Progress Hari Ini</div>
          <div className="flex flex-col gap-2">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-secondary">Habits Selesai</span>
                <span className="text-sm font-semibold">{stats.habitsToday}/{stats.habitsTotal}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill green" style={{ 
                  width: stats.habitsTotal > 0 ? `${(stats.habitsToday / stats.habitsTotal) * 100}%` : '0%' 
                }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-secondary">Tasks Selesai</span>
                <span className="text-sm font-semibold">{stats.tasksCompleted}/{stats.tasksTotal}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ 
                  width: stats.tasksTotal > 0 ? `${(stats.tasksCompleted / stats.tasksTotal) * 100}%` : '0%' 
                }} />
              </div>
            </div>
          </div>
        </div>

        <div className="card card-padding">
          <div className="card-title mb-2">🏆 Quick Stats</div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span className="text-sm text-secondary">🎯 Goals Aktif</span>
              <span className="font-semibold">{stats.goalsActive}</span>
            </div>
            <div className="flex justify-between items-center" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span className="text-sm text-secondary">📚 Sedang Dibaca</span>
              <span className="font-semibold">{stats.booksReading}</span>
            </div>
            <div className="flex justify-between items-center" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span className="text-sm text-secondary">📝 Total Jurnal</span>
              <span className="font-semibold">{stats.journalEntries}</span>
            </div>
            <div className="flex justify-between items-center" style={{ padding: '6px 0' }}>
              <span className="text-sm text-secondary">💪 Workout Minggu Ini</span>
              <span className="font-semibold">{stats.workoutsThisWeek}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Finance Summary */}
      <div className="grid-2">
        <div className="card card-padding">
          <div className="card-title mb-2">💵 Keuangan</div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center" style={{ padding: '8px 0' }}>
              <span className="text-sm text-secondary">Pemasukan</span>
              <span className="font-semibold text-green">{formatCurrency(stats.totalIncome)}</span>
            </div>
            <div className="flex justify-between items-center" style={{ padding: '8px 0' }}>
              <span className="text-sm text-secondary">Pengeluaran</span>
              <span className="font-semibold text-red">{formatCurrency(stats.totalExpense)}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Saldo</span>
                <span className="font-bold text-lg" style={{ color: stats.totalIncome - stats.totalExpense >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {formatCurrency(stats.totalIncome - stats.totalExpense)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card card-padding">
          <div className="card-title mb-2">🚀 Quick Actions</div>
          <div className="flex flex-col gap-1">
            <a href="/tasks" className="btn btn-secondary w-full" style={{ justifyContent: 'flex-start' }}>
              ✅ Tambah Task Baru
            </a>
            <a href="/journal" className="btn btn-secondary w-full" style={{ justifyContent: 'flex-start' }}>
              📝 Tulis Jurnal
            </a>
            <a href="/pomodoro" className="btn btn-secondary w-full" style={{ justifyContent: 'flex-start' }}>
              ⏱️ Mulai Fokus
            </a>
            <a href="/finance" className="btn btn-secondary w-full" style={{ justifyContent: 'flex-start' }}>
              💰 Catat Transaksi
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
