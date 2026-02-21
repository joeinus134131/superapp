'use client';

import { useState, useEffect, useCallback } from 'react';
import { getXP, getCurrentLevel, getXPProgress, LEVELS, ACHIEVEMENTS, checkAchievements } from '@/lib/gamification';
import { getData, STORAGE_KEYS } from '@/lib/storage';
import { formatCurrency, getToday } from '@/lib/helpers';
import Confetti from '@/components/Confetti';
import { useLanguage } from '@/lib/language';

export default function AchievementsPage() {
  const { t } = useLanguage();
  const [gamData, setGamData] = useState({ totalXP: 0, unlockedAchievements: [], xpHistory: [] });
  const [activeTab, setActiveTab] = useState('achievements');
  const [achievementStatus, setAchievementStatus] = useState({ total: 0, all: 0 });
  const [showConfetti, setShowConfetti] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(null);

  useEffect(() => {
    const data = getXP();
    setGamData(data);
    const achResult = checkAchievements();
    setAchievementStatus(achResult);
    if (achResult.newlyUnlocked.length > 0) setShowConfetti(true);
    generateWeeklyReport();
  }, []);

  const generateWeeklyReport = () => {
    const tasks = getData(STORAGE_KEYS.TASKS) || [];
    const habits = getData(STORAGE_KEYS.HABITS) || [];
    const transactions = getData(STORAGE_KEYS.TRANSACTIONS) || [];
    const pomodoro = getData(STORAGE_KEYS.POMODORO) || { sessions: [] };
    const journal = getData(STORAGE_KEYS.JOURNAL) || [];
    const health = getData(STORAGE_KEYS.HEALTH) || { workouts: [] };

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekStr = weekAgo.toISOString().split('T')[0];

    const weekTasks = tasks.filter(t => t.status === 'done').length;
    const weekHabitDays = habits.reduce((acc, h) => {
      return acc + (h.completedDates || []).filter(d => d >= weekStr).length;
    }, 0);
    const weekSessions = (pomodoro.sessions || []).filter(s => s.date >= weekStr).length;
    const weekJournals = journal.filter(j => j.createdAt && j.createdAt >= weekStr).length;
    const weekWorkouts = (health.workouts || []).filter(w => w.date >= weekStr).length;

    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    // Grade calculation
    const grades = {
      productivity: gradeFromScore(weekTasks, [1, 3, 5, 8, 12]),
      consistency: gradeFromScore(weekHabitDays, [3, 7, 14, 21, 28]),
      focus: gradeFromScore(weekSessions, [1, 3, 5, 8, 12]),
      reflection: gradeFromScore(weekJournals, [1, 2, 3, 5, 7]),
      health: gradeFromScore(weekWorkouts, [1, 2, 3, 4, 5]),
      finance: income >= expense ? (income > 0 ? 'A' : 'C') : 'D',
    };

    const allGrades = Object.values(grades);
    const gradePoints = allGrades.map(g => ({ A: 4, B: 3, C: 2, D: 1, F: 0 }[g] || 0));
    const avgGrade = gradePoints.reduce((a, b) => a + b, 0) / gradePoints.length;
    const overallGrade = avgGrade >= 3.5 ? 'A' : avgGrade >= 2.5 ? 'B' : avgGrade >= 1.5 ? 'C' : avgGrade >= 0.5 ? 'D' : 'F';

    setWeeklyReport({
      weekTasks, weekHabitDays, weekSessions, weekJournals, weekWorkouts,
      income, expense, grades, overallGrade,
    });
  };

  function gradeFromScore(score, thresholds) {
    if (score >= thresholds[4]) return 'A';
    if (score >= thresholds[3]) return 'B';
    if (score >= thresholds[2]) return 'C';
    if (score >= thresholds[1]) return 'D';
    return 'F';
  }

  const level = getCurrentLevel(gamData.totalXP);
  const progress = getXPProgress(gamData.totalXP);

  const gradeColors = { A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#f97316', F: '#ef4444' };
  const gradeEmojis = { A: '🌟', B: '👍', C: '😐', D: '😬', F: '💀' };

  return (
    <div>
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />

      <div className="page-header">
        <h1>{t('achievements.title')}</h1>
        <p>{t('achievements.desc')}</p>
      </div>

      {/* Level Card */}
      <div className="card card-padding mb-3" style={{ background: 'var(--gradient-card)', borderColor: level.color + '44' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="levelup-icon-sm" style={{ background: level.color + '22', borderColor: level.color }}>
            Lv.{level.level}
          </div>
          <div>
            <h2 style={{ fontSize: '22px', color: level.color }}>{level.title}</h2>
            <p className="text-sm text-secondary">{gamData.totalXP} {t('achievements.total_xp')}</p>
          </div>
        </div>
        <div className="xp-bar-track" style={{ height: '12px' }}>
          <div className="xp-bar-fill" style={{ width: `${progress.percent}%`, background: `linear-gradient(90deg, ${level.color}, ${level.color}88)` }} />
        </div>
        <div className="flex justify-between text-xs text-muted mt-1">
          <span>{progress.current} / {progress.needed} {t('achievements.to_next')}</span>
          <span>{progress.percent}%</span>
        </div>
      </div>

      {/* Level Progression */}
      <div className="card card-padding mb-3">
        <div className="card-title mb-2">{t('achievements.level_progression')}</div>
        <div className="level-grid">
          {LEVELS.map(l => (
            <div key={l.level} className={`level-item ${l.level <= level.level ? 'unlocked' : 'locked'}`}>
              <div className="level-item-badge" style={{ borderColor: l.level <= level.level ? l.color : 'var(--border-color)', color: l.level <= level.level ? l.color : 'var(--text-muted)' }}>
                {l.level}
              </div>
              <span className="level-item-title" style={{ color: l.level <= level.level ? l.color : 'var(--text-muted)' }}>
                {l.title}
              </span>
              <span className="text-xs text-muted">{l.minXP} XP</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mb-2">
        <button className={`tab ${activeTab === 'achievements' ? 'active' : ''}`} onClick={() => setActiveTab('achievements')}>
          {t('achievements.tab_achievements')} ({achievementStatus.total}/{achievementStatus.all})
        </button>
        <button className={`tab ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>
          {t('achievements.tab_report')}
        </button>
        <button className={`tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          {t('achievements.tab_history')}
        </button>
      </div>

      {/* Achievements */}
      {activeTab === 'achievements' && (
        <div className="grid-auto">
          {ACHIEVEMENTS.map(ach => {
            const unlocked = gamData.unlockedAchievements.includes(ach.id);
            return (
              <div key={ach.id} className={`achievement-card ${unlocked ? 'unlocked' : 'locked'}`}>
                <div className="achievement-icon">{ach.icon}</div>
                <h4>{ach.title}</h4>
                <p>{ach.desc}</p>
                {unlocked && <div className="achievement-badge">{t('achievements.unlocked_badge')}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Weekly Report */}
      {activeTab === 'report' && weeklyReport && (
        <div>
          <div className="report-grade-card mb-3" style={{ borderColor: gradeColors[weeklyReport.overallGrade] }}>
            <div className="report-grade-big" style={{ color: gradeColors[weeklyReport.overallGrade] }}>
              {weeklyReport.overallGrade}
            </div>
            <div>
              <h3>{t('achievements.weekly_grade')} {gradeEmojis[weeklyReport.overallGrade]}</h3>
              <p className="text-sm text-secondary">{t('achievements.based_on_7_days')}</p>
            </div>
          </div>

          <div className="grid-auto">
            {[
              { label: t('achievements.prod_label'), value: `${weeklyReport.weekTasks} ${t('achievements.prod_unit')}`, grade: weeklyReport.grades.productivity },
              { label: t('achievements.cons_label'), value: `${weeklyReport.weekHabitDays} ${t('achievements.cons_unit')}`, grade: weeklyReport.grades.consistency },
              { label: t('achievements.focus_label'), value: `${weeklyReport.weekSessions} ${t('achievements.focus_unit')}`, grade: weeklyReport.grades.focus },
              { label: t('achievements.ref_label'), value: `${weeklyReport.weekJournals} ${t('achievements.ref_unit')}`, grade: weeklyReport.grades.reflection },
              { label: t('achievements.health_label'), value: `${weeklyReport.weekWorkouts} ${t('achievements.health_unit')}`, grade: weeklyReport.grades.health },
              { label: t('achievements.fin_label'), value: formatCurrency(weeklyReport.income - weeklyReport.expense), grade: weeklyReport.grades.finance },
            ].map((item, i) => (
              <div key={i} className="card card-padding">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm">{item.label}</span>
                  <span className="report-grade-sm" style={{ color: gradeColors[item.grade], borderColor: gradeColors[item.grade] }}>
                    {item.grade}
                  </span>
                </div>
                <div className="font-semibold">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* XP History */}
      {activeTab === 'history' && (
        <div className="card card-padding">
          {(gamData.xpHistory || []).length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📜</div>
              <h3>{t('achievements.no_history')}</h3>
              <p>{t('achievements.start_earning')}</p>
            </div>
          ) : (
            [...(gamData.xpHistory || [])].reverse().slice(0, 30).map((h, i) => (
              <div key={i} className="activity-item">
                <div className="activity-icon" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>⚡</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{h.label}</div>
                  <div className="activity-time">
                    {new Date(h.date).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <span className="xp-gain-badge">+{h.xp} XP</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
