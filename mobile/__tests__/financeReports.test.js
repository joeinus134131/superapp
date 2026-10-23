import { financeReport, financeCsv, shiftPeriod, periodRange, percentageChange } from '../lib/financeReports';
const row = (date, amount, type = 'expense', category = 'Makanan', description = '') => ({ id: `${date}-${amount}-${category}`, date, amount, type, category, description });
const october = new Date(2026, 9, 1);
test('empty report has finite totals and avoids dividing by zero income', () => {
  const report = financeReport([], october, 'month');
  expect(report.income).toBe(0); expect(report.expense).toBe(0); expect(report.net).toBe(0);
  expect(report.averageExpense).toBe(0); expect(report.retainedRatio).toBeNull(); expect(report.expenseCategories).toEqual([]);
  expect(report.trend).toHaveLength(6); expect(percentageChange(100, 0)).toBeNull();
});
test('month boundaries, sorted rows, category shares and previous full-month totals agree', () => {
  const report = financeReport([row('2026-10-01', 1000, 'income', 'Gaji'), row('2026-10-31', 300), row('2026-10-20', 100, 'expense', 'Transport'), row('2026-09-30', 200), row('2026-09-10', 800, 'income'), row('2026-11-01', 999)], october, 'month');
  expect(report.rows).toHaveLength(3); expect(report.rows[0].date).toBe('2026-10-31');
  expect(report.income).toBe(1000); expect(report.expense).toBe(400); expect(report.net).toBe(600); expect(report.retainedRatio).toBe(60);
  expect(report.averageExpense).toBeCloseTo(400 / 31); expect(report.previousExpense).toBe(200); expect(report.previousIncome).toBe(800);
  expect(report.expenseCategories[0]).toMatchObject({ category: 'Makanan', amount: 300, share: 0.75 });
  expect(report.trend.at(-1)).toMatchObject({ income: 1000, expense: 400 }); expect(percentageChange(400, 200)).toBe(100);
});
test('year report uses twelve months and respects leap-year day count', () => {
  const report = financeReport([row('2024-02-29', 100), row('2024-12-31', 50), row('2023-12-31', 20), row('2025-01-01', 30)], new Date(2024, 6, 1), 'year');
  expect(report.days).toBe(366); expect(report.expense).toBe(150); expect(report.previousExpense).toBe(20); expect(report.trend).toHaveLength(12); expect(report.trend[1].expense).toBe(100);
  expect(periodRange(new Date(2024, 1, 1), 'month').days).toBe(29);
});
test('navigation crosses December without day overflow and year keeps selected month', () => {
  const next = shiftPeriod(new Date(2026, 11, 31), 'month', 1);
  expect([next.getFullYear(), next.getMonth(), next.getDate()]).toEqual([2027, 0, 1]);
  expect(shiftPeriod(october, 'year', -1).getFullYear()).toBe(2025);
});
test('local timestamp date is included and malformed dates, amounts, or types are excluded', () => {
  const timestamp = new Date(2026, 9, 1, 0, 15).toISOString();
  const report = financeReport([null, { date: 100, amount: 5, type: 'expense' }, row(timestamp, 10), row('2026-02-30', 1), row('bad-date', 1), row('2026-10-02', NaN), row('2026-10-02', Infinity), row('2026-10-02', -1), row('2026-10-02', 0), row('2026-10-02', '100'), row('2026-10-02', 100, 'unknown')], october, 'month');
  expect(report.rows).toHaveLength(1); expect(report.expense).toBe(10); expect(report.excluded).toBe(10);
});
test('negative cash flow and no income are represented honestly', () => {
  const report = financeReport([row('2026-10-02', 100), row('2026-10-02', 50, 'income')], october, 'month');
  expect(report.net).toBe(-50); expect(report.retainedRatio).toBe(-100);
  expect(financeReport([row('2026-10-02', 100)], october, 'month').retainedRatio).toBeNull();
});
test('CSV includes selected rows only, escapes delimiters, Unicode, and spreadsheet formulas', () => {
  const report = financeReport([row('2026-10-02', 100, 'expense', '=SUM(A1)', 'catatan,"kutip"\nbaris'), row('2026-09-02', 200)], october, 'month');
  const csv = financeCsv(report, 'id');
  expect(csv.startsWith('\uFEFF"Tanggal"')).toBe(true); expect(csv).toContain('"\'=SUM(A1)"'); expect(csv).toContain('"catatan,""kutip""\nbaris"'); expect(csv).not.toContain('2026-09-02'); expect(csv).toContain('"Jumlah (IDR)"');
});
test('category totals equal period totals and missing category can be opened as Others', () => {
  const report = financeReport([row('2026-10-01', 25), row('2026-10-02', 75), row('2026-10-03', 10, 'expense', ''), row('2026-10-04', 150, 'income', 'Gaji')], october, 'month');
  expect(report.expenseCategories.reduce((sum, c) => sum + c.amount, 0)).toBe(report.expense);
  expect(report.incomeCategories.reduce((sum, c) => sum + c.amount, 0)).toBe(report.income);
  expect(report.expenseCategories.find(c => c.category === 'Lainnya').count).toBe(1);
});
