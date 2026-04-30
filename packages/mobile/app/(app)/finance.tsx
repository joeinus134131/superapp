import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, StyleSheet, Dimensions, RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { MOBILE_SPACING, useMobileLayout } from '../../lib/layout';
import { getData, setData, STORAGE_KEYS } from '../../lib/storage';
import { generateId, formatCurrency, formatDate, formatRupiahInput, parseRupiahInput } from '../../lib/helpers';
import { PageHeader } from '../../components/PageHeader';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
}

interface CustomCategory {
  id: string;
  label: string;
  emoji: string;
  color: string;
  type: 'income' | 'expense';
}

const INCOME_CATS = ['Gaji', 'Freelance', 'Investasi', 'Bonus', 'Lainnya'];
const EXPENSE_CATS = ['Makanan', 'Transport', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Lainnya'];

export default function FinanceScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<'all' | 'income' | 'expense'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    category: 'Makanan',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [listPage, setListPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCat, setNewCat] = useState({ label: '', emoji: '✨', color: '#8b5cf6', type: 'expense' as 'income' | 'expense' });

  const load = useCallback(async () => {
    const saved = await getData(STORAGE_KEYS.TRANSACTIONS);
    if (saved && Array.isArray(saved)) setTransactions(saved);
    const savedCats = await getData(STORAGE_KEYS.CUSTOM_CATEGORIES);
    if (savedCats && Array.isArray(savedCats)) setCustomCategories(savedCats);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (data: Transaction[]) => {
    setTransactions(data);
    await setData(STORAGE_KEYS.TRANSACTIONS, data);
  };

  const handleSubmit = async () => {
    const rawAmt = parseRupiahInput(form.amount);
    const amt = parseFloat(rawAmt);
    if (!amt || amt <= 0) return;
    const tx: Transaction = {
      id: generateId(),
      type: form.type,
      amount: amt,
      category: form.category,
      description: form.description,
      date: form.date,
    };
    await save([tx, ...transactions]);
    setShowModal(false);
    setForm({ type: 'expense', amount: '', category: 'Makanan', description: '', date: new Date().toISOString().split('T')[0] });
  };

  const deleteTransaction = (id: string) => {
    Alert.alert('Hapus Transaksi', 'Yakin?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => save(transactions.filter(t => t.id !== id)) },
    ]);
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = tab === 'all' ? transactions : transactions.filter(t => t.type === tab);
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const cats = form.type === 'income' ? INCOME_CATS : EXPENSE_CATS;

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <PageHeader
        title="Keuangan"
        subtitle="Catat pemasukan dan pengeluaran dengan rapi."
        textColor={c.textPrimary}
        subtextColor={c.textSecondary}
        borderColor={c.border}
        backgroundColor={c.bgPrimary}
        actionColor={c.green}
        onActionPress={() => setShowModal(true)}
      />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.purple} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: MOBILE_SPACING.screen, paddingTop: 14, paddingBottom: layout.bottomPadding }}
      >
        {/* Balance Card */}
        <View style={[styles.balanceCard, { backgroundColor: balance >= 0 ? c.green : c.red }]}>
          <Text style={styles.balanceLabel}>Saldo Bersih</Text>
          <Text style={styles.balanceAmount}>{formatCurrency(balance)}</Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <MaterialIcons name="arrow-upward" size={16} color="#fff" />
              <Text style={styles.balanceItemText}>{formatCurrency(totalIncome)}</Text>
            </View>
            <View style={[styles.balanceDivider]} />
            <View style={styles.balanceItem}>
              <MaterialIcons name="arrow-downward" size={16} color="#fff" />
              <Text style={styles.balanceItemText}>{formatCurrency(totalExpense)}</Text>
            </View>
          </View>
        </View>

        {/* Category summary */}
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="pie-chart" size={18} color={c.purple} />
            <Text style={[styles.cardTitle, { color: c.textPrimary }]}>Ringkasan Bulan Ini</Text>
          </View>
          {[
            { label: 'Total Pemasukan', value: totalIncome, color: c.green, icon: 'arrow-upward' as const },
            { label: 'Total Pengeluaran', value: totalExpense, color: c.red, icon: 'arrow-downward' as const },
            { label: 'Jumlah Transaksi', value: transactions.length, color: c.purple, icon: 'receipt-long' as const, isCurrency: false },
          ].map((item, i) => (
            <View key={i} style={[styles.summaryRow, { borderBottomColor: c.border }]}>
              <View style={styles.summaryLeft}>
                <View style={[styles.summaryIcon, { backgroundColor: item.color + '22' }]}>
                  <MaterialIcons name={item.icon} size={16} color={item.color} />
                </View>
                <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>{item.label}</Text>
              </View>
              <Text style={[styles.summaryValue, { color: item.color }]}>
                {(item as any).isCurrency === false ? item.value : formatCurrency(item.value as number)}
              </Text>
            </View>
          ))}
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabRow}>
          {(['all', 'income', 'expense'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && { backgroundColor: c.purple + '22', borderColor: c.purple }]}
              onPress={() => { setTab(t); setListPage(1); }}
            >
              <Text style={[styles.tabText, { color: tab === t ? c.purple : c.textSecondary }]}>
                {t === 'all' ? 'Semua' : t === 'income' ? 'Pemasukan' : 'Pengeluaran'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transactions List */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="account-balance-wallet" size={48} color={c.textMuted} />
            <Text style={[styles.emptyText, { color: c.textMuted }]}>Belum ada transaksi</Text>
          </View>
        ) : (
          <>
            {filtered.slice((listPage - 1) * ITEMS_PER_PAGE, listPage * ITEMS_PER_PAGE).map(tx => (
              <View key={tx.id} style={[styles.txCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
                <View style={[styles.txIcon, { backgroundColor: (tx.type === 'income' ? c.green : c.red) + '22' }]}>
                  <MaterialIcons
                    name={tx.type === 'income' ? 'arrow-upward' : 'arrow-downward'}
                    size={20}
                    color={tx.type === 'income' ? c.green : c.red}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.txCategory, { color: c.textPrimary }]}>{tx.category}</Text>
                  {tx.description ? <Text style={[styles.txDesc, { color: c.textSecondary }]}>{tx.description}</Text> : null}
                  <Text style={[styles.txDate, { color: c.textMuted }]}>{formatDate(tx.date)}</Text>
                </View>
                <View style={styles.txRight}>
                  <Text style={[styles.txAmount, { color: tx.type === 'income' ? c.green : c.red }]}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </Text>
                  <TouchableOpacity onPress={() => deleteTransaction(tx.id)} style={{ marginTop: 4 }}>
                    <MaterialIcons name="delete-outline" size={18} color={c.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            
            {filtered.length > ITEMS_PER_PAGE && (
              <View style={styles.paginationRow}>
                <Text style={{ color: c.textSecondary, fontSize: 13 }}>
                  Halaman {listPage} dari {Math.ceil(filtered.length / ITEMS_PER_PAGE)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity 
                    style={[styles.pageBtn, { borderColor: c.border }]} 
                    disabled={listPage === 1} 
                    onPress={() => setListPage(p => Math.max(1, p - 1))}
                  >
                    <Text style={{ color: listPage === 1 ? c.textMuted : c.textPrimary }}>Prev</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.pageBtn, { borderColor: c.border }]} 
                    disabled={listPage * ITEMS_PER_PAGE >= filtered.length} 
                    onPress={() => setListPage(p => p + 1)}
                  >
                    <Text style={{ color: listPage * ITEMS_PER_PAGE >= filtered.length ? c.textMuted : c.textPrimary }}>Next</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.bgSecondary, paddingBottom: Math.max(layout.insets.bottom, 20) + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>Transaksi Baru</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <MaterialIcons name="close" size={24} color={c.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Visualisasi Pengeluaran */}
              {totalExpense > 0 && (
                <View style={[styles.txCard, { backgroundColor: c.bgCard, borderColor: c.border, marginBottom: 24, flexDirection: 'column', alignItems: 'stretch' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <MaterialIcons name="pie-chart" size={20} color={c.purple} />
                    <Text style={{ color: c.textPrimary, fontSize: 16, fontWeight: '700' }}>Alokasi Pengeluaran</Text>
                  </View>
                  {Object.entries(
                    transactions
                      .filter(t => t.type === 'expense')
                      .reduce((acc, t) => {
                        acc[t.category] = (acc[t.category] || 0) + t.amount;
                        return acc;
                      }, {} as Record<string, number>)
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4) // Top 4
                    .map(([cat, amt]) => {
                      const pct = (amt / totalExpense) * 100;
                      return (
                        <View key={cat} style={{ marginBottom: 12 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ color: c.textSecondary, fontSize: 13 }}>{cat}</Text>
                            <Text style={{ color: c.textPrimary, fontSize: 13, fontWeight: '600' }}>{Math.round(pct)}%</Text>
                          </View>
                          <View style={{ height: 8, backgroundColor: c.border, borderRadius: 4, overflow: 'hidden' }}>
                            <View style={{ height: '100%', width: `${pct}%`, backgroundColor: c.purple, borderRadius: 4 }} />
                          </View>
                        </View>
                      );
                    })}
                </View>
              )}

              {/* Type */}
              <View style={styles.typeRow}>
                {(['expense', 'income'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, form.type === t && {
                      backgroundColor: (t === 'income' ? c.green : c.red) + '22',
                      borderColor: t === 'income' ? c.green : c.red,
                    }]}
                    onPress={() => setForm({ ...form, type: t, category: t === 'income' ? 'Gaji' : 'Makanan' })}
                  >
                    <MaterialIcons
                      name={t === 'income' ? 'arrow-upward' : 'arrow-downward'}
                      size={18}
                      color={form.type === t ? (t === 'income' ? c.green : c.red) : c.textSecondary}
                    />
                    <Text style={[styles.typeBtnText, { color: form.type === t ? (t === 'income' ? c.green : c.red) : c.textSecondary }]}>
                      {t === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Jumlah (Rp)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                value={form.amount}
                onChangeText={v => setForm({ ...form, amount: formatRupiahInput(v) })}
                placeholder="0"
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
              />

              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Kategori</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(form.type === 'income' 
                    ? [...INCOME_CATS, ...customCategories.filter(c => c.type === 'income').map(c => c.label)] 
                    : [...EXPENSE_CATS, ...customCategories.filter(c => c.type === 'expense').map(c => c.label)]
                  ).map(catLabel => {
                    const isCustom = customCategories.find(c => c.label === catLabel);
                    const displayLabel = isCustom ? `${isCustom.emoji} ${catLabel}` : catLabel;
                    return (
                      <TouchableOpacity
                        key={catLabel}
                        style={[styles.catChip, form.category === catLabel && { backgroundColor: c.purple + '22', borderColor: c.purple }]}
                        onPress={() => setForm({ ...form, category: catLabel })}
                      >
                        <Text style={{ color: form.category === catLabel ? c.purple : c.textSecondary }}>{displayLabel}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={[styles.catChip, { borderStyle: 'dashed', borderColor: c.border }]}
                    onPress={() => { setShowModal(false); setShowCatModal(true); }}
                  >
                    <Text style={{ color: c.textMuted }}>+ Baru</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Keterangan (opsional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                value={form.description}
                onChangeText={v => setForm({ ...form, description: v })}
                placeholder="Catatan transaksi..."
                placeholderTextColor={c.textMuted}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: c.border }]} onPress={() => setShowModal(false)}>
                  <Text style={{ color: c.textSecondary, fontWeight: '600' }}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: c.green }]} onPress={handleSubmit}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Simpan</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Categories Modal */}
      <Modal visible={showCatModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.bgPrimary, borderColor: c.border, borderWidth: 1, height: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>Kategori Kustom 👑</Text>
              <TouchableOpacity onPress={() => setShowCatModal(false)}>
                <MaterialIcons name="close" size={24} color={c.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Add New Category */}
              <View style={{ marginBottom: 24 }}>
                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Tipe Kategori</Text>
                <View style={styles.typeTabs}>
                  <TouchableOpacity
                    style={[styles.typeBtn, newCat.type === 'expense' && { backgroundColor: c.red + '22', borderColor: c.red }]}
                    onPress={() => setNewCat({ ...newCat, type: 'expense' })}
                  >
                    <Text style={{ color: newCat.type === 'expense' ? c.red : c.textSecondary, fontWeight: '600' }}>Pengeluaran</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeBtn, newCat.type === 'income' && { backgroundColor: c.green + '22', borderColor: c.green }]}
                    onPress={() => setNewCat({ ...newCat, type: 'income' })}
                  >
                    <Text style={{ color: newCat.type === 'income' ? c.green : c.textSecondary, fontWeight: '600' }}>Pemasukan</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.inputLabel, { color: c.textSecondary, marginTop: 16 }]}>Emoji & Nama</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TextInput
                    style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border, width: 60, textAlign: 'center' }]}
                    value={newCat.emoji}
                    onChangeText={v => setNewCat({ ...newCat, emoji: v })}
                    maxLength={2}
                  />
                  <TextInput
                    style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border, flex: 1 }]}
                    value={newCat.label}
                    onChangeText={v => setNewCat({ ...newCat, label: v })}
                    placeholder="Nama Kategori..."
                    placeholderTextColor={c.textMuted}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: c.purple, marginTop: 16 }]}
                  onPress={async () => {
                    if (!newCat.label) return;
                    const cCat: CustomCategory = {
                      id: generateId(),
                      label: newCat.label.trim(),
                      emoji: newCat.emoji || '✨',
                      color: newCat.color,
                      type: newCat.type
                    };
                    const updated = [...customCategories, cCat];
                    setCustomCategories(updated);
                    await setData(STORAGE_KEYS.CUSTOM_CATEGORIES, updated);
                    setNewCat({ ...newCat, label: '', emoji: '✨' });
                  }}
                >
                  <Text style={styles.submitBtnText}>Tambah Kategori</Text>
                </TouchableOpacity>
              </View>

              {/* List Categories */}
              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Kategori Tersimpan</Text>
              {customCategories.length === 0 ? (
                <Text style={{ color: c.textMuted, marginTop: 8 }}>Belum ada kategori kustom.</Text>
              ) : customCategories.map(cat => (
                <View key={cat.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 24 }}>{cat.emoji}</Text>
                    <View>
                      <Text style={{ color: c.textPrimary, fontSize: 16, fontWeight: '600' }}>{cat.label}</Text>
                      <Text style={{ color: cat.type === 'income' ? c.green : c.red, fontSize: 12 }}>
                        {cat.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={async () => {
                    const updated = customCategories.filter(c => c.id !== cat.id);
                    setCustomCategories(updated);
                    await setData(STORAGE_KEYS.CUSTOM_CATEGORIES, updated);
                  }}>
                    <MaterialIcons name="delete" size={20} color={c.red} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  balanceCard: { borderRadius: 20, padding: 20, marginBottom: 16, alignItems: 'center' },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  balanceAmount: { color: '#fff', fontSize: 32, fontWeight: '800', marginBottom: 16 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  balanceItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balanceItemText: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '700' },
  balanceDivider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.3)' },

  card: { borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700' },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 14, fontWeight: '700' },

  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tabBtn: { flex: 1, minHeight: 44, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 13, fontWeight: '700' },

  txCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txCategory: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  txDesc: { fontSize: 12, marginBottom: 2 },
  txDate: { fontSize: 11 },
  txRight: { alignItems: 'flex-end', minWidth: 88 },
  txAmount: { fontSize: 15, fontWeight: '800' },

  pageBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  paginationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.2)' },

  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 15, fontWeight: '600', marginTop: 12 },

  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  typeBtnText: { fontSize: 14, fontWeight: '700' },

  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 12, padding: 12, fontSize: 15, borderWidth: 1 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  optionText: { fontSize: 12, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 20 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  submitBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});
