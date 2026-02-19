'use client';

import { useState, useEffect } from 'react';
import { getData, setData, STORAGE_KEYS } from '@/lib/storage';
import { generateId, formatDate, formatCurrency, EXPENSE_CATEGORIES, INCOME_CATEGORIES, getToday } from '@/lib/helpers';

export default function FinancePage() {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [form, setForm] = useState({ type: 'expense', amount: '', category: 'food', description: '', date: getToday() });

  useEffect(() => {
    const saved = getData(STORAGE_KEYS.TRANSACTIONS);
    if (saved) setTransactions(saved);
  }, []);

  const save = (t) => { setTransactions(t); setData(STORAGE_KEYS.TRANSACTIONS, t); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || !form.description.trim()) return;
    save([{
      id: generateId(),
      ...form,
      amount: Number(form.amount),
      createdAt: new Date().toISOString()
    }, ...transactions]);
    setForm({ type: 'expense', amount: '', category: 'food', description: '', date: getToday() });
    setShowModal(false);
  };

  const deleteTransaction = (id) => save(transactions.filter(t => t.id !== id));

  const filtered = activeTab === 'all' ? transactions :
    transactions.filter(t => t.type === activeTab);

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Category breakdown for pie chart
  const categoryTotals = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  const getCategoryInfo = (catId, type) => {
    const list = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
    return list.find(c => c.id === catId) || { emoji: '📦', label: catId, color: '#6b7280' };
  };

  // Simple SVG pie chart
  const PieChart = () => {
    const entries = Object.entries(categoryTotals);
    if (entries.length === 0) return <div className="text-center text-muted" style={{ padding: '40px' }}>Belum ada pengeluaran</div>;

    const total = entries.reduce((s, [, v]) => s + v, 0);
    let cumulative = 0;

    const slices = entries.map(([cat, val]) => {
      const info = getCategoryInfo(cat, 'expense');
      const start = cumulative;
      const pct = val / total;
      cumulative += pct;
      return { cat, val, pct, start, color: info.color, emoji: info.emoji, label: info.label };
    });

    const getCoords = (pct) => {
      const x = Math.cos(2 * Math.PI * pct - Math.PI / 2);
      const y = Math.sin(2 * Math.PI * pct - Math.PI / 2);
      return [x * 50 + 50, y * 50 + 50];
    };

    return (
      <div className="pie-chart-container">
        <svg className="pie-chart" viewBox="0 0 100 100">
          {slices.map((s, i) => {
            if (s.pct === 1) {
              return <circle key={i} cx="50" cy="50" r="50" fill={s.color} />;
            }
            const [x1, y1] = getCoords(s.start);
            const [x2, y2] = getCoords(s.start + s.pct);
            const large = s.pct > 0.5 ? 1 : 0;
            return (
              <path key={i} d={`M50,50 L${x1},${y1} A50,50 0 ${large},1 ${x2},${y2} Z`} fill={s.color} opacity="0.8" />
            );
          })}
          <circle cx="50" cy="50" r="25" fill="var(--bg-secondary)" />
        </svg>
        <div className="pie-legend">
          {slices.map((s, i) => (
            <div key={i} className="pie-legend-item">
              <span className="pie-legend-dot" style={{ background: s.color }} />
              <span className="pie-legend-label">{s.emoji} {s.label}</span>
              <span className="pie-legend-value">{Math.round(s.pct * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex justify-between items-center">
          <div>
            <h1>💰 Finance Tracker</h1>
            <p>Kelola pemasukan dan pengeluaran kamu</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Tambah Transaksi</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>📈</div>
          <div className="stat-info">
            <h3 style={{ fontSize: '20px' }}>{formatCurrency(totalIncome)}</h3>
            <p>Total Pemasukan</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>📉</div>
          <div className="stat-info">
            <h3 style={{ fontSize: '20px' }}>{formatCurrency(totalExpense)}</h3>
            <p>Total Pengeluaran</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: balance >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }}>💰</div>
          <div className="stat-info">
            <h3 style={{ fontSize: '20px', color: balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{formatCurrency(balance)}</h3>
            <p>Saldo</p>
          </div>
        </div>
      </div>

      <div className="grid-2 mb-3">
        <div className="card card-padding">
          <div className="card-title mb-2">📊 Pengeluaran per Kategori</div>
          <PieChart />
        </div>
        <div className="card card-padding">
          <div className="card-title mb-2">📋 Budget Overview</div>
          {EXPENSE_CATEGORIES.map(cat => {
            const spent = categoryTotals[cat.id] || 0;
            const pct = totalExpense > 0 ? (spent / totalExpense) * 100 : 0;
            return (
              <div key={cat.id} style={{ marginBottom: '12px' }}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">{cat.emoji} {cat.label}</span>
                  <span className="text-sm font-semibold">{formatCurrency(spent)}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: cat.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card card-padding">
        <div className="card-header">
          <div className="card-title">📝 Riwayat Transaksi</div>
          <div className="tabs" style={{ marginBottom: 0 }}>
            <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Semua</button>
            <button className={`tab ${activeTab === 'income' ? 'active' : ''}`} onClick={() => setActiveTab('income')}>Masuk</button>
            <button className={`tab ${activeTab === 'expense' ? 'active' : ''}`} onClick={() => setActiveTab('expense')}>Keluar</button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💰</div>
            <h3>Belum ada transaksi</h3>
            <p>Mulai catat keuanganmu!</p>
          </div>
        ) : (
          filtered.map(t => {
            const info = getCategoryInfo(t.category, t.type);
            return (
              <div key={t.id} className="transaction-item">
                <div className="transaction-icon" style={{ background: `${info.color}22` }}>{info.emoji}</div>
                <div className="transaction-info">
                  <h4>{t.description}</h4>
                  <p>{info.label} • {formatDate(t.date)}</p>
                </div>
                <span className={`transaction-amount ${t.type}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
                <button className="btn btn-danger btn-icon sm" onClick={() => deleteTransaction(t.id)}>🗑</button>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tambah Transaksi</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tipe</label>
                  <div className="tabs" style={{ marginBottom: 0 }}>
                    <button type="button" className={`tab ${form.type === 'expense' ? 'active' : ''}`} onClick={() => setForm({...form, type: 'expense', category: 'food'})}>📉 Pengeluaran</button>
                    <button type="button" className={`tab ${form.type === 'income' ? 'active' : ''}`} onClick={() => setForm({...form, type: 'income', category: 'salary'})}>📈 Pemasukan</button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Jumlah (Rp)</label>
                  <input type="number" className="form-input" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0" autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Deskripsi</label>
                  <input className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Untuk apa?" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Kategori</label>
                    <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                      {(form.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => (
                        <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tanggal</label>
                    <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
