import type { Transaction } from '../hooks/useFinance';
import { dueDay } from './dashboardSummary';
export type FinancePeriod = 'month' | 'year';
export function periodRange(anchor: Date, mode: FinancePeriod) {
  const start = new Date(anchor.getFullYear(), mode === 'year' ? 0 : anchor.getMonth(), 1);
  const end = new Date(start.getFullYear() + (mode === 'year' ? 1 : 0), start.getMonth() + (mode === 'month' ? 1 : 0), 1);
  // UTC calendar arithmetic avoids DST affecting the number of calendar days.
  const days = Math.round((Date.UTC(end.getFullYear(), end.getMonth(), 1) - Date.UTC(start.getFullYear(), start.getMonth(), 1)) / 86400000);
  return { start, end, days };
}
export function shiftPeriod(anchor: Date, mode: FinancePeriod, offset: number) {
  return new Date(anchor.getFullYear() + (mode === 'year' ? offset : 0), anchor.getMonth() + (mode === 'month' ? offset : 0), 1);
}
function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function sum(rows: Transaction[], type: Transaction['type']) { return rows.filter(row => row.type === type).reduce((total, row) => total + row.amount, 0); }
export function financeReport(input: Transaction[], anchor: Date, mode: FinancePeriod) {
  const valid = input.filter(row => {
    if (!row || typeof row !== 'object' || typeof row.date !== 'string') return false;
    const day = dueDay(row.date);
    const date = day ? new Date(`${day}T12:00:00`) : null;
    return date && !Number.isNaN(date.getTime()) && dateKey(date) === day && typeof row.amount === 'number' && Number.isFinite(row.amount) && row.amount > 0 && ['income', 'expense'].includes(row.type);
  });
  const range = periodRange(anchor, mode);
  const within = (start: Date, end: Date) => valid.filter(row => { const day = dueDay(row.date); return day >= dateKey(start) && day < dateKey(end); }).sort((a, b) => dueDay(b.date).localeCompare(dueDay(a.date)) || b.date.localeCompare(a.date));
  const rows = within(range.start, range.end);
  const previousRange = periodRange(shiftPeriod(anchor, mode, -1), mode);
  const previous = within(previousRange.start, previousRange.end);
  const income = sum(rows, 'income'), expense = sum(rows, 'expense');
  const previousIncome = sum(previous, 'income'), previousExpense = sum(previous, 'expense');
  const categories = (type: Transaction['type']) => {
    const totals = new Map<string, { amount: number; count: number }>();
    rows.filter(row => row.type === type).forEach(row => { const key = row.category || 'Lainnya'; const prior = totals.get(key) || { amount: 0, count: 0 }; totals.set(key, { amount: prior.amount + row.amount, count: prior.count + 1 }); });
    const total = type === 'income' ? income : expense;
    return [...totals].map(([category, data]) => ({ category, ...data, share: total ? data.amount / total : 0 })).sort((a, b) => b.amount - a.amount);
  };
  const trend = Array.from({ length: mode === 'year' ? 12 : 6 }, (_, index) => {
    const date = new Date(anchor.getFullYear(), mode === 'year' ? index : anchor.getMonth() - 5 + index, 1);
    const transactions = within(date, new Date(date.getFullYear(), date.getMonth() + 1, 1));
    return { date, income: sum(transactions, 'income'), expense: sum(transactions, 'expense') };
  });
  return { ...range, rows, income, expense, net: income - expense, previousIncome, previousExpense, previousCount: previous.length,
    retainedRatio: income ? (income - expense) / income * 100 : null,
    averageExpense: expense / range.days, expenseCategories: categories('expense'), incomeCategories: categories('income'), trend,
    excluded: input.length - valid.length };
}
export type FinanceReport = ReturnType<typeof financeReport>;
export function percentageChange(current: number, previous: number) { return previous > 0 ? (current - previous) / previous * 100 : null; }
// Quote CSV fields and neutralize spreadsheet formulas in user-entered text.
function csvCell(value: string | number) {
  const text = String(value);
  const safe = typeof value === 'string' && /^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function financeCsv(report: FinanceReport, language: string) {
  const id = language === 'id';
  const header = id ? ['Tanggal', 'Jenis', 'Kategori', 'Deskripsi', 'Jumlah (IDR)'] : ['Date', 'Type', 'Category', 'Description', 'Amount (IDR)'];
  const rows = report.rows.map(row => [dueDay(row.date), row.type === 'income' ? (id ? 'Pemasukan' : 'Income') : (id ? 'Pengeluaran' : 'Expense'), row.category, row.description || '', row.amount]);
  return '\uFEFF' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
}
