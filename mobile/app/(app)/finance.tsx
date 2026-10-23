import { SyncStatusNotice } from '../../components/SyncStatusNotice';
import { FinanceOverview } from '../../components/finance/FinanceOverview';
import { financeReport, financeCsv, shiftPeriod, FinancePeriod } from '../../lib/financeReports';
import { exportFinanceReport } from '../../lib/exportFinanceReport';
import { useCreateAction } from '../../hooks/useCreateAction';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, Alert, StyleSheet, Dimensions, RefreshControl,
  KeyboardAvoidingView, Platform, Keyboard, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { WhenyaHeader } from '../../components/WhenyaHeader';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { MOBILE_SPACING, useMobileLayout } from '../../lib/layout';
import { getToday, formatCurrency, formatDate, formatRupiahInput, parseRupiahInput } from '../../lib/helpers';
import { useLanguage } from '../../context/languageContext';
import { useSettings } from '../../context/settingsContext';
import { useRouter, useFocusEffect } from 'expo-router';
import { FloatingActionButton } from '../../components/FloatingActionButton';

import { useFinance } from '../../hooks/useFinance';
import { Card } from '../../components/ui/Card';
import { statusAlert } from '../../lib/statusAlert';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const CATEGORY_CONFIG: Record<string, { icon: string, color: string, key: string }> = {
  'Makanan': { icon: 'restaurant', color: '#ef4444', key: 'finance.cat_food' },
  'Transport': { icon: 'directions-car', color: '#3b82f6', key: 'finance.cat_transport' },
  'Belanja': { icon: 'shopping-bag', color: '#ec4899', key: 'finance.cat_shopping' },
  'Tagihan': { icon: 'receipt', color: '#f59e0b', key: 'finance.cat_bills' },
  'Hiburan': { icon: 'sports-esports', color: '#52745a', key: 'finance.cat_entertainment' },
  'Kesehatan': { icon: 'medical-services', color: '#10b981', key: 'finance.cat_health' },
  'Pendidikan': { icon: 'school', color: '#6366f1', key: 'finance.cat_education' },
  'Gaji': { icon: 'payments', color: '#10b981', key: 'finance.cat_salary' },
  'Freelance': { icon: 'laptop-mac', color: '#3b82f6', key: 'finance.cat_freelance' },
  'Investasi': { icon: 'trending-up', color: '#52745a', key: 'finance.cat_investment' },
  'Bonus': { icon: 'card-giftcard', color: '#f59e0b', key: 'finance.cat_bonus' },
  'Lainnya': { icon: 'more-horiz', color: '#94a3b8', key: 'finance.cat_others' },
};

const INCOME_CATS = ['Gaji', 'Freelance', 'Investasi', 'Bonus', 'Lainnya'];
const EXPENSE_CATS = ['Makanan', 'Transport', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Lainnya'];

export default function FinanceScreen() {
  const { tx: translateCopy } = useLanguage();
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();
  const { settings } = useSettings();
  const { t, language } = useLanguage();
  const router = useRouter();
  const copy = (id: string, en: string) => language === 'id' ? id : en;
  const [screen, setScreen] = useState<'dashboard' | 'transactions' | 'reports'>('dashboard');
  const [period, setPeriod] = useState<FinancePeriod>('month');
  const [anchor, setAnchor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showPeriodOptions, setShowPeriodOptions] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const activeBackground = isDark ? '#365C45' : '#193F30';

  const {
    transactions, customCategories, loading, error,
    addTransaction, deleteTransaction, addCustomCategory,
    deleteCustomCategory, refreshFinance
  } = useFinance();

  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<'all' | 'income' | 'expense'>('all');
  const [form, setForm] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    category: 'Makanan',
    description: '',
    date: getToday(),
  });
  const openEntry = (type: 'income' | 'expense') => {
    setForm({ type, amount: '', category: type === 'income' ? 'Gaji' : 'Makanan', description: '', date: getToday() });
    setShowDetails(false); setShowDatePicker(false); setShowCatSelect(false); setShowModal(true);
  };
  useCreateAction(() => openEntry('expense'));
  const [listPage, setListPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const [showCatModal, setShowCatModal] = useState(false);
  const [showCatSelect, setShowCatSelect] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newCat, setNewCat] = useState({ label: '', emoji: '✨', color: '#52745a', type: 'expense' as 'income' | 'expense' });

  const translateCategory = (cat: string) => {
    return CATEGORY_CONFIG[cat] ? t(CATEGORY_CONFIG[cat].key) : cat;
  };

  const maskCurrency = (val: number | string) => {
    if (settings.hideFinanceBalance) return 'Rp ******';
    return typeof val === 'number' ? formatCurrency(val, language) : val;
  };

  const handleSubmit = async () => {
    if (saveLock.current) return;
    const amt = Number(parseRupiahInput(form.amount));
    if (!Number.isFinite(amt) || amt <= 0) {
      statusAlert.warning(
        copy('Nominal Belum Valid', 'Invalid Amount'),
        copy('Masukkan nominal lebih besar dari nol.', 'Enter an amount greater than zero.')
      );
      return;
    }
    saveLock.current = true; setSaving(true);
    try {
      await addTransaction({ type: form.type, amount: amt, category: form.category, description: form.description, date: form.date });
      const date = new Date(`${form.date}T12:00:00`);
      setAnchor(new Date(date.getFullYear(), date.getMonth(), 1));
      setCategoryFilter(null); setTab('all'); setListPage(1);
      setShowModal(false);
      statusAlert.success(
        copy('Transaksi Disimpan', 'Transaction Saved'),
        `${form.type === 'expense' ? copy('Pengeluaran', 'Expense') : copy('Pemasukan', 'Income')}: Rp ${formatRupiahInput(form.amount)} (${translateCategory(form.category)})`
      );
      setForm({ type: 'expense', amount: '', category: 'Makanan', description: '', date: getToday() });
    } catch {
      statusAlert.error(
        copy('Gagal Menyimpan', 'Could not save'),
        copy('Input tetap ada. Silakan coba lagi.', 'Your input is preserved. Please retry.')
      );
      Alert.alert(
        copy('Gagal menyimpan', 'Could not save'),
        copy('Input tetap ada. Silakan coba lagi.', 'Your input is preserved. Please retry.')
      );
    } finally { saveLock.current = false; setSaving(false); }
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('finance.title'), t('finance.delete_confirm') || translateCopy("Yakin hapus transaksi ini?"), [
      { text: t('finance.cancel'), style: 'cancel' },
      {
        text: t('tasks.delete_btn') || translateCopy("Hapus"),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTransaction(id);
            statusAlert.info(
              copy('Transaksi Dihapus', 'Transaction Deleted'),
              copy('Catatan transaksi telah dihapus.', 'Transaction record removed.')
            );
          } catch {
            statusAlert.error(
              copy('Gagal Menghapus Transaksi', 'Could Not Delete Transaction'),
              copy('Silakan coba lagi.', 'Please retry.')
            );
          }
        }
      },
    ]);
  };

  useFocusEffect(useCallback(() => { refreshFinance(); }, [refreshFinance]));
  const report = useMemo(() => financeReport(transactions, anchor, period), [transactions, anchor, period]);
  const filtered = useMemo(() => report.rows.filter(row => (tab === 'all' || row.type === tab) && (!categoryFilter || (row.category || 'Lainnya') === categoryFilter)), [report.rows, tab, categoryFilter]);
  useEffect(() => { setListPage(1); }, [anchor, period, tab, categoryFilter]);
  useEffect(() => { setListPage(page => Math.min(page, Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE)))); }, [filtered.length]);
  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [screen, anchor, period]);
  const openTransactions = (type: 'all' | 'income' | 'expense', category?: string) => {
    setTab(type); setCategoryFilter(category || null); setListPage(1); setScreen('transactions');
  };
  const isCurrentPeriod = anchor.getFullYear() === new Date().getFullYear() && (period === 'year' || anchor.getMonth() === new Date().getMonth());
  const periodLabel = anchor.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { ...(period === 'month' ? { month: 'long' as const } : {}), year: 'numeric' });
  const handleExport = async () => {
    if (exporting || settings.hideFinanceBalance || !report.rows.length) return;
    setExporting(true);
    try {
      await exportFinanceReport(financeCsv(report, language), `whenya-finance-${period}-${getToday(report.start)}-${Date.now()}.csv`);
    } catch {
      Alert.alert(copy('Ekspor belum berhasil', 'Export unavailable'), copy('Pastikan fitur berbagi tersedia di perangkat, lalu coba lagi.', 'Make sure sharing is available on this device, then retry.'));
    } finally { setExporting(false); }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <WhenyaHeader
        title={t('finance.title')}
        subtitle={copy('Catat uang masuk dan keluar', 'Keep track of money in and out')}
        showBack={router.canGoBack()}
        tabs={[
          { key: 'dashboard', label: copy('Ringkasan', 'Overview') },
          { key: 'transactions', label: copy('Riwayat', 'History') },
          { key: 'reports', label: copy('Laporan', 'Reports') },
        ]}
        activeTab={screen}
        onTabChange={key => setScreen(key as typeof screen)}
      />

      <ScrollView
        ref={scrollRef}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshFinance} tintColor={c.purple} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: layout.screenPadding, paddingTop: 14, paddingBottom: layout.bottomPadding }}
      >
        <SyncStatusNotice />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={copy('Periode sebelumnya', 'Previous period')} onPress={() => setAnchor(date => shiftPeriod(date, period, -1))} style={{ width: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}><MaterialIcons name="chevron-left" size={26} color={c.textPrimary} /></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={copy('Pilih bulan atau tahun', 'Choose month or year')} onPress={() => setShowPeriodOptions(true)} style={{ flex: 1, minHeight: 48, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ flexShrink: 1, textAlign: 'center', color: c.textPrimary, fontSize: 17, fontWeight: '700' }}>{periodLabel}</Text><MaterialIcons name="expand-more" size={20} color={c.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={copy('Periode berikutnya', 'Next period')} onPress={() => setAnchor(date => shiftPeriod(date, period, 1))} style={{ width: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}><MaterialIcons name="chevron-right" size={26} color={c.textPrimary} /></TouchableOpacity>
        </View>
        {!isCurrentPeriod && <Button label={copy('Kembali ke periode sekarang', 'Back to current period')} variant="outline" onPress={() => setAnchor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} style={{ marginBottom: 12 }} />}
        {error && <TouchableOpacity accessibilityRole="button" onPress={refreshFinance} style={{ padding: 16, minHeight: 48, marginBottom: 16, borderRadius: 12, backgroundColor: c.bgCard }}><Text accessibilityLiveRegion="polite" style={{ color: c.textPrimary }}>{copy('Data gagal dimuat. Angka mungkin belum terbaru. Ketuk untuk coba lagi.', 'Data could not load. Figures may be outdated. Tap to retry.')}</Text></TouchableOpacity>}
        {loading && !transactions.length ? <ActivityIndicator accessibilityLabel={copy('Memuat keuangan', 'Loading finance')} color={c.textPrimary} style={{ padding: 24 }} /> : error && !transactions.length ? <Text style={{ color: c.textSecondary, paddingVertical: 24 }}>{copy('Laporan akan tersedia setelah data berhasil dimuat.', 'Reports will be available once data loads successfully.')}</Text> : <>
        {report.excluded > 0 && <Text style={{ color: c.textSecondary, marginBottom: 16 }}>{copy(`${report.excluded} transaksi dengan tanggal/nominal tidak valid tidak dihitung.`, `${report.excluded} transactions with invalid dates/amounts are excluded.`)}</Text>}
        {screen !== 'transactions' && <FinanceOverview report={report} mode={screen} hidden={settings.hideFinanceBalance} money={maskCurrency} categoryLabel={translateCategory} onTransactions={openTransactions} onExport={handleExport} exporting={exporting} />}
        {screen === 'dashboard' && <>
          {!!report.rows.length && <Card style={{ marginBottom: 16, padding: 18 }}>
            <Text style={{ color: c.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>{copy('Transaksi terbaru', 'Recent transactions')}</Text>
            {report.rows.slice(0, 3).map(row => <View key={row.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: c.border }}>
              <Text style={{ color: c.textPrimary, fontWeight: '600' }}>{row.description || translateCategory(row.category)}</Text>
              <Text style={{ color: c.textSecondary, marginTop: 4 }}>{formatDate(row.date, language)} · {row.type === 'income' ? '+' : '−'}{maskCurrency(row.amount)}</Text>
            </View>)}
          </Card>}
          <Button label={copy('Lihat semua transaksi', 'View all transactions')} variant="secondary" onPress={() => openTransactions('all')} style={{ marginBottom: 12 }} />
          <Button label={copy('Lihat laporan lengkap', 'View full report')} variant="outline" onPress={() => setScreen('reports')} style={{ marginBottom: 16 }} />
        </>}
        {screen === 'transactions' && <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>{(['all', 'income', 'expense'] as const).map(value => <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: value === tab }} onPress={() => { setTab(value); setCategoryFilter(null); }} style={{ minHeight: 48, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: tab === value ? activeBackground : c.bgCard }}><Text style={{ color: tab === value ? '#FFFFFF' : c.textPrimary }}>{value === 'all' ? copy('Semua', 'All') : value === 'income' ? copy('Pemasukan', 'Income') : copy('Pengeluaran', 'Expenses')}</Text></TouchableOpacity>)}</View>
          {categoryFilter && <TouchableOpacity accessibilityRole="button" onPress={() => setCategoryFilter(null)} style={{ minHeight: 48, justifyContent: 'center', marginBottom: 12 }}><Text style={{ color: c.textPrimary }}>{translateCategory(categoryFilter)} × {copy('Hapus filter', 'Clear filter')}</Text></TouchableOpacity>}
          <Text style={{ color: c.textSecondary, marginBottom: 16 }}>{filtered.length} {copy('transaksi pada periode ini', 'transactions in this period')}</Text>
        {/* Transactions List */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="account-balance-wallet" size={48} color={c.textMuted} />
            <Text style={[styles.emptyText, { color: c.textMuted }]}>{t('finance.no_transactions_yet')}</Text>
          </View>
        ) : (
          <>
            {filtered.slice((listPage - 1) * ITEMS_PER_PAGE, listPage * ITEMS_PER_PAGE).map(tx => (
              <Card key={tx.id} style={styles.txCard}>
                <View style={[styles.txIcon, { backgroundColor: (tx.type === 'income' ? c.green : c.red) + '22' }]}>
                  <MaterialIcons
                    name={tx.type === 'income' ? 'arrow-upward' : 'arrow-downward'}
                    size={20}
                    color={tx.type === 'income' ? c.green : c.red}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.txCategory, { color: c.textPrimary }]}>{translateCategory(tx.category)}</Text>
                  {tx.description ? <Text style={[styles.txDesc, { color: c.textSecondary }]}>{tx.description}</Text> : null}
                  <Text style={[styles.txDate, { color: c.textMuted }]}>{formatDate(tx.date, language)}</Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={[styles.txAmount, { color: tx.type === 'income' ? c.green : c.red }]}>
                    {tx.type === 'income' ? '+' : translateCopy("-")}{maskCurrency(tx.amount)}
                  </Text>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel={copy("Hapus transaksi", "Delete transaction")} onPress={() => handleDelete(tx.id)} style={{ minHeight: 48, minWidth: 48, alignItems: "flex-end", justifyContent: "center" }}>
                    <MaterialIcons name="delete-outline" size={18} color={c.textMuted} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}

            {filtered.length > ITEMS_PER_PAGE && (
              <View style={styles.paginationRow}>
                <Text style={{ color: c.textSecondary, fontSize: 13 }}>
                  {t('finance.page')} {listPage} {t('finance.of')} {Math.ceil(filtered.length / ITEMS_PER_PAGE)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.pageBtn, { borderColor: c.border }]}
                    disabled={listPage === 1}
                    onPress={() => setListPage(p => Math.max(1, p - 1))}
                  >
                    <Text style={{ color: listPage === 1 ? c.textMuted : c.textPrimary }}>{t('finance.prev')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pageBtn, { borderColor: c.border }]}
                    disabled={listPage * ITEMS_PER_PAGE >= filtered.length}
                    onPress={() => setListPage(p => p + 1)}
                  >
                    <Text style={{ color: listPage * ITEMS_PER_PAGE >= filtered.length ? c.textMuted : c.textPrimary }}>{t('finance.next')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
        </>}
        </>}
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: showTools }} onPress={() => setShowTools(value => !value)} style={{ minHeight: 56, flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 12 }}>
          <MaterialIcons name="tune" size={22} color={c.textSecondary} /><View style={{ flex: 1 }}><Text style={{ color: c.textPrimary, fontWeight: '700', fontSize: 16 }}>{copy('Fitur lainnya', 'More tools')}</Text><Text style={{ color: c.textSecondary, marginTop: 4 }}>{copy('Kategori, buku keuangan, inbox, dan riset', 'Categories, finance books, inbox, and research')}</Text></View><MaterialIcons name={showTools ? 'expand-less' : 'expand-more'} size={24} color={c.textSecondary} />
        </TouchableOpacity>
        {showTools && <View style={{ gap: 8, paddingVertical: 12 }}>
          <Button label={copy('Kelola kategori', 'Manage categories')} variant="secondary" onPress={() => setShowCatModal(true)} />
          <Button label={copy('Buka buku keuangan', 'Open finance books')} variant="secondary" onPress={() => router.push('/finance-repository' as any)} />
          <Text style={{ color: c.textSecondary, lineHeight: 21 }}>{copy('Buku terpisah, inbox pencatatan, dan riset tetap tersedia di sini.', 'Separate books, the capture inbox, and research are available here.')}</Text>
        </View>}
      </ScrollView>

      <FloatingActionButton
        accessibilityLabel={t('finance.add_transaction')}
        onPress={() => openEntry('expense')}
      />

      <Modal visible={showPeriodOptions} animationType="slide" transparent onRequestClose={() => setShowPeriodOptions(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={copy('Tutup pilihan periode', 'Close period options')} style={StyleSheet.absoluteFill} onPress={() => setShowPeriodOptions(false)} />
          <View style={[styles.modalContent, { backgroundColor: c.bgSecondary, paddingBottom: Math.max(layout.insets.bottom, 20) + 16 }]}>
            <Text style={[styles.modalTitle, { color: c.textPrimary, marginBottom: 12 }]}>{copy('Tampilkan berdasarkan', 'Show by')}</Text>
            {(['month', 'year'] as const).map(value => <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: period === value }} onPress={() => { setPeriod(value); setShowPeriodOptions(false); }} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text style={{ flex: 1, color: c.textPrimary, fontSize: 17 }}>{value === 'month' ? copy('Bulanan', 'Monthly') : copy('Tahunan', 'Yearly')}</Text>{period === value && <MaterialIcons name="check" size={24} color={c.textPrimary} />}</TouchableOpacity>)}
            <Button label={copy('Tutup', 'Close')} variant="secondary" onPress={() => setShowPeriodOptions(false)} />
          </View>
        </View>
      </Modal>

      {/* Add Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => {
                Keyboard.dismiss();
                setShowModal(false);
              }}
            />
            <View style={[styles.modalContent, { backgroundColor: c.bgSecondary, paddingBottom: Math.max(layout.insets.bottom, 20) + 16 }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{t('finance.add_transaction')}</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={copy("Tutup form", "Close form")} style={{ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }} onPress={() => setShowModal(false)}>
                  <MaterialIcons name="close" size={24} color={c.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
              <View style={styles.typeRow}>
                {(['expense', 'income'] as const).map(tKey => (
                  <TouchableOpacity
                    key={tKey}
                    style={[styles.typeBtn, form.type === tKey && {
                      backgroundColor: (tKey === 'income' ? c.green : c.red) + '22',
                      borderColor: tKey === 'income' ? c.green : c.red,
                    }]}
                    onPress={() => setForm({ ...form, type: tKey, category: tKey === 'income' ? 'Gaji' : 'Makanan' })}
                  >
                    <MaterialIcons
                      name={tKey === 'income' ? 'arrow-upward' : 'arrow-downward'}
                      size={18}
                      color={form.type === tKey ? (tKey === 'income' ? c.green : c.red) : c.textSecondary}
                    />
                    <Text style={[styles.typeBtnText, { color: form.type === tKey ? (tKey === 'income' ? c.green : c.red) : c.textSecondary }]}>
                      {tKey === 'income' ? t('finance.income') : t('finance.expense')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label={t('finance.amount')}
                value={form.amount}
                onChangeText={v => setForm({ ...form, amount: formatRupiahInput(v) })}
                placeholder="0"
                keyboardType="numeric"
              />

              <Text style={[styles.inputLabel, { color: c.textSecondary, marginBottom: 12 }]}>{t('finance.category')}</Text>
              <TouchableOpacity
                style={[styles.selectBtn, { backgroundColor: c.bgInput, borderColor: c.border }]}
                accessibilityRole="button" accessibilityLabel={copy("Pilih kategori", "Choose category")} accessibilityState={{ expanded: showCatSelect }} onPress={() => setShowCatSelect(value => !value)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={[styles.miniIcon, { backgroundColor: (CATEGORY_CONFIG[form.category]?.color || c.purple) }]}>
                    <MaterialIcons
                      name={(CATEGORY_CONFIG[form.category]?.icon || 'star') as any}
                      size={14}
                      color="#fff"
                    />
                  </View>
                  <Text style={{ color: c.textPrimary, fontSize: 15, fontWeight: '700' }}>
                    {translateCategory(form.category)}
                  </Text>
                </View>
                <MaterialIcons name="unfold-more" size={20} color={c.textMuted} />
              </TouchableOpacity>

              {showCatSelect && <View style={{ marginBottom: 16 }}>
                <Text style={{ color: c.textSecondary, marginBottom: 12 }}>{copy('Pilih kategori untuk transaksi ini.', 'Choose a category for this entry.')}</Text>
              <View style={styles.categoryGrid}>
                {(form.type === 'income'
                  ? [...INCOME_CATS, ...customCategories.filter(cat => cat.type === 'income').map(cat => cat.label)]
                  : [...EXPENSE_CATS, ...customCategories.filter(cat => cat.type === 'expense').map(cat => cat.label)]
                ).map(catLabel => {
                  const isCustom = customCategories.find(cat => cat.label === catLabel);
                  const config = CATEGORY_CONFIG[catLabel] || { icon: 'star', color: c.purple };
                  const isSelected = form.category === catLabel;

                  return (
                    <TouchableOpacity
                      key={catLabel}
                      accessibilityRole="button"
                      accessibilityLabel={translateCategory(catLabel)}
                      accessibilityState={{ selected: isSelected }}
                      style={[
                        styles.gridItem,
                        { backgroundColor: c.bgInput },
                        isSelected && { backgroundColor: config.color + '22', borderColor: config.color, borderWidth: 1.5 }
                      ]}
                      onPress={() => {
                        setForm({ ...form, category: catLabel });
                        setShowCatSelect(false);
                      }}
                    >
                      <View style={[styles.gridIcon, { backgroundColor: isSelected ? config.color : config.color + '15' }]}>
                        {isCustom ? (
                          <Text style={{ fontSize: 20 }}>{isCustom.emoji}</Text>
                        ) : (
                          <MaterialIcons name={config.icon as any} size={20} color={isSelected ? '#fff' : config.color} />
                        )}
                      </View>
                      <Text
                        style={[styles.gridLabel, { color: isSelected ? c.textPrimary : c.textSecondary }]}
                        numberOfLines={2}
                      >
                        {translateCategory(catLabel)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

              </View>
                <Text style={{ color: c.textSecondary, marginTop: 8 }}>{copy('Kategori baru dapat dibuat melalui Fitur lainnya → Kelola kategori.', 'Create new categories from More tools → Manage categories.')}</Text>
              </View>}

              <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: showDetails }} onPress={() => setShowDetails(value => !value)} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 }}>
                <MaterialIcons name="edit-note" size={24} color={c.textSecondary} /><Text style={{ flex: 1, color: c.textPrimary }}>{copy('Catatan dan tanggal', 'Note and date')}</Text><MaterialIcons name={showDetails ? 'expand-less' : 'expand-more'} size={24} color={c.textSecondary} />
              </TouchableOpacity>
              <Text style={{ color: c.textSecondary, marginBottom: 12 }}>{copy('Tanggal pencatatan: ', 'Entry date: ')}{formatDate(form.date, language)}</Text>
              {showDetails && <>
              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>{t('finance.date')}</Text>
              <TouchableOpacity
                style={[styles.dateInput, { backgroundColor: c.bgInput, borderColor: c.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <MaterialIcons name="event" size={20} color={c.purple} />
                <Text style={{ color: c.textPrimary, fontSize: 15, fontWeight: '600' }}>
                  {formatDate(form.date, language)}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  locale={language === 'id' ? 'id-ID' : 'en-US'}
                  value={new Date(form.date)}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setForm({ ...form, date: getToday(selectedDate) });
                    }
                  }}
                />
              )}

              <Input
                label={t('finance.description')}
                value={form.description}
                onChangeText={v => setForm({ ...form, description: v })}
                placeholder={t('finance.description_placeholder')}
                containerStyle={{ marginTop: 16 }}
              />

              </>}
              <View style={styles.modalActions}>
                <Button label={t('finance.cancel')} onPress={() => setShowModal(false)} variant="secondary" style={{ flex: 1, height: 60 }} />
                <Button label={t('finance.save')} loading={saving} onPress={handleSubmit} variant="primary" style={{ flex: 1, height: 60 }} />
              </View>
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Custom Categories Modal */}
      <Modal visible={showCatModal} animationType="slide" transparent onRequestClose={() => setShowCatModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => {
                Keyboard.dismiss();
                setShowCatModal(false);
              }}
            />
            <View style={[styles.modalContent, { backgroundColor: c.bgPrimary, height: '80%' }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{t('finance.category')}</Text>
                <TouchableOpacity onPress={() => setShowCatModal(false)}>
                  <MaterialIcons name="close" size={24} color={c.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
              <View style={{ marginBottom: 24 }}>
                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>{t('finance.type')}</Text>
                <View style={styles.typeTabs}>
                  <TouchableOpacity
                    style={[styles.typeBtnTab, newCat.type === 'expense' && { backgroundColor: c.red + '22', borderColor: c.red }]}
                    onPress={() => setNewCat({ ...newCat, type: 'expense' })}
                  >
                    <Text style={{ color: newCat.type === 'expense' ? c.red : c.textSecondary, fontWeight: '600' }}>{t('finance.expense')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeBtnTab, newCat.type === 'income' && { backgroundColor: c.green + '22', borderColor: c.green }]}
                    onPress={() => setNewCat({ ...newCat, type: 'income' })}
                  >
                    <Text style={{ color: newCat.type === 'income' ? c.green : c.textSecondary, fontWeight: '600' }}>{t('finance.income')}</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.inputLabel, { color: c.textSecondary, marginTop: 16 }]}>Emoji & {t('finance.category')}</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Input
                    value={newCat.emoji}
                    onChangeText={v => setNewCat({ ...newCat, emoji: v })}
                    maxLength={2}
                    inputStyle={{ width: 60, textAlign: 'center' }}
                  />
                  <Input
                    value={newCat.label}
                    onChangeText={v => setNewCat({ ...newCat, label: v })}
                    placeholder={t('finance.category')}
                    containerStyle={{ flex: 1 }}
                  />
                </View>

                <Button
                  label={t('finance.save')}
                  onPress={async () => {
                    if (!newCat.label) return;
                    await addCustomCategory({
                      label: newCat.label.trim(),
                      emoji: newCat.emoji || '✨',
                      color: newCat.color,
                      type: newCat.type
                    });
                    setNewCat({ ...newCat, label: '', emoji: '✨' });
                  }}
                  variant="primary"
                  style={{ height: 60 }}
                />
              </View>

              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>{t('finance.category')}</Text>
              {customCategories.length === 0 ? (
                <Text style={{ color: c.textMuted, marginTop: 8 }}>{t('finance.no_transactions_yet')}</Text>
              ) : customCategories.map(cat => (
                <View key={cat.id} style={[styles.customCatItem, { borderBottomColor: c.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 24 }}>{cat.emoji}</Text>
                    <View>
                      <Text style={{ color: c.textPrimary, fontSize: 16, fontWeight: '600' }}>{cat.label}</Text>
                      <Text style={{ color: cat.type === 'income' ? c.green : c.red, fontSize: 12 }}>
                        {cat.type === 'income' ? t('finance.income') : t('finance.expense')}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => deleteCustomCategory(cat.id)}>
                    <MaterialIcons name="delete" size={20} color={c.red} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>


    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1 },
  backBtn: { flexShrink: 0, width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerIconBox: { flexShrink: 0, width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 28, fontWeight: '900' },
  pageSubtitle: { fontSize: 14, marginTop: 2 },

  tabRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  tabBtn: { flex: 1, height: 48, borderRadius: 16, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(150,150,150,0.05)' },
  tabText: { fontSize: 14, fontWeight: '800' },

  txCard: { flexWrap: 'wrap', flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, marginBottom: 12 },
  txIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  txCategory: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  txDesc: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  txDate: { fontSize: 11, fontWeight: '700' },
  txRight: { maxWidth: '100%', alignItems: 'flex-end', minWidth: 100 },
  txAmount: { fontSize: 16, fontWeight: '900' },

  pageBtn: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  paginationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 20, borderTopWidth: 1 },

  emptyState: { alignItems: 'center', paddingVertical: 60, opacity: 0.6 },
  emptyText: { fontSize: 16, fontWeight: '800', marginTop: 16 },

  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: 'transparent', backgroundColor: 'rgba(150,150,150,0.05)' },
  typeBtnText: { fontSize: 15, fontWeight: '800' },
  typeTabs: { flexDirection: 'row', gap: 10 },
  typeBtnTab: { flex: 1, height: 50, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  inputLabel: { fontSize: 14, fontWeight: '800', marginBottom: 8, marginTop: 16 },
  dateInput: { borderRadius: 16, padding: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },

  categoryScroll: { gap: 10, paddingBottom: 8 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 100,
    borderWidth: 1
  },
  miniIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  categoryChipText: { fontSize: 14, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingHorizontal: 24, paddingTop: 28, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '900' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 40, marginBottom: 12 },

  selectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 40 },
  gridItem: { flexBasis: '45%', flexGrow: 1, minHeight: 104, alignItems: 'center', padding: 12, borderRadius: 20, gap: 10 },
  gridIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  gridLabel: { fontSize: 14, fontWeight: '800', textAlign: 'center' },

  customCatItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
});
