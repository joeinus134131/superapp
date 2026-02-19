'use client';

import { useState, useEffect, useCallback } from 'react';
import { getData, STORAGE_KEYS } from '@/lib/storage';
import { getRandomQuote, getToday, formatCurrency } from '@/lib/helpers';
import { useUser } from '@/lib/auth';
import { getXP, getCurrentLevel, getXPProgress, checkDailyLogin, checkAchievements, addXP } from '@/lib/gamification';
import { getRoastMessage } from '@/lib/roast';
import { playAchievement } from '@/lib/sounds';
import Confetti from '@/components/Confetti';
import LevelUpModal from '@/components/LevelUpModal';

export default function Dashboard() {
  const { user } = useUser();
  const [stats, setStats] = useState({
    tasksCompleted: 0, tasksTotal: 0, habitsToday: 0, habitsTotal: 0,
    streak: 0, totalIncome: 0, totalExpense: 0, focusSessions: 0,
    goalsActive: 0, booksReading: 0, journalEntries: 0, workoutsThisWeek: 0,
  });
  const [quote] = useState(getRandomQuote());
  const [roast, setRoast] = useState(null);
  const [gamData, setGamData] = useState({ totalXP: 0 });
  const [showConfetti, setShowConfetti] = useState(false);
  const [levelUpData, setLevelUpData] = useState(null);
  const [newAchievements, setNewAchievements] = useState([]);
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
    let maxStreak = 0;
    habits.forEach(h => { if (h.streak && h.streak > maxStreak) maxStreak = h.streak; });
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const todaySessions = pomodoro.sessions ? pomodoro.sessions.filter(s => s.date === today).length : 0;
    const activeGoals = goals.filter(g => !g.completed).length;
    const readingBooks = books.filter(b => b.status === 'reading').length;
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const workoutsWeek = health.workouts ? health.workouts.filter(w => new Date(w.date) >= weekAgo).length : 0;

    const newStats = {
      tasksCompleted: completedTasks, tasksTotal: tasks.length,
      habitsToday: todayHabits, habitsTotal: habits.length,
      streak: maxStreak, totalIncome: income, totalExpense: expense,
      focusSessions: todaySessions, goalsActive: activeGoals,
      booksReading: readingBooks, journalEntries: journal.length,
      workoutsThisWeek: workoutsWeek,
    };
    setStats(newStats);

    // Gamification
    const loginResult = checkDailyLogin();
    if (loginResult.levelUp) {
      setLevelUpData(loginResult.newLevel);
      setShowConfetti(true);
    }
    setGamData(getXP());

    // Roast
    setRoast(getRoastMessage(newStats));

    // Check achievements
    const achResult = checkAchievements();
    if (achResult.newlyUnlocked.length > 0) {
      setNewAchievements(achResult.newlyUnlocked);
      setShowConfetti(true);
      playAchievement();
    }
  }, [today]);

  const level = getCurrentLevel(gamData.totalXP);
  const progress = getXPProgress(gamData.totalXP);

  const greetingTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 17) return 'Selamat Siang';
    if (hour < 20) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const roastStyles = {
    roast: { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.2)', icon: '🤡' },
    hype: { bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.2)', icon: '🔥' },
    neutral: { bg: 'rgba(139, 92, 246, 0.08)', border: 'rgba(139, 92, 246, 0.2)', icon: '💬' },
  };

  return (
    <div>
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />
      {levelUpData && <LevelUpModal level={levelUpData} onClose={() => setLevelUpData(null)} />}

      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>{greetingTime()}, {user?.name || 'User'} {user?.avatar || '👋'}</h1>
            <p>Ini adalah ringkasan aktivitas dan progres kamu hari ini.</p>
          </div>
          <div className="dashboard-level-badge" style={{ borderColor: level.color }}>
            <span style={{ color: level.color, fontSize: '18px', fontWeight: 700 }}>Lv.{level.level}</span>
            <span className="text-xs" style={{ color: level.color }}>{level.title}</span>
          </div>
        </div>
      </div>

      {/* AI Roast / Motivation */}
      {roast && (
        <div className="roast-card mb-3" style={{
          background: roastStyles[roast.type]?.bg,
          borderColor: roastStyles[roast.type]?.border,
        }}>
          <span className="roast-icon">{roastStyles[roast.type]?.icon}</span>
          <p className="roast-text">{roast.text}</p>
        </div>
      )}

      {/* New Achievements */}
      {newAchievements.length > 0 && (
        <div className="achievement-unlock-banner mb-3">
          <h3>🏆 Achievement Unlocked!</h3>
          <div className="flex gap-1 flex-wrap">
            {newAchievements.map(a => (
              <div key={a.id} className="achievement-unlock-item">
                <span style={{ fontSize: '24px' }}>{a.icon}</span>
                <span className="font-semibold">{a.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* XP Progress */}
      <div className="card card-padding mb-3" style={{ background: 'var(--gradient-card)', borderColor: level.color + '33' }}>
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-semibold" style={{ color: level.color }}>{level.title}</span>
          <span className="text-sm text-muted">{gamData.totalXP} XP</span>
        </div>
        <div className="xp-bar-track">
          <div className="xp-bar-fill" style={{ width: `${progress.percent}%`, background: `linear-gradient(90deg, ${level.color}, ${level.color}88)` }} />
        </div>
        <div className="flex justify-between text-xs text-muted mt-1">
          <span>{progress.percent}% to next level</span>
          <span>{progress.current}/{progress.needed} XP</span>
        </div>
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
                <div className="progress-fill green" style={{width: stats.habitsTotal > 0 ? `${(stats.habitsToday / stats.habitsTotal) * 100}%` : '0%'}} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-secondary">Tasks Selesai</span>
                <span className="text-sm font-semibold">{stats.tasksCompleted}/{stats.tasksTotal}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width: stats.tasksTotal > 0 ? `${(stats.tasksCompleted / stats.tasksTotal) * 100}%` : '0%'}} />
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
            <a href="/tasks" className="btn btn-secondary w-full" style={{ justifyContent: 'flex-start' }}>✅ Tambah Task Baru</a>
            <a href="/journal" className="btn btn-secondary w-full" style={{ justifyContent: 'flex-start' }}>📝 Tulis Jurnal</a>
            <a href="/pomodoro" className="btn btn-secondary w-full" style={{ justifyContent: 'flex-start' }}>⏱️ Mulai Fokus</a>
            <a href="/achievements" className="btn btn-secondary w-full" style={{ justifyContent: 'flex-start' }}>🏆 Lihat Achievements</a>
          </div>
        </div>
      </div>
    </div>
  );
}
