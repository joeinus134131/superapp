'use client';

import { useState, useEffect, useMemo } from 'react';
import { getData, STORAGE_KEYS } from '@/lib/storage';
import { formatCurrency, EXPENSE_CATEGORIES, getToday } from '@/lib/helpers';
import { usePremium } from '@/lib/premium';
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Zap, Lock } from 'lucide-react';

// ─── Local AI Engine (no API needed, runs entirely client-side) ────────────────

function analyzeFinances(transactions) {
  if (!Array.isArray(transactions) || transactions.length < 2) return [];

  const insights = [];
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = (() => {
    const d = new Date(now); d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const thisMonthTx = transactions.filter(t => t.date?.startsWith(thisMonth));
  const lastMonthTx = transactions.filter(t => t.date?.startsWith(lastMonth));

  const thisExpense = thisMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const lastExpense = lastMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const thisIncome = thisMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const lastIncome = lastMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);

  // Expense trend
  if (lastExpense > 0 && thisExpense > 0) {
    const change = ((thisExpense - lastExpense) / lastExpense * 100).toFixed(0);
    if (thisExpense > lastExpense) {
      insights.push({
        type: 'warning',
        icon: '📈',
        title: 'Pengeluaran Naik',
        text: `Pengeluaran bulan ini naik ${change}% dibanding bulan lalu (${formatCurrency(lastExpense)} → ${formatCurrency(thisExpense)}).`,
      });
    } else {
      insights.push({
        type: 'success',
        icon: '📉',
        title: 'Pengeluaran Turun!',
        text: `Hebat! Pengeluaran kamu turun ${Math.abs(change)}% bulan ini. Terus pertahankan!`,
      });
    }
  }

  // Category breakdown insight
  const catTotals = {};
  thisMonthTx.filter(t => t.type === 'expense').forEach(t => {
    catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
  });
  const topCatEntry = Object.entries(catTotals).sort(([,a],[,b]) => b - a)[0];
  if (topCatEntry && thisExpense > 0) {
    const [catId, catAmt] = topCatEntry;
    const pct = ((catAmt / thisExpense) * 100).toFixed(0);
    const catInfo = EXPENSE_CATEGORIES.find(c => c.id === catId);
    insights.push({
      type: 'info',
      icon: catInfo?.emoji || '💰',
      title: `${catInfo?.label || catId} Mendominasi`,
      text: `${pct}% pengeluaran bulan ini untuk ${catInfo?.label || catId} (${formatCurrency(catAmt)}).`,
    });
  }

  // Savings rate
  if (thisIncome > 0) {
    const savingsRate = (((thisIncome - thisExpense) / thisIncome) * 100).toFixed(0);
    if (savingsRate > 0) {
      insights.push({
        type: savingsRate >= 20 ? 'success' : 'info',
        icon: savingsRate >= 20 ? '🏆' : '💡',
        title: `Rasio Tabungan: ${savingsRate}%`,
        text: savingsRate >= 20 
          ? `Kamu menabung ${savingsRate}% dari pemasukan bulan ini. Luar biasa!` 
          : `Kamu menabung ${savingsRate}%. Coba targetkan 20% untuk keuangan yang lebih sehat.`,
      });
    } else {
      insights.push({
        type: 'danger',
        icon: '⚠️',
        title: 'Pengeluaran Melebihi Pemasukan',
        text: `Pengeluaran bulan ini melebihi pemasukan sebesar ${formatCurrency(thisExpense - thisIncome)}. Hati-hati!`,
      });
    }
  }

  // Weekend spending pattern
  const weekendSpend = thisMonthTx.filter(t => {
    if (t.type !== 'expense') return false;
    const day = new Date(t.date).getDay();
    return day === 0 || day === 6;
  }).reduce((s, t) => s + t.amount, 0);
  const weekdaySpend = thisExpense - weekendSpend;
  if (weekendSpend > 0 && weekdaySpend > 0) {
    const weekendPct = ((weekendSpend / thisExpense) * 100).toFixed(0);
    if (weekendPct > 40) {
      insights.push({
        type: 'warning',
        icon: '🎉',
        title: 'Banyak Spending di Weekend',
        text: `${weekendPct}% pengeluaran terjadi di akhir pekan. Coba batasi pengeluaran weekend kamu.`,
      });
    }
  }

  return insights;
}

function analyzeProductivity(stats) {
  const insights = [];

  if (stats.focusSessions >= 4) {
    insights.push({
      type: 'success', icon: '🔥',
      title: 'Produktivitas Tinggi Hari Ini!',
      text: `${stats.focusSessions} sesi fokus sudah diselesaikan hari ini. Luar biasa!`,
    });
  } else if (stats.focusSessions > 0) {
    insights.push({
      type: 'info', icon: '⏱️',
      title: 'Mulai Bagus!',
      text: `${stats.focusSessions} sesi fokus hari ini. Coba targetkan 4 sesi untuk produktivitas optimal.`,
    });
  }

  if (stats.habitsToday === stats.habitsTotal && stats.habitsTotal > 0) {
    insights.push({
      type: 'success', icon: '✅',
      title: 'Semua Kebiasaan Terpenuhi!',
      text: 'Kamu sudah menyelesaikan semua kebiasaan hari ini. Konsistensi adalah kunci! 💪',
    });
  } else if (stats.habitsTotal > 0 && stats.habitsToday < stats.habitsTotal) {
    const remaining = stats.habitsTotal - stats.habitsToday;
    insights.push({
      type: 'info', icon: '📋',
      title: `${remaining} Kebiasaan Tersisa`,
      text: `Masih ada ${remaining} kebiasaan yang belum kamu lakukan hari ini. Ayo selesaikan!`,
    });
  }

  if (stats.streak >= 7) {
    insights.push({
      type: 'success', icon: '🔥',
      title: `Streak ${stats.streak} Hari!`,
      text: 'Konsistensi kamu luar biasa! Jangan putus streak-nya.',
    });
  }

  return insights;
}

// ─── Component ─────────────────────────────────────────────────────────────────

const insightStyles = {
  success: { bg: 'rgba(5, 150, 105, 0.08)', border: 'rgba(5, 150, 105, 0.25)', color: '#059669' },
  warning: { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.25)', color: '#f59e0b' },
  danger:  { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.25)', color: '#ef4444' },
  info:    { bg: 'rgba(139, 92, 246, 0.08)', border: 'rgba(139, 92, 246, 0.25)', color: '#8b5cf6' },
};

export default function ProInsights({ stats }) {
  const { isPremium } = usePremium();
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    getData(STORAGE_KEYS.TRANSACTIONS).then(data => {
      setTransactions(Array.isArray(data) ? data : []);
    });
  }, []);

  const financeInsights = useMemo(() => analyzeFinances(transactions), [transactions]);
  const productivityInsights = useMemo(() => analyzeProductivity(stats || {}), [stats]);

  const allInsights = [...financeInsights, ...productivityInsights].slice(0, 5);

  if (!isPremium) {
    return (
      <div className="card card-padding mb-3" style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(245,158,11,0.08))',
        border: '1px solid rgba(139,92,246,0.2)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none' }}>
          <div className="card-title mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="#8b5cf6" /> AI Smart Insights
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(16,185,129,0.08)' }}>
              <strong>📉 Pengeluaran Turun!</strong>
              <p className="text-sm text-secondary mt-1">Pengeluaran kamu turun 15% bulan ini...</p>
            </div>
            <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(139,92,246,0.08)' }}>
              <strong>🏆 Rasio Tabungan: 25%</strong>
              <p className="text-sm text-secondary mt-1">Kamu menabung 25% dari pemasukan...</p>
            </div>
          </div>
        </div>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <Lock size={32} color="#f59e0b" style={{ marginBottom: '8px' }} />
          <span style={{ fontWeight: 700, fontSize: '16px', color: '#fff' }}>AI Smart Insights</span>
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '12px' }}>Fitur eksklusif untuk pengguna Pro</span>
          <a href="/settings" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} /> Upgrade ke Pro
          </a>
        </div>
      </div>
    );
  }

  if (allInsights.length === 0) {
    return (
      <div className="card card-padding mb-3" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(6,182,212,0.06))' }}>
        <div className="card-title mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={20} color="#8b5cf6" /> Analisis AI 👑
        </div>
        <p className="text-sm text-muted">Tambahkan lebih banyak data (transaksi, kebiasaan, sesi fokus) untuk mendapatkan insight personal dari AI.</p>
      </div>
    );
  }

  return (
    <div className="card card-padding mb-3" style={{
      background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(6,182,212,0.06))',
      border: '1px solid rgba(139,92,246,0.15)',
    }}>
      <div className="card-title mb-3" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Sparkles size={20} color="#8b5cf6" /> <span style={{ background: 'linear-gradient(90deg, #8b5cf6, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SuperAI Insights</span> 👑
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {allInsights.map((insight, i) => {
          const style = insightStyles[insight.type] || insightStyles.info;
          return (
            <div key={i} style={{
              padding: '12px 16px', borderRadius: '12px',
              background: style.bg, borderLeft: `3px solid ${style.color}`,
              transition: 'transform 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '18px' }}>{insight.icon}</span>
                <strong className="text-sm" style={{ color: style.color }}>{insight.title}</strong>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{insight.text}</p>
            </div>
          );
        })}
        <div className="text-xs text-muted" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', gap: '4px' }}>
           <Zap size={12}/> Dihasilkan secara otomatis (M26) berdasarkan aktivitas Anda.
        </div>
      </div>
    </div>
  );
}
