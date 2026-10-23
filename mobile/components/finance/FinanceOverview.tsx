import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { useLanguage } from '../../context/languageContext';
import { FinanceReport, percentageChange } from '../../lib/financeReports';

export function FinanceOverview({ report, mode, hidden, money, categoryLabel, onTransactions, onExport, exporting }: {
  report: FinanceReport; mode: 'dashboard' | 'reports'; hidden: boolean; money: (value: number) => string;
  categoryLabel: (category: string) => string; onTransactions: (type: 'all' | 'income' | 'expense', category?: string) => void;
  onExport: () => void; exporting: boolean;
}) {
  const { language } = useLanguage(); const copy = (id: string, en: string) => language === 'id' ? id : en;
  const { isDark } = useTheme(); const c = useColors(isDark);
  const incomeColor = isDark ? '#88C9A0' : '#286346';
  const expenseColor = isDark ? '#F5AD8B' : '#A44E2C';
  const card = [styles.card, { backgroundColor: c.bgCard, borderColor: c.border }];
  const heading = [styles.heading, { color: c.textPrimary }];
  const muted = { color: c.textSecondary, fontSize: 14, lineHeight: 21 };
  const change = (current: number, previous: number) => {
    if (hidden) return '••••';
    const delta = percentageChange(current, previous);
    return delta === null ? copy('Belum ada pembanding', 'No previous baseline') : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}% ${copy('vs periode sebelumnya', 'vs previous period')}`;
  };
  const peak = Math.max(1, ...report.trend.flatMap(point => [point.income, point.expense]));
  const categorySection = (type: 'income' | 'expense', limit?: number) => {
    const rows = type === 'income' ? report.incomeCategories : report.expenseCategories;
    return <View style={card}>
      <Text style={heading}>{type === 'income' ? copy('Sumber pemasukan', 'Income sources') : copy('Pengeluaran per kategori', 'Spending by category')}</Text>
      <Text style={[muted, { marginBottom: 12 }]}>{copy('Ketuk kategori untuk melihat transaksinya.', 'Tap a category to view its transactions.')}</Text>
      {!rows.length && <Text style={muted}>{copy('Belum ada data pada periode ini.', 'No data for this period.')}</Text>}
      {rows.slice(0, limit).map(row => <TouchableOpacity key={row.category} accessibilityRole="button" onPress={() => onTransactions(type, row.category)} style={{ paddingVertical: 12, minHeight: 64 }}>
        <View style={styles.between}><Text style={[styles.body, { color: c.textPrimary, flex: 1 }]}>{categoryLabel(row.category)}</Text><MaterialIcons name="chevron-right" color={c.textSecondary} size={22} /></View>
        <View style={[styles.between, { marginTop: 4, flexWrap: 'wrap' }]}><Text style={muted}>{row.count} {copy('transaksi', 'transactions')}</Text><Text style={{ color: c.textPrimary, fontWeight: '700' }}>{money(row.amount)}{!hidden ? ` · ${(row.share * 100).toFixed(1)}%` : ''}</Text></View>
        {!hidden && <View style={{ height: 6, backgroundColor: c.bgSecondary, borderRadius: 3, marginTop: 10 }}><View style={{ width: `${row.share * 100}%`, height: 6, borderRadius: 3, backgroundColor: type === 'income' ? incomeColor : expenseColor }} /></View>}
      </TouchableOpacity>)}
      {!!limit && rows.length > limit && <TouchableOpacity onPress={() => onTransactions(type)} style={styles.action}><Text style={{ color: c.textPrimary }}>{copy('Lihat seluruh transaksi', 'View all transactions')}</Text></TouchableOpacity>}
    </View>;
  };
  return <>
    <View style={[styles.card, { backgroundColor: '#193F30', borderColor: '#193F30' }]}>
      <Text style={{ color: '#D7E7DC', fontSize: 14 }}>{copy('Selisih uang masuk dan keluar', 'Money in minus money out')}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '800', marginVertical: 12 }}>{money(report.net)}</Text>
      <Text style={{ color: '#D7E7DC', fontSize: 13, lineHeight: 20 }}>{copy('Pemasukan dikurangi pengeluaran tercatat; bukan saldo rekening.', 'Recorded income minus expenses; this is not your bank balance.')}</Text>
    </View>
    <View style={styles.grid}>{([
      ['income', copy('Pemasukan', 'Income'), report.income, report.previousIncome, 'south-west', incomeColor],
      ['expense', copy('Pengeluaran', 'Expenses'), report.expense, report.previousExpense, 'north-east', expenseColor],
    ] as const).map(([type, label, amount, prior, icon, color]) => <TouchableOpacity key={type} accessibilityRole="button" onPress={() => onTransactions(type)} style={[...card, { flexBasis: '46%', flexGrow: 1, marginBottom: 0 }]}>
      <MaterialIcons name={icon} size={24} color={color} /><Text style={[muted, { marginTop: 10 }]}>{label}</Text><Text style={{ color: c.textPrimary, fontSize: 18, fontWeight: '800', marginVertical: 8 }}>{money(amount)}</Text>{mode === 'reports' && <Text style={{ color: c.textSecondary, fontSize: 12, lineHeight: 18 }}>{change(amount, prior)}</Text>}
    </TouchableOpacity>)}</View>
    {mode === 'reports' && <Text style={[muted, { fontSize: 12, marginBottom: 16 }]}>{copy('Perbandingan memakai seluruh periode sebelumnya; periode berjalan belum lengkap. Seluruh transaksi bertanggal dalam periode ini dihitung, termasuk tanggal mendatang.', 'Comparison uses the full previous period; the current period is incomplete. All dated entries in this period are counted, including future dates.')}</Text>}
    {!report.rows.length && <View style={card}><Text style={heading}>{copy('Belum ada transaksi di periode ini', 'No transactions in this period')}</Text><Text style={muted}>{copy('Pilih periode lain atau catat pemasukan atau pengeluaran pertama.', 'Choose another period or record your first income or expense.')}</Text></View>}
    {mode === 'reports' && <><View style={card}>
      <Text style={heading}>{mode === 'reports' ? copy('Ringkasan laporan', 'Report summary') : copy('Sekilas keuangan', 'At a glance')}</Text>
      {[
        [copy('Transaksi tercatat', 'Recorded transactions'), String(report.rows.length)],
        [copy('Rata-rata pengeluaran / hari', 'Average daily spending'), money(report.averageExpense)],
        [copy('Sisa pemasukan (%)', 'Income retained (%)'), hidden ? '••••' : report.retainedRatio === null ? copy('Tanpa pemasukan', 'No income') : `${report.retainedRatio.toFixed(1)}%`],
      ].map(([label, value]) => <View key={label} style={[styles.between, { paddingVertical: 12, borderBottomWidth: 1, borderColor: c.border, flexWrap: 'wrap' }]}><Text style={[muted, { flexShrink: 1 }]}>{label}</Text><Text style={{ color: c.textPrimary, fontSize: 15, fontWeight: '700' }}>{value}</Text></View>)}
      <Text style={[muted, { marginTop: 12, fontSize: 12 }]}>{copy(`Rata-rata dihitung dari ${report.days} hari kalender pada seluruh periode. Sisa pemasukan = arus kas bersih ÷ pemasukan.`, `Daily average uses all ${report.days} calendar days in this period. Income retained = net cash flow ÷ income.`)}</Text>
    </View>
    <View style={card}>
      <Text style={heading}>{copy('Tren arus kas', 'Cash flow trend')}</Text>
      <Text style={muted}>{report.trend.length === 6 ? copy('Enam bulan hingga bulan terpilih', 'Six months ending in the selected month') : copy('Pemasukan dan pengeluaran Januari–Desember', 'January–December income and expenses')}</Text>
      {hidden ? <Text style={[muted, { paddingVertical: 20 }]}>{copy('Grafik disembunyikan mengikuti pengaturan privasi.', 'Chart hidden by your privacy setting.')}</Text> : <>
        <View style={{ flexDirection: 'row', gap: 20, marginVertical: 16 }}><Text style={{ color: incomeColor }}>▥ {copy('Masuk', 'Income')}</Text><Text style={{ color: expenseColor }}>▤ {copy('Keluar', 'Expenses')}</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
          {report.trend.map(point => <View key={point.date.toISOString()} accessible accessibilityLabel={`${point.date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' })}, ${copy('pemasukan', 'income')} ${money(point.income)}, ${copy('pengeluaran', 'expenses')} ${money(point.expense)}`} style={{ width: 64 }}>
            <View style={{ height: 100, flexDirection: 'row', gap: 6, alignItems: 'flex-end', justifyContent: 'center', borderBottomWidth: 1, borderColor: c.border }}>
              <View style={{ width: 14, height: point.income / peak * 100, backgroundColor: incomeColor, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
              <View style={{ width: 14, height: point.expense / peak * 100, backgroundColor: expenseColor, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderWidth: point.expense ? 1 : 0, borderColor: c.textSecondary }} />
            </View><Text style={{ color: c.textSecondary, textAlign: 'center', fontSize: 12, marginTop: 8 }}>{point.date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { month: 'short', year: '2-digit' })}</Text>
          </View>)}
        </ScrollView>
        {mode === 'reports' && report.trend.map(point => <View key={point.date.toISOString()} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: c.border }}>
          <Text style={{ color: c.textPrimary, fontWeight: '700', marginBottom: 4 }}>{point.date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' })}</Text>
          <Text style={muted}>{copy('Masuk', 'In')}: {money(point.income)}</Text><Text style={muted}>{copy('Keluar', 'Out')}: {money(point.expense)}</Text>
        </View>)}
      </>}
    </View>
    </>}
    {!!report.expenseCategories.length && categorySection('expense', mode === 'dashboard' ? 3 : undefined)}
    {mode === 'reports' && <>
      {categorySection('income')}
      <View style={card}>
        <Text style={heading}>{copy('Perbandingan periode sebelumnya', 'Previous period comparison')}</Text>
        <Text style={muted}>{copy('Membandingkan seluruh bulan/tahun terpilih dengan seluruh periode sebelumnya. Periode berjalan belum lengkap.', 'Compares the full selected month/year with the full previous period. The current period is incomplete.')}</Text>
        <Text style={[muted, { marginTop: 12 }]}>{copy('Pemasukan sebelumnya', 'Previous income')}: {money(report.previousIncome)}</Text><Text style={muted}>{copy('Pengeluaran sebelumnya', 'Previous expenses')}: {money(report.previousExpense)}</Text>
      </View>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: hidden || exporting || !report.rows.length }} disabled={hidden || exporting || !report.rows.length} onPress={onExport} style={[styles.export, { backgroundColor: '#193F30', opacity: hidden || !report.rows.length ? 0.5 : 1 }]}><MaterialIcons name="file-download" size={22} color="#FFFFFF" /><Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', flexShrink: 1 }}>{exporting ? copy('Menyiapkan CSV…', 'Preparing CSV…') : copy('Ekspor transaksi periode ini · CSV', 'Export period transactions · CSV')}</Text></TouchableOpacity>
      {hidden && <Text style={[muted, { marginBottom: 20 }]}>{copy('Ekspor dinonaktifkan saat nominal disembunyikan.', 'Export is disabled while amounts are hidden.')}</Text>}
    </>}
  </>;
}
const styles = StyleSheet.create({ card: { padding: 18, borderRadius: 20, borderWidth: 1, marginBottom: 16 }, heading: { fontSize: 18, fontWeight: '800', marginBottom: 10 }, body: { fontSize: 15, fontWeight: '700' }, between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }, action: { minHeight: 48, justifyContent: 'center' }, export: { minHeight: 56, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 } });
