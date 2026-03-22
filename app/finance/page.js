'use client';

import { useState, useEffect } from 'react';
import { getDataSync, setData, STORAGE_KEYS } from '@/lib/storage';
import { generateId, formatDate, formatCurrency, EXPENSE_CATEGORIES, INCOME_CATEGORIES, getToday, formatRupiahInput, parseRupiahInput } from '@/lib/helpers';
import {
  Wallet, Download, Plus, TrendingUp, TrendingDown,
  PieChart as PieChartIcon, List, History, Trash2, X
} from 'lucide-react';
import { useLanguage } from '@/lib/language';
import { usePremium } from '@/lib/premium';

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

function exportToCSV(transactions, monthFilter, t) {
  const filtered = monthFilter
    ? transactions.filter(t => getMonthKey(t.date) === monthFilter)
    : transactions;

  // Monthly summary block
  const months = [...new Set(filtered.map(tx => getMonthKey(tx.date)))].sort();
  const summaryRows = months.map(m => {
    const mTx = filtered.filter(tx => getMonthKey(tx.date) === m);
    const income = mTx.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
    const expense = mTx.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
    return [getMonthLabel(m), income, expense, income - expense];
  });

  const summaryHeader = [t('finance.month'), t('finance.income_rp'), t('finance.expense_rp'), t('finance.balance_rp')];
  const transHeader = [t('finance.no'), t('finance.date_header'), t('finance.type_header'), t('finance.category_header'), t('finance.desc_header'), t('finance.amount_rp')];
  const transRows = filtered
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((tx, i) => {
      const catList = tx.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
      const cat = catList.find(c => c.id === tx.category)?.label || tx.category;
      return [i + 1, tx.date, tx.type === 'income' ? t('finance.income') : t('finance.expense'), cat, tx.description, tx.amount];
    });

  const rows = [
    [`${t('finance.report_title')} ${monthFilter ? getMonthLabel(monthFilter) : t('finance.all_periods_text')}`],
    [t('finance.created_at'), new Date().toLocaleString('id-ID')],
    [],
    [t('finance.monthly_summary')],
    summaryHeader,
    ...summaryRows,
    [],
    [t('finance.transaction_details')],
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
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [exportMonth, setExportMonth] = useState('');
  const [listPage, setListPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [form, setForm] = useState({ type: 'expense', amount: '', category: 'food', description: '', date: getToday() });
  const [editingId, setEditingId] = useState(null);
  
  // Custom categories state
  const { isPremium } = usePremium();
  const [customCategories, setCustomCategories] = useState({ expense: [], income: [] });
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCat, setNewCat] = useState({ type: 'expense', label: '', emoji: '🍟', color: '#8b5cf6' });

  useEffect(() => {
    const saved = getDataSync(STORAGE_KEYS.TRANSACTIONS);
    if (saved) setTransactions(saved);

    const savedCats = getDataSync('superapp_custom_categories');
    if (savedCats) setCustomCategories(savedCats);
  }, []);

  const save = (t) => { setTransactions(t); setData(STORAGE_KEYS.TRANSACTIONS, t); };
  const saveCats = (c) => { setCustomCategories(c); setData('superapp_custom_categories', c); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const rawAmount = parseRupiahInput(form.amount);
    if (!rawAmount || !form.description.trim()) return;

    if (editingId) {
      // Update existing
      save(transactions.map(t =>
        t.id === editingId
          ? { ...t, ...form, amount: Number(rawAmount) }
          : t
      ));
    } else {
      // Create new
      save([{
        id: generateId(),
        ...form,
        amount: Number(rawAmount),
        createdAt: new Date().toISOString()
      }, ...transactions]);
    }

    setForm({ type: 'expense', amount: '', category: 'food', description: '', date: getToday() });
    setEditingId(null);
    setShowModal(false);
  };

  const openAddModal = () => {
    setForm({ type: 'expense', amount: '', category: 'food', description: '', date: getToday() });
    setEditingId(null);
    setShowModal(true);
  };

  const editTransaction = (t) => {
    setForm({
      type: t.type,
      amount: formatRupiahInput(t.amount.toString()),
      category: t.category,
      description: t.description,
      date: t.date,
    });
    setEditingId(t.id);
    setShowModal(true);
  };

  const deleteTransaction = (id) => save(transactions.filter(t => t.id !== id));

  const filtered = activeTab === 'all' ? transactions :
    transactions.filter(t => t.type === activeTab);

  const allExpenseCategories = [...EXPENSE_CATEGORIES, ...customCategories.expense];
  const allIncomeCategories = [...INCOME_CATEGORIES, ...customCategories.income];

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // Category breakdown for pie chart
  const categoryTotals = {};
  transactions.filter(t => t.type === 'expense').forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  const getCategoryInfo = (catId, type) => {
    const list = type === 'expense' ? allExpenseCategories : allIncomeCategories;
    return list.find(c => c.id === catId) || { emoji: '📦', label: catId, color: '#6b7280' };
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCat.label.trim()) return;
    const cat = { id: `custom_${generateId()}`, ...newCat };
    const updated = {
      ...customCategories,
      [newCat.type]: [...customCategories[newCat.type], cat]
    };
    saveCats(updated);
    setNewCat({ type: newCat.type, label: '', emoji: '🍟', color: '#8b5cf6' });
  };

  const deleteCategory = (type, id) => {
    const updated = {
      ...customCategories,
      [type]: customCategories[type].filter(c => c.id !== id)
    };
    saveCats(updated);
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
    if (entries.length === 0) return <div className="text-center text-muted" style={{ padding: '40px' }}>{t('finance.no_expenses_yet')}</div>;

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
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Wallet size={32} color="var(--accent-green)" /> {t('finance.title')}</h1>
            <p>{t('finance.desc')}</p>
          </div>
          <div className="flex gap-1" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setShowCategoryModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <List size={16} /> Kategori 👑
            </button>
            <button className="btn btn-secondary" onClick={() => setShowExportModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Download size={16} /> {t('finance.export')}</button>
            <button className="btn btn-primary" onClick={openAddModal} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Plus size={16} /> {t('finance.add_transaction')}</button>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-green)' }}><TrendingUp size={28} /></div>
          <div className="stat-info">
            <h3 style={{ fontSize: '20px' }}>{formatCurrency(totalIncome)}</h3>
            <p>{t('finance.total_income')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)' }}><TrendingDown size={28} /></div>
          <div className="stat-info">
            <h3 style={{ fontSize: '20px' }}>{formatCurrency(totalExpense)}</h3>
            <p>{t('finance.total_expense')}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: balance >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}><Wallet size={28} /></div>
          <div className="stat-info">
            <h3 style={{ fontSize: '20px', color: balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{formatCurrency(balance)}</h3>
            <p>{t('finance.balance')}</p>
          </div>
        </div>
      </div>

      <div className="grid-2 mb-3">
        <div className="card card-padding">
          <div className="card-title mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PieChartIcon size={20} /> {t('finance.expense_by_category')}</div>
          <PieChart />
        </div>
        <div className="card card-padding">
          <div className="card-title mb-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><List size={20} /> {t('finance.budget_overview')}</div>
          {allExpenseCategories.map(cat => {
            const spent = categoryTotals[cat.id] || 0;
            if (spent === 0 && cat.id.startsWith('custom_')) return null; // Hide unused custom completely empty
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
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><History size={20} /> {t('finance.transaction_history')}</div>
          <div className="tabs" style={{ marginBottom: 0 }}>
            <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => { setActiveTab('all'); setListPage(1); }}>{t('finance.all')}</button>
            <button className={`tab ${activeTab === 'income' ? 'active' : ''}`} onClick={() => { setActiveTab('income'); setListPage(1); }}>{t('finance.income_tab')}</button>
            <button className={`tab ${activeTab === 'expense' ? 'active' : ''}`} onClick={() => { setActiveTab('expense'); setListPage(1); }}>{t('finance.expense_tab')}</button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}><Wallet size={48} color="var(--accent-green)" /></div>
            <h3>{t('finance.no_transactions_yet')}</h3>
            <p>{t('finance.start_tracking')}</p>
          </div>
          ) : (
            <>
              {filtered.slice((listPage - 1) * ITEMS_PER_PAGE, listPage * ITEMS_PER_PAGE).map(t => {
                const info = getCategoryInfo(t.category, t.type);
                return (
                  <div key={t.id} className="transaction-item" onClick={() => editTransaction(t)} style={{ cursor: 'pointer', transition: 'background 0.2s', ':hover': { background: 'var(--bg-glass)' } }}>
                    <div className="transaction-icon" style={{ background: `${info.color}22` }}>{info.emoji}</div>
                    <div className="transaction-info" style={{ flex: 1 }}>
                      <h4>{t.description}</h4>
                      <p>{info.label} • {formatDate(t.date)}</p>
                    </div>
                    <span className={`transaction-amount ${t.type}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>
                    <button className="btn btn-danger btn-icon sm" onClick={(e) => { e.stopPropagation(); deleteTransaction(t.id); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '12px' }}><Trash2 size={16} /></button>
                  </div>
                );
              })}
              {filtered.length > ITEMS_PER_PAGE && (
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-color">
                      <span className="text-sm text-secondary">
                          {t('finance.page')} {listPage} {t('finance.of')} {Math.ceil(filtered.length / ITEMS_PER_PAGE)}
                      </span>
                      <div className="flex gap-2">
                          <button className="btn btn-sm btn-secondary" disabled={listPage === 1} onClick={() => setListPage(p => p - 1)}>{t('finance.prev')}</button>
                          <button className="btn btn-sm btn-secondary" disabled={listPage * ITEMS_PER_PAGE >= filtered.length} onClick={() => setListPage(p => p + 1)}>{t('finance.next')}</button>
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
              <h2>{editingId ? t('finance.edit_transaction', 'Edit Transaksi') : t('finance.add_transaction')}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{t('finance.type')}</label>
                  <div className="tabs" style={{ marginBottom: 0 }}>
                    <button type="button" className={`tab ${form.type === 'expense' ? 'active' : ''}`} onClick={() => setForm({...form, type: 'expense', category: 'food'})} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingDown size={16} /> {t('finance.expense')}</button>
                    <button type="button" className={`tab ${form.type === 'income' ? 'active' : ''}`} onClick={() => setForm({...form, type: 'income', category: 'salary'})} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingUp size={16} /> {t('finance.income')}</button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('finance.amount')}</label>
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
                  <label className="form-label">{t('finance.description')}</label>
                  <input className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder={t('finance.description_placeholder')} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">{t('finance.category')}</label>
                    <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                      {(form.type === 'expense' ? allExpenseCategories : allIncomeCategories).map(c => (
                        <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('finance.date')}</label>
                    <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('finance.cancel')}</button>
                <button type="submit" className="btn btn-primary">{t('finance.save')}</button>
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
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Download size={20} /> {t('finance.export_report')}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowExportModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {transactions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}><PieChartIcon size={48} color="var(--accent-cyan)" /></div>
                  <h3>{t('finance.no_data')}</h3>
                  <p>{t('finance.add_first')}</p>
                </div>
              ) : (
                <>
                  {/* Month picker */}
                  <div className="form-group mb-2">
                    <label className="form-label">{t('finance.select_period')}</label>
                    <select
                      className="form-select"
                      value={exportMonth}
                      onChange={e => setExportMonth(e.target.value)}
                    >
                      <option value="">{t('finance.all_periods')}</option>
                      {availableMonths.map(m => (
                        <option key={m} value={m}>{getMonthLabel(m)}</option>
                      ))}
                    </select>
                  </div>

                  {/* Preview summary */}
                  <div className="card" style={{ background: 'var(--bg-glass)', padding: '16px', borderRadius: 'var(--radius-lg)', marginBottom: '16px' }}>
                    <div className="card-title mb-2" style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <List size={14} /> {t('finance.preview')} {exportMonth ? getMonthLabel(exportMonth) : t('finance.all_periods_text')}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', textAlign: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{t('finance.income')}</div>
                        <div style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: '14px' }}>{formatCurrency(previewIncome)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{t('finance.expense')}</div>
                        <div style={{ fontWeight: 700, color: 'var(--accent-red)', fontSize: '14px' }}>{formatCurrency(previewExpense)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>{t('finance.balance')}</div>
                        <div style={{ fontWeight: 700, color: previewBalance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: '14px' }}>{formatCurrency(previewBalance)}</div>
                      </div>
                    </div>

                    {/* Top categories */}
                    {Object.keys(previewCategoryTotals).length > 0 && (
                      <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{t('finance.top_expenses')}</div>
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
                      {selectedMonthTxs.length} {t('finance.will_be_exported')}
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {t('finance.csv_tip')}
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowExportModal(false)}>{t('finance.cancel')}</button>
              {transactions.length > 0 && (
                <button
                  className="btn btn-primary"
                  onClick={() => { exportToCSV(transactions, exportMonth, t); setShowExportModal(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={16} /> {t('finance.download_csv')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category Management Modal (Pro Feature) */}
      {showCategoryModal && (
        <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <List size={20} color="var(--accent-purple)" /> Kustom Kategori
                {!isPremium && <span className="badge badge-yellow">PRO</span>}
              </h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowCategoryModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {!isPremium ? (
                <div className="empty-state text-center" style={{ padding: '40px 20px' }}>
                  <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '48px' }}>👑</span>
                  </div>
                  <h3>Fitur Premium</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    Upgrade ke Pro untuk membuat kategori pemasukan dan pengeluaran Anda sendiri tanpa batas.
                  </p>
                  <button className="btn btn-primary btn-lg" onClick={() => { setShowCategoryModal(false); /* Should open upgrade modal usually */ }}>
                    Upgrade ke Pro
                  </button>
                </div>
              ) : (
                <div className="grid-2">
                  <div className="card card-padding" style={{ background: 'var(--bg-glass)' }}>
                    <form onSubmit={handleAddCategory}>
                      <h4 className="mb-3">Tambah Kategori Baru</h4>
                      
                      <div className="tabs mb-3" style={{ width: '100%', display: 'flex' }}>
                        <button type="button" className={`tab ${newCat.type === 'expense' ? 'active' : ''}`} style={{flex:1}} onClick={() => setNewCat({...newCat, type: 'expense'})}>Pengeluaran</button>
                        <button type="button" className={`tab ${newCat.type === 'income' ? 'active' : ''}`} style={{flex:1}} onClick={() => setNewCat({...newCat, type: 'income'})}>Pemasukan</button>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Nama Kategori</label>
                        <input className="form-input" value={newCat.label} onChange={e => setNewCat({...newCat, label: e.target.value})} placeholder="Cth: Kopi, Bonus" required />
                      </div>
                      
                      <div className="flex gap-2 form-group">
                        <div style={{ flex: 1 }}>
                          <label className="form-label">Emoji</label>
                          <input className="form-input" value={newCat.emoji} onChange={e => setNewCat({...newCat, emoji: e.target.value})} placeholder="🍟" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label className="form-label">Warna</label>
                          <input type="color" className="form-input" value={newCat.color} onChange={e => setNewCat({...newCat, color: e.target.value})} style={{ padding: '4px', height: '42px', cursor: 'pointer' }} />
                        </div>
                      </div>

                      <button type="submit" className="btn btn-primary w-full mt-2">Tambah Kategori</button>
                    </form>
                  </div>

                  <div className="card card-padding" style={{ background: 'var(--bg-glass)', maxHeight: '350px', overflowY: 'auto' }}>
                    <h4 className="mb-3">Kategori Kustom Anda</h4>
                    
                    {customCategories.expense.length === 0 && customCategories.income.length === 0 ? (
                      <p className="text-muted text-sm text-center mt-4">Belum ada kategori kustom.</p>
                    ) : (
                      <>
                        {customCategories.expense.length > 0 && (
                          <div className="mb-3">
                            <strong className="text-sm text-secondary mb-2 block">Pengeluaran</strong>
                            {customCategories.expense.map(c => (
                              <div key={c.id} className="flex justify-between items-center mb-2 p-2 rounded" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                                <div className="flex items-center gap-2">
                                  <span style={{ fontSize: '18px' }}>{c.emoji}</span>
                                  <span className="text-sm" style={{ color: c.color }}>{c.label}</span>
                                </div>
                                <button className="btn btn-icon btn-danger sm" onClick={() => deleteCategory('expense', c.id)}><Trash2 size={12} /></button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {customCategories.income.length > 0 && (
                          <div className="mb-3">
                            <strong className="text-sm text-secondary mb-2 block">Pemasukan</strong>
                            {customCategories.income.map(c => (
                              <div key={c.id} className="flex justify-between items-center mb-2 p-2 rounded" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                                <div className="flex items-center gap-2">
                                  <span style={{ fontSize: '18px' }}>{c.emoji}</span>
                                  <span className="text-sm" style={{ color: c.color }}>{c.label}</span>
                                </div>
                                <button className="btn btn-icon btn-danger sm" onClick={() => deleteCategory('income', c.id)}><Trash2 size={12} /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
