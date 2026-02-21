'use client';

import { useState, useEffect } from 'react';
import { getData, setData, STORAGE_KEYS } from '@/lib/storage';
import { generateId, formatDate, formatCurrency, EXPENSE_CATEGORIES, INCOME_CATEGORIES, getToday, formatRupiahInput, parseRupiahInput } from '@/lib/helpers';
import {
  Wallet, Download, Plus, TrendingUp, TrendingDown,
  PieChart as PieChartIcon, List, History, Trash2, X
} from 'lucide-react';

// ─── Export helpers ────────────────────────────────────────────────────────────

function getMonthKey(dateStr) {
  // dateStr is YYYY-MM-DD
  return dateStr ? dateStr.slice(0, 7) : '';
}

function getMonthLabel(monthKey) {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-');
  return new Date(year, month - 1, 1).toLocaleDateString('id-ID', { year: 'numeric', month: 'long' });
}

function exportToCSV(transactions, monthFilter) {
  const filtered = monthFilter
    ? transactions.filter(t => getMonthKey(t.date) === monthFilter)
    : transactions;

  // Monthly summary block
  const months = [...new Set(filtered.map(t => getMonthKey(t.date)))].sort();
  const summaryRows = months.map(m => {
    const mTx = filtered.filter(t => getMonthKey(t.date) === m);
    const income = mTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = mTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return [getMonthLabel(m), income, expense, income - expense];
  });

  const summaryHeader = ['Bulan', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Saldo (Rp)'];
  const transHeader = ['No', 'Tanggal', 'Tipe', 'Kategori', 'Deskripsi', 'Jumlah (Rp)'];
  const transRows = filtered
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t, i) => {
      const catList = t.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
      const cat = catList.find(c => c.id === t.category)?.label || t.category;
      return [i + 1, t.date, t.type === 'income' ? 'Pemasukan' : 'Pengeluaran', cat, t.description, t.amount];
    });

  const rows = [
    ['LAPORAN KEUANGAN - ' + (monthFilter ? getMonthLabel(monthFilter) : 'Semua Periode')],
    ['Dibuat:', new Date().toLocaleString('id-ID')],
    [],
    ['=== RINGKASAN BULANAN ==='],
    summaryHeader,
    ...summaryRows,
    [],
    ['=== DETAIL TRANSAKSI ==='],
    transHeader,
    ...transRows,
  ];

  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `laporan-keuangan-${monthFilter || 'semua'}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [exportMonth, setExportMonth] = useState('');
  const [listPage, setListPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [form, setForm] = useState({ type: 'expense', amount: '', category: 'food', description: '', date: getToday() });

  useEffect(() => {
    const saved = getData(STORAGE_KEYS.TRANSACTIONS);
    if (saved) setTransactions(saved);
  }, []);

  const save = (t) => { setTransactions(t); setData(STORAGE_KEYS.TRANSACTIONS, t); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const rawAmount = parseRupiahInput(form.amount);
    if (!rawAmount || !form.description.trim()) return;
    save([{
      id: generateId(),
      ...form,
      amount: Number(rawAmount),
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

  // Available months for export picker
  const availableMonths = [...new Set(transactions.map(t => getMonthKey(t.date)))].filter(Boolean).sort().reverse();

  // Monthly summary for export modal preview
  const selectedMonthTxs = exportMonth
    ? transactions.filter(t => getMonthKey(t.date) === exportMonth)
    : transactions;
  const previewIncome = selectedMonthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const previewExpense = selectedMonthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const previewBalance = previewIncome - previewExpense;

  // Category breakdown for preview
  const previewCategoryTotals = {};
  selectedMonthTxs.filter(t => t.type === 'expense').forEach(t => {
    previewCategoryTotals[t.category] = (previewCategoryTotals[t.category] || 0) + t.amount;
  });

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
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Wallet size={32} color="var(--accent-green)" /> Finance Tracker</h1>
            <p>Kelola pemasukan dan pengeluaran kamu</p>
          </div>
          <div className="flex gap-1">
            <button className="btn btn-secondary" onClick={() => setShowExportModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Download size={16} /> Export</button>
            <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> Tambah Transaksi</button>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' }}><TrendingUp size={28} /></div>
          <div className="stat-info">
            <h3 style={{ fontSize: '20px' }}>{formatCurrency(totalIncome)}</h3>
            <p>Total Pemasukan</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)' }}><TrendingDown size={28} /></div>
          <div className="stat-info">
            <h3 style={{ fontSize: '20px' }}>{formatCurrency(totalExpense)}</h3>
            <p>Total Pengeluaran</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: balance >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}><Wallet size={28} /></div>
          <div className="stat-info">
            <h3 style={{ fontSize: '20px', color: balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{formatCurrency(balance)}</h3>
            <p>Saldo</p>
          </div>
        </div>
      </div>

      <div className="grid-2 mb-3">
        <div className="card card-padding">
          <div className="card-title mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PieChartIcon size={20} /> Pengeluaran per Kategori</div>
          <PieChart />
        </div>
        <div className="card card-padding">
          <div className="card-title mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><List size={20} /> Budget Overview</div>
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
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><History size={20} /> Riwayat Transaksi</div>
          <div className="tabs" style={{ marginBottom: 0 }}>
            <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => { setActiveTab('all'); setListPage(1); }}>Semua</button>
            <button className={`tab ${activeTab === 'income' ? 'active' : ''}`} onClick={() => { setActiveTab('income'); setListPage(1); }}>Masuk</button>
            <button className={`tab ${activeTab === 'expense' ? 'active' : ''}`} onClick={() => { setActiveTab('expense'); setListPage(1); }}>Keluar</button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}><Wallet size={48} color="var(--accent-green)" /></div>
            <h3>Belum ada transaksi</h3>
            <p>Mulai catat keuanganmu!</p>
          </div>
          ) : (
            <>
              {filtered.slice((listPage - 1) * ITEMS_PER_PAGE, listPage * ITEMS_PER_PAGE).map(t => {
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
                    <button className="btn btn-danger btn-icon sm" onClick={() => deleteTransaction(t.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></button>
                  </div>
                );
              })}
              {filtered.length > ITEMS_PER_PAGE && (
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-color">
                      <span className="text-sm text-secondary">
                          Halaman {listPage} dari {Math.ceil(filtered.length / ITEMS_PER_PAGE)}
                      </span>
                      <div className="flex gap-2">
                          <button className="btn btn-sm btn-secondary" disabled={listPage === 1} onClick={() => setListPage(p => p - 1)}>Sebelumnya</button>
                          <button className="btn btn-sm btn-secondary" disabled={listPage * ITEMS_PER_PAGE >= filtered.length} onClick={() => setListPage(p => p + 1)}>Selanjutnya</button>
                      </div>
                  </div>
              )}
            </>
          )}
      </div>

      {/* Add Transaction Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tambah Transaksi</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tipe</label>
                  <div className="tabs" style={{ marginBottom: 0 }}>
                    <button type="button" className={`tab ${form.type === 'expense' ? 'active' : ''}`} onClick={() => setForm({...form, type: 'expense', category: 'food'})} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingDown size={16} /> Pengeluaran</button>
                    <button type="button" className={`tab ${form.type === 'income' ? 'active' : ''}`} onClick={() => setForm({...form, type: 'income', category: 'salary'})} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingUp size={16} /> Pemasukan</button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Jumlah (Rp)</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    className="form-input" 
                    value={form.amount} 
                    onChange={e => setForm({...form, amount: formatRupiahInput(e.target.value)})} 
                    placeholder="0" 
                    autoFocus 
                  />
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

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Download size={20} /> Export Laporan</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowExportModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {transactions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}><PieChartIcon size={48} color="var(--accent-cyan)" /></div>
                  <h3>Belum ada data transaksi</h3>
                  <p>Tambah transaksi terlebih dahulu.</p>
                </div>
              ) : (
                <>
                  {/* Month picker */}
                  <div className="form-group mb-2">
                    <label className="form-label">Pilih Periode</label>
                    <select
                      className="form-select"
                      value={exportMonth}
                      onChange={e => setExportMonth(e.target.value)}
                    >
                      <option value="">📅 Semua Periode</option>
                      {availableMonths.map(m => (
                        <option key={m} value={m}>{getMonthLabel(m)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Preview summary */}
                  <div className="card" style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: 'var(--radius-lg)', marginBottom: '16px' }}>
                    <div className="card-title mb-2" style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <List size={14} /> Preview: {exportMonth ? getMonthLabel(exportMonth) : 'Semua Periode'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', textAlign: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Pemasukan</div>
                        <div style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: '14px' }}>{formatCurrency(previewIncome)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Pengeluaran</div>
                        <div style={{ fontWeight: 700, color: 'var(--accent-red)', fontSize: '14px' }}>{formatCurrency(previewExpense)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Saldo</div>
                        <div style={{ fontWeight: 700, color: previewBalance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: '14px' }}>{formatCurrency(previewBalance)}</div>
                      </div>
                    </div>

                    {/* Top categories */}
                    {Object.keys(previewCategoryTotals).length > 0 && (
                      <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Top Pengeluaran</div>
                        {Object.entries(previewCategoryTotals)
                          .sort(([,a],[,b]) => b - a)
                          .slice(0, 3)
                          .map(([catId, amt]) => {
                            const info = getCategoryInfo(catId, 'expense');
                            return (
                              <div key={catId} className="flex justify-between" style={{ fontSize: '12px', marginBottom: '4px' }}>
                                <span>{info.emoji} {info.label}</span>
                                <span style={{ fontWeight: 600 }}>{formatCurrency(amt)}</span>
                              </div>
                            );
                          })}
                      </div>
                    )}

                    <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      {selectedMonthTxs.length} transaksi akan diekspor
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    💡 File CSV bisa dibuka di Excel, Google Sheets, atau Numbers.
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowExportModal(false)}>Batal</button>
              {transactions.length > 0 && (
                <button
                  className="btn btn-primary"
                  onClick={() => { exportToCSV(transactions, exportMonth); setShowExportModal(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={16} /> Download CSV
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
