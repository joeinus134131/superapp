import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, StyleSheet, RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { MOBILE_SPACING, useMobileLayout } from '../../lib/layout';
import { getData, setData, STORAGE_KEYS } from '../../lib/storage';
import { generateId, getToday, formatDate } from '../../lib/helpers';
import { addXP } from '../../lib/gamification';
import { PageHeader } from '../../components/PageHeader';

interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: string;
  tags: string[];
  createdAt: string;
}

const MOODS = [
  { emoji: '😄', label: 'Sangat Baik', value: 'great' },
  { emoji: '🙂', label: 'Baik', value: 'good' },
  { emoji: '😐', label: 'Biasa', value: 'neutral' },
  { emoji: '😔', label: 'Kurang Baik', value: 'bad' },
  { emoji: '😢', label: 'Buruk', value: 'terrible' },
];

const COMMON_TAGS = ['Produktif', 'Bersyukur', 'Refleksi', 'Rencana', 'Cerita', 'Motivasi', 'Keluarga', 'Pekerjaan'];

export default function JournalScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const today = getToday();
  const layout = useMobileLayout();

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<JournalEntry | null>(null);
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [xpToast, setXpToast] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', content: '', mood: 'good', tags: [] as string[] });
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const saved = await getData(STORAGE_KEYS.JOURNAL);
    if (saved && Array.isArray(saved)) setEntries(saved);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (data: JournalEntry[]) => {
    setEntries(data);
    await setData(STORAGE_KEYS.JOURNAL, data);
  };

  const openAdd = () => {
    setEditEntry(null);
    setForm({ title: '', content: '', mood: 'good', tags: [] });
    setShowModal(true);
  };

  const openEdit = (entry: JournalEntry) => {
    setViewEntry(null);
    setEditEntry(entry);
    setForm({ title: entry.title, content: entry.content, mood: entry.mood, tags: entry.tags || [] });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.content.trim()) return;
    const isNew = !editEntry;
    if (editEntry) {
      await save(entries.map(e => e.id === editEntry.id ? { ...e, ...form } : e));
    } else {
      const entry: JournalEntry = {
        id: generateId(), date: today, ...form,
        createdAt: new Date().toISOString(),
      };
      await save([entry, ...entries]);
      const result = await addXP('JOURNAL_ENTRY');
      setXpToast(`+${result.xpGained} XP ✍️ Jurnal ditulis!`);
      setTimeout(() => setXpToast(null), 2500);
    }
    setShowModal(false);
  };

  const deleteEntry = async (id: string) => {
    await save(entries.filter(e => e.id !== id));
    setViewEntry(null);
  };

  const toggleTag = (tag: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag],
    }));
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = search.trim()
    ? entries.filter(e => e.title.toLowerCase().includes(search.toLowerCase()) || e.content.toLowerCase().includes(search.toLowerCase()))
    : entries;

  const todayEntry = entries.find(e => e.date === today);
  const moodEmoji = (val: string) => MOODS.find(m => m.value === val)?.emoji || '🙂';
  const moodColor = (val: string) => ({ great: c.green, good: c.cyan, neutral: c.yellow, bad: c.orange, terrible: c.red }[val] || c.purple);

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      {xpToast && <View style={[styles.xpToast, { top: layout.insets.top + 12 }]}><Text style={styles.xpToastText}>⚡ {xpToast}</Text></View>}

      <PageHeader
        title="Jurnal"
        subtitle={`${entries.length} entri tersimpan`}
        textColor={c.textPrimary}
        subtextColor={c.textSecondary}
        borderColor={c.border}
        backgroundColor={c.bgPrimary}
        actionColor={c.purple}
        onActionPress={openAdd}
      />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.purple} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: MOBILE_SPACING.screen, paddingTop: 14, paddingBottom: layout.bottomPadding }}
      >
        {/* Today prompt */}
        {!todayEntry && (
          <TouchableOpacity
            style={[styles.todayPrompt, { backgroundColor: c.purple + '15', borderColor: c.purple + '44' }]}
            onPress={openAdd}
          >
            <Text style={{ fontSize: 24 }}>✍️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.promptTitle, { color: c.purple }]}>Tulis jurnal hari ini</Text>
              <Text style={[styles.promptSub, { color: c.textSecondary }]}>Bagaimana harimu? Catat momen & refleksimu.</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={c.purple} />
          </TouchableOpacity>
        )}

        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          <MaterialIcons name="search" size={18} color={c.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: c.textPrimary }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Cari jurnal..."
            placeholderTextColor={c.textMuted}
          />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><MaterialIcons name="close" size={16} color={c.textMuted} /></TouchableOpacity> : null}
        </View>

        {/* Entries */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="edit-note" size={48} color={c.textMuted} />
            <Text style={[styles.emptyText, { color: c.textMuted }]}>Belum ada jurnal</Text>
          </View>
        ) : filtered.map(entry => (
          <TouchableOpacity
            key={entry.id}
            style={[styles.entryCard, { backgroundColor: c.bgCard, borderColor: c.border }]}
            onPress={() => setViewEntry(entry)}
            activeOpacity={0.7}
          >
            <View style={styles.entryHeader}>
              <View style={styles.entryMeta}>
                <Text style={{ fontSize: 20 }}>{moodEmoji(entry.mood)}</Text>
                <Text style={[styles.entryDate, { color: c.textSecondary }]}>{formatDate(entry.date)}</Text>
              </View>
              <TouchableOpacity onPress={() => openEdit(entry)}>
                <MaterialIcons name="edit" size={16} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            {entry.title ? <Text style={[styles.entryTitle, { color: c.textPrimary }]}>{entry.title}</Text> : null}
            <Text style={[styles.entryPreview, { color: c.textSecondary }]} numberOfLines={2}>{entry.content}</Text>
            {entry.tags?.length > 0 && (
              <View style={styles.tagsRow}>
                {entry.tags.slice(0, 3).map(tag => (
                  <View key={tag} style={[styles.tag, { backgroundColor: c.purple + '22' }]}>
                    <Text style={[styles.tagText, { color: c.purple }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Write/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.bgSecondary, paddingBottom: Math.max(layout.insets.bottom, 20) + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{editEntry ? 'Edit Jurnal' : 'Jurnal Baru'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <MaterialIcons name="close" size={24} color={c.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Mood */}
              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Mood Hari Ini</Text>
              <View style={styles.moodRow}>
                {MOODS.map(m => (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.moodBtn, form.mood === m.value && { backgroundColor: moodColor(m.value) + '22', borderColor: moodColor(m.value) }]}
                    onPress={() => setForm({ ...form, mood: m.value })}
                  >
                    <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
                    <Text style={[styles.moodLabel, { color: form.mood === m.value ? moodColor(m.value) : c.textMuted }]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Judul (opsional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                value={form.title} onChangeText={v => setForm({ ...form, title: v })}
                placeholder="Judul entri..." placeholderTextColor={c.textMuted}
              />

              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Isi Jurnal</Text>
              <TextInput
                style={[styles.input, styles.journalInput, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                value={form.content} onChangeText={v => setForm({ ...form, content: v })}
                placeholder="Tulis ceritamu di sini..."
                placeholderTextColor={c.textMuted}
                multiline numberOfLines={8}
                textAlignVertical="top"
              />

              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Tags</Text>
              <View style={styles.optionRow}>
                {COMMON_TAGS.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tagBtn, form.tags.includes(tag) && { backgroundColor: c.purple + '22', borderColor: c.purple }]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text style={[styles.tagBtnText, { color: form.tags.includes(tag) ? c.purple : c.textSecondary }]}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: c.border }]} onPress={() => setShowModal(false)}>
                  <Text style={{ color: c.textSecondary, fontWeight: '600' }}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: c.purple }]} onPress={handleSubmit}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{editEntry ? 'Simpan' : 'Tulis'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* View Entry Modal */}
      {viewEntry && (
        <Modal visible={!!viewEntry} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: c.bgSecondary, maxHeight: '90%', paddingBottom: Math.max(layout.insets.bottom, 20) + 20 }]}>
              <View style={styles.modalHeader}>
                <View style={styles.viewEntryMeta}>
                  <Text style={{ fontSize: 24 }}>{moodEmoji(viewEntry.mood)}</Text>
                  <Text style={[styles.viewEntryDate, { color: c.textSecondary }]}>{formatDate(viewEntry.date)}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity onPress={() => openEdit(viewEntry)}>
                    <MaterialIcons name="edit" size={22} color={c.purple} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteEntry(viewEntry.id)}>
                    <MaterialIcons name="delete-outline" size={22} color={c.red} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setViewEntry(null)}>
                    <MaterialIcons name="close" size={22} color={c.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {viewEntry.title ? <Text style={[styles.viewEntryTitle, { color: c.textPrimary }]}>{viewEntry.title}</Text> : null}
                <Text style={[styles.viewEntryContent, { color: c.textPrimary }]}>{viewEntry.content}</Text>
                {viewEntry.tags?.length > 0 && (
                  <View style={styles.tagsRow}>
                    {viewEntry.tags.map(tag => (
                      <View key={tag} style={[styles.tag, { backgroundColor: c.purple + '22' }]}>
                        <Text style={[styles.tagText, { color: c.purple }]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  xpToast: { position: 'absolute', top: 70, right: 16, zIndex: 999, backgroundColor: '#8b5cf6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  xpToastText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  todayPrompt: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 14 },
  promptTitle: { fontSize: 15, fontWeight: '700' },
  promptSub: { fontSize: 12, marginTop: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, marginBottom: 14, minHeight: 48 },
  searchInput: { flex: 1, fontSize: 14 },
  entryCard: { borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entryDate: { fontSize: 12 },
  entryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  entryPreview: { fontSize: 13, lineHeight: 18 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 11, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 15, fontWeight: '600', marginTop: 12 },
  moodRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  moodBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 74, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  moodLabel: { fontSize: 9, marginTop: 2, fontWeight: '600', textAlign: 'center' },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 12, padding: 12, fontSize: 15, borderWidth: 1 },
  journalInput: { minHeight: 160, textAlignVertical: 'top' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  tagBtnText: { fontSize: 12, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 20 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  submitBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  viewEntryMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  viewEntryDate: { fontSize: 13 },
  viewEntryTitle: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  viewEntryContent: { fontSize: 15, lineHeight: 24, marginBottom: 16 },
});
