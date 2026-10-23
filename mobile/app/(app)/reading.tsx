import { HeaderText } from '../../components/HeaderText';
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, RefreshControl, Alert, ScrollView,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { WhenyaHeader } from '../../components/WhenyaHeader';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { MOBILE_SPACING, useMobileLayout } from '../../lib/layout';
import { formatDate } from '../../lib/helpers';
import { useLanguage } from '../../context/languageContext';
import { useRouter } from 'expo-router';

import { useReading, Book, ReadingStatus } from '../../hooks/useReading';
import { FloatingActionButton } from '../../components/FloatingActionButton';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';

const STATUS_CONFIG: Record<string, { labelKey: string; color: string; icon: string }> = {
  reading: { labelKey: 'reading.st_reading', color: '#3b82f6', icon: 'menu-book' },
  completed: { labelKey: 'reading.st_finished', color: '#10b981', icon: 'check-circle' },
  want_to_read: { labelKey: 'reading.st_want', color: '#f59e0b', icon: 'bookmark' },
  wishlist: { labelKey: 'reading.st_want', color: '#f59e0b', icon: 'bookmark' },
  paused: { labelKey: 'reading.st_paused', color: '#9ca3af', icon: 'pause-circle-filled' },
};

const EMPTY: Omit<Book, 'id' | 'createdAt'> = {
  title: '', author: '', totalPages: 0, currentPage: 0,
  status: 'want_to_read', genre: 'gen_other', rating: 0, notes: '',
  startDate: '', finishDate: '',
};

export default function ReadingScreen() {
  const { tx: translateCopy } = useLanguage();
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();
  const { t, language } = useLanguage();
  const router = useRouter();

  const {
    books, loading, xpToast,
    addBook, updateBook, deleteBook, updateProgress, refreshBooks
  } = useReading();

  const [filter, setFilter] = useState<ReadingStatus | 'all'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<Omit<Book, 'id' | 'createdAt'>>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);

  const openAdd = () => {
    setForm(EMPTY);
    setEditId(null);
    setModalVisible(true);
  };

  const openEdit = (book: Book) => {
    setForm({ ...book });
    setEditId(book.id);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      Alert.alert(t('reading.title_label') + ' ' + (language === 'id' ? translateCopy("wajib diisi") : translateCopy("is required")));
      return;
    }
    if (editId) {
      await updateBook(editId, form);
    } else {
      await addBook(form);
    }
    setModalVisible(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('reading.delete_title'), t('reading.delete_confirm'), [
      { text: t('tasks.cancel'), style: 'cancel' },
      { text: t('tasks.delete_btn'), style: 'destructive', onPress: () => deleteBook(id) },
    ]);
  };

  const filtered = useMemo(() =>
    filter === 'all' ? books : books.filter(b => b.status === filter),
  [books, filter]);

  const stats = useMemo(() => ({
    total: books.length,
    reading: books.filter(b => b.status === 'reading').length,
    completed: books.filter(b => b.status === 'completed').length,
  }), [books]);

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <WhenyaHeader
        title={t('sidebar.reading')}
        subtitle={t('reading.subtitle')}
        showBack={router.canGoBack()}
        tabs={['all', 'reading', 'want_to_read', translateCopy("completed"), 'paused'].map(f => ({
          key: f,
          label: f === 'all' ? t('reading.all_categories') : t(STATUS_CONFIG[f as ReadingStatus].labelKey),
          count: f === 'all' ? books.length : books.filter(b => b.status === f).length,
        }))}
        activeTab={filter}
        onTabChange={(tabKey) => setFilter(tabKey as any)}
      />

      {/* Stats Cards */}
      <View style={[styles.statsRow, { marginTop: 14 }]}>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#193F30' }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: c.textSecondary }]}>{t('reading.stats_collection')}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#3b82f6' }]}>{stats.reading}</Text>
          <Text style={[styles.statLabel, { color: c.textSecondary }]}>{t('reading.stats_reading')}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.completed}</Text>
          <Text style={[styles.statLabel, { color: c.textSecondary }]}>{t('reading.stats_completed')}</Text>
        </Card>
      </View>

      {/* Book List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshBooks} tintColor={c.purple} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: layout.bottomPadding + 100 }]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="menu-book" size={48} color={c.textMuted} />
            <Text style={[styles.emptyText, { color: c.textMuted }]}>{t('reading.empty_category')}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.want_to_read;
          const totalPages = Math.max(0, Number(item.totalPages) || 0);
          const rawCurrent = item.currentPage !== undefined && item.currentPage !== null ? item.currentPage : (item as any).pagesRead;
          const parsedCurrent = Number(rawCurrent);
          const currentPage = Number.isFinite(parsedCurrent) ? Math.max(0, parsedCurrent) : 0;
          const progressRatio = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;
          const progress = Number.isFinite(progressRatio) ? Math.min(100, Math.max(0, progressRatio)) : 0;
          return (
            <Card style={styles.bookCard} onPress={() => openEdit(item)}>
              <View style={[styles.bookIconBox, { backgroundColor: c.bgInput }]}>
                <MaterialIcons name={cfg.icon as any} size={24} color={cfg.color} />
              </View>

              <View style={styles.bookMainInfo}>
                <View style={styles.bookHeaderRow}>
                  <Text style={[styles.bookTitle, { color: c.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                  <TouchableOpacity onPress={() => handleDelete(item.id)}>
                    <MaterialIcons name="delete-outline" size={18} color={c.red} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.bookAuthor, { color: c.textSecondary }]} numberOfLines={1}>{item.author || t('reading.author_anon')}</Text>

                <View style={styles.bookTagRow}>
                  <Badge label={t(cfg.labelKey)} color={cfg.color} variant="solid" />
                  {item.genre && (
                    <Badge label={t(`reading.${item.genre}`)} color={c.textMuted} variant="outline" />
                  )}
                </View>

                {totalPages > 0 && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressInfo}>
                      <Text style={[styles.progressPercent, { color: c.textPrimary }]}>{Math.round(progress)}%</Text>
                      <Text style={[styles.progressPages, { color: c.textMuted }]}>{currentPage} / {totalPages} {t('reading.unit_pages')}</Text>
                    </View>
                    <View style={[styles.progressBarTrack, { backgroundColor: c.bgInput }]}>
                      <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: cfg.color }]} />
                    </View>
                    <View style={styles.quickControls}>
                      <TouchableOpacity style={[styles.quickBtn, { backgroundColor: c.bgInput }]} onPress={() => updateProgress(item.id, 1)}>
                        <Text style={[styles.quickBtnText, { color: c.textPrimary }]}>{t('reading.quick_add').replace('{count}', '1')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.quickBtn, { backgroundColor: c.bgInput }]} onPress={() => updateProgress(item.id, 10)}>
                        <Text style={[styles.quickBtnText, { color: c.textPrimary }]}>{t('reading.quick_add').replace('{count}', '10')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </Card>
          );
        }}
      />

      <FloatingActionButton onPress={openAdd} />

      {/* XP Toast */}
      {xpToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{xpToast} {t('reading.success_toast')}</Text>
        </View>
      )}

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
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
                setModalVisible(false);
              }}
            />
            <View style={[styles.modalSheet, { paddingBottom: Math.max(layout.insets.bottom, 20) + 16, backgroundColor: c.bgSecondary }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{editId ? t('reading.edit_book') : t('reading.new_book')}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color={c.textPrimary} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
              <Input
                label={t('reading.title_label')}
                value={form.title}
                onChangeText={t => setForm(f => ({ ...f, title: t }))}
                placeholder={t('reading.title_placeholder')}
              />

              <Input
                label={t('reading.author_label')}
                value={form.author}
                onChangeText={t => setForm(f => ({ ...f, author: t }))}
                placeholder={t('reading.author_placeholder')}
              />

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Input
                    label={t('reading.pages_total')}
                    value={form.totalPages ? String(form.totalPages) : ''}
                    onChangeText={t => setForm(f => ({ ...f, totalPages: parseInt(t) || 0 }))}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label={t('reading.pages_current')}
                    value={form.currentPage ? String(form.currentPage) : ''}
                    onChangeText={t => setForm(f => ({ ...f, currentPage: parseInt(t) || 0 }))}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>{t('reading.status_label')}</Text>
              <View style={styles.optionGrid}>
                {(Object.keys(STATUS_CONFIG) as ReadingStatus[]).map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.optionChip, { borderColor: c.border }, form.status === st && { backgroundColor: STATUS_CONFIG[st].color, borderColor: STATUS_CONFIG[st].color }]}
                    onPress={() => setForm(f => ({ ...f, status: st }))}
                  >
                    <Text style={[styles.optionChipText, { color: form.status === st ? '#fff' : c.textSecondary }]}>{t(STATUS_CONFIG[st].labelKey)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Button
                label={editId ? t('tasks.save') : t('reading.save_btn')}
                onPress={handleSave}
                variant="primary"
                style={{ height: 60, marginTop: 12 }}
              />
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
  pageHeader: { paddingHorizontal: 24, paddingBottom: 24, borderBottomWidth: 1 },
  backBtn: { flexShrink: 0, width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerIconBox: { flexShrink: 0, width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 28, fontWeight: '900' },
  pageSubtitle: { fontSize: 14, marginTop: 4 },

  statsRow: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginTop: 28, marginBottom: 24 },
  statCard: { flex: 1, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },

  filterContainer: { marginBottom: 16 },
  filterRow: { paddingHorizontal: 24, gap: 10, paddingVertical: 4 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: 'transparent' },
  filterChipText: { fontSize: 13, fontWeight: '700' },

  listContent: { paddingHorizontal: 24, paddingTop: 10 },
  bookCard: { padding: 18, flexDirection: 'row', gap: 16, marginBottom: 16 },
  bookIconBox: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  bookMainInfo: { flex: 1 },
  bookHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  bookTitle: { fontSize: 16, fontWeight: '900', flex: 1, marginRight: 8 },
  bookAuthor: { fontSize: 13, marginBottom: 10 },
  bookTagRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },

  progressContainer: { marginTop: 4 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  progressPercent: { fontSize: 14, fontWeight: '900' },
  progressPages: { fontSize: 11, fontWeight: '600' },
  progressBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  quickControls: { flexDirection: 'row', gap: 10, marginTop: 12 },
  quickBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  quickBtnText: { fontSize: 11, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 80, opacity: 0.5 },
  emptyText: { fontSize: 15, fontWeight: '700', marginTop: 12 },

  toast: { position: 'absolute', top: 100, alignSelf: 'center', backgroundColor: '#10b981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, zIndex: 1000 },
  toastText: { color: '#fff', fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingTop: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '900' },
  inputLabel: { fontSize: 14, fontWeight: '800', marginBottom: 8, marginTop: 16 },
  inputRow: { flexDirection: 'row', gap: 12 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4, marginBottom: 20 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  optionChipText: { fontSize: 13, fontWeight: '700' },
});
