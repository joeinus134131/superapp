import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, RefreshControl, Alert, ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { MOBILE_SPACING, useMobileLayout } from '../../lib/layout';
import { getData, setData, STORAGE_KEYS } from '../../lib/storage';
import { generateId, formatDate } from '../../lib/helpers';
import { addXP } from '../../lib/gamification';
import { PageHeader } from '../../components/PageHeader';

type ReadingStatus = 'reading' | 'completed' | 'want_to_read' | 'paused';

interface Book {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  status: ReadingStatus;
  genre: string;
  rating: number;
  notes: string;
  startDate: string;
  finishDate: string;
  createdAt: string;
}

const GENRES = ['Fiction', 'Non-Fiction', 'Self-Help', 'Technology', 'Business', 'Science', 'History', 'Biography', 'Other'];

const STATUS_CONFIG: Record<ReadingStatus, { label: string; color: string; icon: string }> = {
  reading: { label: 'Sedang Baca', color: '#3b82f6', icon: 'menu-book' },
  completed: { label: 'Selesai', color: '#10b981', icon: 'check-circle' },
  want_to_read: { label: 'Mau Baca', color: '#f59e0b', icon: 'bookmark' },
  paused: { label: 'Ditunda', color: '#9ca3af', icon: 'pause-circle-filled' },
};

const EMPTY: Book = {
  id: '', title: '', author: '', totalPages: 0, currentPage: 0,
  status: 'want_to_read', genre: 'Other', rating: 0, notes: '',
  startDate: '', finishDate: '', createdAt: '',
};

export default function ReadingScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();
  const [books, setBooks] = useState<Book[]>([]);
  const [filter, setFilter] = useState<ReadingStatus | 'all'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<Book>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [xpToast, setXpToast] = useState('');

  const load = useCallback(async () => {
    const data = await getData(STORAGE_KEYS.READING);
    setBooks(data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const showToast = (msg: string) => {
    setXpToast(msg);
    setTimeout(() => setXpToast(''), 2500);
  };

  const openAdd = () => {
    setForm({ ...EMPTY, id: generateId(), createdAt: new Date().toISOString() });
    setEditId(null);
    setModalVisible(true);
  };

  const openEdit = (book: Book) => {
    setForm({ ...book });
    setEditId(book.id);
    setModalVisible(true);
  };

  const save = async () => {
    if (!form.title.trim()) { Alert.alert('Judul buku wajib diisi'); return; }
    const isCompleting = editId
      ? books.find(b => b.id === editId)?.status !== 'completed' && form.status === 'completed'
      : form.status === 'completed';

    const updated = editId
      ? books.map(b => b.id === editId ? { ...form } : b)
      : [...books, { ...form }];
    await setData(STORAGE_KEYS.READING, updated);
    setBooks(updated);
    setModalVisible(false);

    if (isCompleting) {
      const result = await addXP('BOOK_COMPLETE');
      showToast(`+${result.xpGained} XP! Buku selesai!`);
    }
  };

  const deleteBook = (id: string) => {
    Alert.alert('Hapus Buku', 'Yakin hapus buku ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive', onPress: async () => {
          const updated = books.filter(b => b.id !== id);
          await setData(STORAGE_KEYS.READING, updated);
          setBooks(updated);
        },
      },
    ]);
  };

  const updatePages = async (book: Book, delta: number) => {
    const newPage = Math.min(book.totalPages, Math.max(0, book.currentPage + delta));
    const wasCompleted = book.status === 'completed';
    const nowCompleted = book.totalPages > 0 && newPage >= book.totalPages;
    const updated = books.map(b =>
      b.id === book.id
        ? { ...b, currentPage: newPage, status: nowCompleted ? 'completed' : (b.status === 'want_to_read' ? 'reading' : b.status) as ReadingStatus }
        : b
    );
    await setData(STORAGE_KEYS.READING, updated);
    setBooks(updated);
    if (!wasCompleted && nowCompleted) {
      const result = await addXP('BOOK_COMPLETE');
      showToast(`+${result.xpGained} XP! Buku selesai!`);
    }
  };

  const filtered = filter === 'all' ? books : books.filter(b => b.status === filter);

  const stats = {
    total: books.length,
    reading: books.filter(b => b.status === 'reading').length,
    completed: books.filter(b => b.status === 'completed').length,
    pages: books.filter(b => b.status === 'completed').reduce((s, b) => s + b.totalPages, 0),
  };

  const s = styles(c, isDark);

  return (
    <View style={s.container}>
      <PageHeader
        title="Reading"
        subtitle="Lacak buku yang sedang, akan, dan sudah dibaca."
        textColor={c.textPrimary}
        subtextColor={c.textSecondary}
        backgroundColor={c.bgPrimary}
        actionColor={c.purple}
        onActionPress={openAdd}
      />

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { label: 'Total', value: stats.total, icon: 'library-books', color: '#8b5cf6' },
          { label: 'Dibaca', value: stats.reading, icon: 'menu-book', color: '#3b82f6' },
          { label: 'Selesai', value: stats.completed, icon: 'check-circle', color: '#10b981' },
          { label: 'Hal. Selesai', value: stats.pages, icon: 'description', color: '#f59e0b' },
        ].map(stat => (
          <View key={stat.label} style={s.statCard}>
            <MaterialIcons name={stat.icon as any} size={20} color={stat.color} />
            <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={[s.filterRow, { paddingHorizontal: MOBILE_SPACING.screen }]}>
        {(['all', 'reading', 'want_to_read', 'completed', 'paused'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterChip, filter === f && s.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[s.filterChipText, filter === f && s.filterChipTextActive]}>
              {f === 'all' ? 'Semua' : STATUS_CONFIG[f].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.purple} />}
        contentContainerStyle={[s.listContent, { paddingBottom: layout.bottomPadding }]}
        ListEmptyComponent={
          <View style={s.empty}>
            <MaterialIcons name="menu-book" size={48} color={c.textMuted} />
            <Text style={s.emptyText}>Belum ada buku. Tambah buku pertama!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status];
          const progress = item.totalPages > 0 ? item.currentPage / item.totalPages : 0;
          return (
            <TouchableOpacity style={s.bookCard} onPress={() => openEdit(item)} activeOpacity={0.8}>
              <View style={[s.bookStatus, { backgroundColor: cfg.color + '20' }]}>
                <MaterialIcons name={cfg.icon as any} size={22} color={cfg.color} />
              </View>
              <View style={s.bookInfo}>
                <Text style={s.bookTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={s.bookAuthor} numberOfLines={1}>{item.author || 'Penulis tidak diketahui'}</Text>
                <View style={s.bookMeta}>
                  <Text style={[s.bookStatusBadge, { color: cfg.color }]}>{cfg.label}</Text>
                  {item.genre ? <Text style={s.bookGenre}>{item.genre}</Text> : null}
                </View>
                {item.totalPages > 0 && (
                  <View style={s.progressWrap}>
                    <View style={s.progressBar}>
                      <View style={[s.progressFill, { width: `${progress * 100}%` as any, backgroundColor: cfg.color }]} />
                    </View>
                    <Text style={s.progressText}>{item.currentPage}/{item.totalPages} hal</Text>
                  </View>
                )}
                {item.totalPages > 0 && (
                  <View style={s.pageControls}>
                    <TouchableOpacity style={s.pageBtn} onPress={() => updatePages(item, -10)}>
                      <Text style={s.pageBtnText}>-10</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.pageBtn} onPress={() => updatePages(item, -1)}>
                      <Text style={s.pageBtnText}>-1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.pageBtn, { backgroundColor: c.purple + '20' }]} onPress={() => updatePages(item, 1)}>
                      <Text style={[s.pageBtnText, { color: c.purple }]}>+1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.pageBtn, { backgroundColor: c.purple + '20' }]} onPress={() => updatePages(item, 10)}>
                      <Text style={[s.pageBtnText, { color: c.purple }]}>+10</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <TouchableOpacity style={s.deleteBtn} onPress={() => deleteBook(item.id)}>
                <MaterialIcons name="delete-outline" size={20} color={c.textMuted} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      {/* XP Toast */}
      {xpToast ? (
        <View style={[s.toast, { bottom: layout.insets.bottom + 84 }]}>
          <Text style={s.toastText}>{xpToast}</Text>
        </View>
      ) : null}

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { paddingBottom: Math.max(layout.insets.bottom, 20) + 20 }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editId ? 'Edit Buku' : 'Tambah Buku'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={c.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.label}>Judul Buku *</Text>
              <TextInput style={s.input} value={form.title} onChangeText={t => setForm(f => ({ ...f, title: t }))} placeholder="Masukkan judul buku" placeholderTextColor={c.textMuted} />

              <Text style={s.label}>Penulis</Text>
              <TextInput style={s.input} value={form.author} onChangeText={t => setForm(f => ({ ...f, author: t }))} placeholder="Nama penulis" placeholderTextColor={c.textMuted} />

              <View style={s.row}>
                <View style={s.halfField}>
                  <Text style={s.label}>Total Halaman</Text>
                  <TextInput style={s.input} value={form.totalPages ? String(form.totalPages) : ''} onChangeText={t => setForm(f => ({ ...f, totalPages: parseInt(t) || 0 }))} placeholder="0" placeholderTextColor={c.textMuted} keyboardType="numeric" />
                </View>
                <View style={s.halfField}>
                  <Text style={s.label}>Halaman Saat Ini</Text>
                  <TextInput style={s.input} value={form.currentPage ? String(form.currentPage) : ''} onChangeText={t => setForm(f => ({ ...f, currentPage: parseInt(t) || 0 }))} placeholder="0" placeholderTextColor={c.textMuted} keyboardType="numeric" />
                </View>
              </View>

              <Text style={s.label}>Status</Text>
              <View style={s.chipRow}>
                {(Object.keys(STATUS_CONFIG) as ReadingStatus[]).map(st => (
                  <TouchableOpacity
                    key={st}
                    style={[s.chip, form.status === st && { backgroundColor: STATUS_CONFIG[st].color }]}
                    onPress={() => setForm(f => ({ ...f, status: st }))}
                  >
                    <Text style={[s.chipText, form.status === st && { color: '#fff' }]}>{STATUS_CONFIG[st].label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Genre</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={s.chipRow}>
                  {GENRES.map(g => (
                    <TouchableOpacity
                      key={g}
                      style={[s.chip, form.genre === g && { backgroundColor: c.purple }]}
                      onPress={() => setForm(f => ({ ...f, genre: g }))}
                    >
                      <Text style={[s.chipText, form.genre === g && { color: '#fff' }]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text style={s.label}>Rating (0-5)</Text>
              <View style={s.ratingRow}>
                {[1, 2, 3, 4, 5].map(r => (
                  <TouchableOpacity key={r} onPress={() => setForm(f => ({ ...f, rating: r }))}>
                    <MaterialIcons name={r <= form.rating ? 'star' : 'star-border'} size={32} color="#f59e0b" />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Catatan</Text>
              <TextInput style={[s.input, s.textarea]} value={form.notes} onChangeText={t => setForm(f => ({ ...f, notes: t }))} placeholder="Catatan atau review..." placeholderTextColor={c.textMuted} multiline numberOfLines={3} />

              <TouchableOpacity style={s.saveBtn} onPress={save}>
                <Text style={s.saveBtnText}>{editId ? 'Simpan Perubahan' : 'Tambah Buku'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = (c: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgPrimary },
  statsRow: { flexDirection: 'row', paddingHorizontal: MOBILE_SPACING.screen, gap: 8, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: c.bgCard, borderRadius: 12, padding: 10, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, color: c.textMuted, fontWeight: '600' },
  filterScroll: { marginBottom: 8 },
  filterRow: { gap: 8, paddingVertical: 4 },
  filterChip: { minHeight: 40, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border, justifyContent: 'center' },
  filterChipActive: { backgroundColor: c.purple, borderColor: c.purple },
  filterChipText: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
  filterChipTextActive: { color: '#fff' },
  listContent: { paddingHorizontal: MOBILE_SPACING.screen, paddingTop: 12, gap: 12 },
  bookCard: { backgroundColor: c.bgCard, borderRadius: 16, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderWidth: 1, borderColor: c.border },
  bookStatus: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  bookInfo: { flex: 1, gap: 4 },
  bookTitle: { fontSize: 15, fontWeight: '700', color: c.textPrimary },
  bookAuthor: { fontSize: 13, color: c.textSecondary },
  bookMeta: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  bookStatusBadge: { fontSize: 12, fontWeight: '600' },
  bookGenre: { fontSize: 11, color: c.textMuted, backgroundColor: c.bgSecondary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  progressBar: { flex: 1, height: 4, backgroundColor: c.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { fontSize: 11, color: c.textMuted, minWidth: 70 },
  pageControls: { flexDirection: 'row', gap: 6, marginTop: 6 },
  pageBtn: { minHeight: 34, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: c.bgSecondary, justifyContent: 'center' },
  pageBtnText: { fontSize: 12, fontWeight: '700', color: c.textSecondary },
  deleteBtn: { padding: 4, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: c.textMuted, textAlign: 'center' },
  toast: { position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: '#10b981', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, elevation: 8 },
  toastText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: c.bgPrimary, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: c.textPrimary },
  label: { fontSize: 13, fontWeight: '600', color: c.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: c.bgCard, borderRadius: 12, padding: 12, fontSize: 14, color: c.textPrimary, borderWidth: 1, borderColor: c.border },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border },
  chipText: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
  ratingRow: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  saveBtn: { backgroundColor: c.purple, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20, marginBottom: 8 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
