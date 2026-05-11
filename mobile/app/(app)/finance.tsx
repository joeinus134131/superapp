import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, Alert, StyleSheet, Dimensions, RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { MOBILE_SPACING, useMobileLayout } from '../../lib/layout';
import { formatCurrency, formatDate, formatRupiahInput, parseRupiahInput } from '../../lib/helpers';
import { useLanguage } from '../../context/languageContext';
import { useSettings } from '../../context/settingsContext';
import { FloatingActionButton } from '../../components/FloatingActionButton';

import { useFinance, Transaction, CustomCategory } from '../../hooks/useFinance';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';

const CATEGORY_CONFIG: Record<string, { icon: string, color: string, key: string }> = {
  'Makanan': { icon: 'restaurant', color: '#ef4444', key: 'finance.cat_food' },
  'Transport': { icon: 'directions-car', color: '#3b82f6', key: 'finance.cat_transport' },
  'Belanja': { icon: 'shopping-bag', color: '#ec4899', key: 'finance.cat_shopping' },
  'Tagihan': { icon: 'receipt', color: '#f59e0b', key: 'finance.cat_bills' },
  'Hiburan': { icon: 'sports-esports', color: '#8b5cf6', key: 'finance.cat_entertainment' },
  'Kesehatan': { icon: 'medical-services', color: '#10b981', key: 'finance.cat_health' },
  'Pendidikan': { icon: 'school', color: '#6366f1', key: 'finance.cat_education' },
  'Gaji': { icon: 'payments', color: '#10b981', key: 'finance.cat_salary' },
  'Freelance': { icon: 'laptop-mac', color: '#3b82f6', key: 'finance.cat_freelance' },
  'Investasi': { icon: 'trending-up', color: '#8b5cf6', key: 'finance.cat_investment' },
  'Bonus': { icon: 'card-giftcard', color: '#f59e0b', key: 'finance.cat_bonus' },
  'Lainnya': { icon: 'more-horiz', color: '#94a3b8', key: 'finance.cat_others' },
};

const INCOME_CATS = ['Gaji', 'Freelance', 'Investasi', 'Bonus', 'Lainnya'];
const EXPENSE_CATS = ['Makanan', 'Transport', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Lainnya'];

export default function FinanceScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();
  const { settings } = useSettings();
  const { t, language } = useLanguage();

  const { 
    transactions, customCategories, loading, 
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
    date: new Date().toISOString().split('T')[0],
  });
  const [listPage, setListPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const [showCatModal, setShowCatModal] = useState(false);
  const [showCatSelect, setShowCatSelect] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newCat, setNewCat] = useState({ label: '', emoji: '✨', color: '#8b5cf6', type: 'expense' as 'income' | 'expense' });

  const translateCategory = (cat: string) => {
    return CATEGORY_CONFIG[cat] ? t(CATEGORY_CONFIG[cat].key) : cat;
  };

  const maskCurrency = (val: number | string) => {
    if (settings.hideFinanceBalance) return language === 'id' ? 'Rp ******' : '$ ******';
    return typeof val === 'number' ? formatCurrency(val, language) : val;
  };

  const handleSubmit = async () => {
    const rawAmt = parseRupiahInput(form.amount);
    const amt = parseFloat(rawAmt);
    if (!amt || amt <= 0) return;
    await addTransaction({
      type: form.type,
      amount: amt,
      category: form.category,
      description: form.description,
      date: form.date,
    });
    setShowModal(false);
    setForm({ type: 'expense', amount: '', category: 'Makanan', description: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('finance.title'), t('finance.delete_confirm') || 'Yakin hapus transaksi ini?', [
      { text: t('finance.cancel'), style: 'cancel' },
      { text: t('tasks.delete_btn') || 'Hapus', style: 'destructive', onPress: () => deleteTransaction(id) },
    ]);
  };

  const filtered = useMemo(() => 
    tab === 'all' ? transactions : transactions.filter(t => t.type === tab),
  [transactions, tab]);

  const totalIncome = useMemo(() => transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [transactions]);
  const totalExpense = useMemo(() => transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [transactions]);
  const balance = totalIncome - totalExpense;

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <View style={[styles.pageHeader, { borderBottomColor: c.border, paddingTop: layout.topPadding }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.headerIconBox, { backgroundColor: c.green + '15' }]}>
            <MaterialIcons name="account-balance-wallet" size={24} color={c.green} />
          </View>
          <View>
            <Text style={[styles.pageTitle, { color: c.textPrimary }]}>{t('finance.title')}</Text>
            <Text style={[styles.pageSubtitle, { color: c.textSecondary }]}>{t('finance.desc')}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshFinance} tintColor={c.purple} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 14, paddingBottom: layout.bottomPadding + 100 }}
      >
        {/* Balance Card */}
        <View style={[styles.balanceCard, { backgroundColor: balance >= 0 ? c.green : c.red }]}>
          <Text style={styles.balanceLabel}>{t('finance.balance')}</Text>
          <Text style={styles.balanceAmount}>{maskCurrency(balance)}</Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <MaterialIcons name="arrow-upward" size={16} color="#fff" />
              <Text style={styles.balanceItemText}>{maskCurrency(totalIncome)}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceItem}>
              <MaterialIcons name="arrow-downward" size={16} color="#fff" />
              <Text style={styles.balanceItemText}>{maskCurrency(totalExpense)}</Text>
            </View>
          </View>
        </View>

        {/* Category summary */}
        <Card style={{ padding: 20, marginBottom: 20 }}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="pie-chart" size={18} color={c.purple} />
            <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t('finance.budget_overview')}</Text>
          </View>
          {[
            { label: t('finance.total_income'), value: totalIncome, color: c.green, icon: 'arrow-upward' as const },
            { label: t('finance.total_expense'), value: totalExpense, color: c.red, icon: 'arrow-downward' as const },
            { label: t('finance.transaction_history'), value: transactions.length, color: c.purple, icon: 'receipt-long' as const, isCurrency: false },
          ].map((item, i) => (
            <View key={i} style={[styles.summaryRow, { borderBottomColor: c.border }]}>
              <View style={styles.summaryLeft}>
                <View style={[styles.summaryIcon, { backgroundColor: item.color + '22' }]}>
                  <MaterialIcons name={item.icon} size={16} color={item.color} />
                </View>
                <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>{item.label}</Text>
              </View>
              <Text style={[styles.summaryValue, { color: item.color }]}>
                {(item as any).isCurrency === false ? item.value : maskCurrency(item.value as number)}
              </Text>
            </View>
          ))}
        </Card>

        {/* Filter Tabs */}
        <View style={styles.tabRow}>
          {(['all', 'income', 'expense'] as const).map(tKey => (
            <TouchableOpacity
              key={tKey}
              style={[styles.tabBtn, tab === tKey && { backgroundColor: c.purple + '22', borderColor: c.purple }]}
              onPress={() => { setTab(tKey); setListPage(1); }}
            >
              <Text style={[styles.tabText, { color: tab === tKey ? c.purple : c.textSecondary }]}>
                {tKey === 'all' ? t('finance.all') : tKey === 'income' ? t('finance.income') : t('finance.expense')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

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
                    {tx.type === 'income' ? '+' : '-'}{maskCurrency(tx.amount)}
                  </Text>
                  <TouchableOpacity onPress={() => handleDelete(tx.id)} style={{ marginTop: 4 }}>
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
      </ScrollView>

      <FloatingActionButton onPress={() => setShowModal(true)} />

      {/* Add Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.bgSecondary, paddingBottom: Math.max(layout.insets.bottom, 20) + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{t('finance.add_transaction')}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <MaterialIcons name="close" size={24} color={c.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
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
                onPress={() => setShowCatSelect(true)}
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
                  value={new Date(form.date)}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setForm({ ...form, date: selectedDate.toISOString().split('T')[0] });
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

              <View style={styles.modalActions}>
                <Button label={t('finance.cancel')} onPress={() => setShowModal(false)} variant="secondary" style={{ flex: 1, height: 60 }} />
                <Button label={t('finance.save')} onPress={handleSubmit} variant="primary" style={{ flex: 1, height: 60 }} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Categories Modal */}
      <Modal visible={showCatModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.bgPrimary, height: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{t('finance.category')}</Text>
              <TouchableOpacity onPress={() => setShowCatModal(false)}>
                <MaterialIcons name="close" size={24} color={c.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
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
      </Modal>

      {/* Category Selection Modal (Bottom Sheet Style) */}
      <Modal visible={showCatSelect} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowCatSelect(false)} />
          <View style={[styles.modalContent, { backgroundColor: c.bgSecondary, height: '70%', borderTopLeftRadius: 36, borderTopRightRadius: 36 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{t('finance.category')}</Text>
              <TouchableOpacity onPress={() => setShowCatSelect(false)}>
                <MaterialIcons name="close" size={24} color={c.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
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
                        numberOfLines={1}
                      >
                        {translateCategory(catLabel)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                
                <TouchableOpacity
                  style={[styles.gridItem, { borderStyle: 'dashed', borderColor: c.border, borderWidth: 1.5 }]}
                  onPress={() => { setShowCatSelect(false); setShowCatModal(true); }}
                >
                  <View style={[styles.gridIcon, { backgroundColor: c.border }]}>
                    <MaterialIcons name="add" size={24} color={c.textMuted} />
                  </View>
                  <Text style={[styles.gridLabel, { color: c.textMuted }]}>Tambah</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1 },
  headerIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 28, fontWeight: '900' },
  pageSubtitle: { fontSize: 14, marginTop: 2 },
  
  balanceCard: { borderRadius: 24, padding: 24, marginBottom: 20, alignItems: 'center' },
  balanceLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  balanceAmount: { color: '#fff', fontSize: 36, fontWeight: '900', marginBottom: 20 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  balanceItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceItemText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  balanceDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.25)' },

  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontSize: 14, fontWeight: '700' },
  summaryValue: { fontSize: 15, fontWeight: '900' },

  tabRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  tabBtn: { flex: 1, height: 48, borderRadius: 16, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(150,150,150,0.05)' },
  tabText: { fontSize: 14, fontWeight: '800' },

  txCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, marginBottom: 12 },
  txIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  txCategory: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  txDesc: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  txDate: { fontSize: 11, fontWeight: '700' },
  txRight: { alignItems: 'flex-end', minWidth: 100 },
  txAmount: { fontSize: 16, fontWeight: '900' },

  pageBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
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
  gridItem: { width: (Dimensions.get('window').width - 72) / 3, alignItems: 'center', padding: 16, borderRadius: 20, gap: 10 },
  gridIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  gridLabel: { fontSize: 11, fontWeight: '800', textAlign: 'center' },

  customCatItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
});
