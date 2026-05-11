import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, StyleSheet, RefreshControl, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { MOBILE_SPACING, useMobileLayout } from '../../lib/layout';
import { getToday, formatDate } from '../../lib/helpers';
import { FloatingActionButton } from '../../components/FloatingActionButton';
import { useLanguage } from '../../context/languageContext';

import { useJournal, JournalEntry } from '../../hooks/useJournal';
import { analyzeJournalEntry, processJournalAI } from '../../lib/ai';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';

const MOODS = [
  { emoji: '😄', labelKey: 'journal.mood_great', value: 'great' },
  { emoji: '🙂', labelKey: 'journal.mood_good', value: 'good' },
  { emoji: '😐', labelKey: 'journal.mood_neutral', value: 'neutral' },
  { emoji: '😔', labelKey: 'journal.mood_bad', value: 'bad' },
  { emoji: '😢', labelKey: 'journal.mood_terrible', value: 'terrible' },
];

const COMMON_TAGS = [
  { key: 'tag_productive', labelKey: 'journal.tag_productive' },
  { key: 'tag_grateful', labelKey: 'journal.tag_grateful' },
  { key: 'tag_reflection', labelKey: 'journal.tag_reflection' },
  { key: 'tag_plan', labelKey: 'journal.tag_plan' },
  { key: 'tag_story', labelKey: 'journal.tag_story' },
  { key: 'tag_motivation', labelKey: 'journal.tag_motivation' },
  { key: 'tag_family', labelKey: 'journal.tag_family' },
  { key: 'tag_work', labelKey: 'journal.tag_work' },
];

export default function JournalScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const today = getToday();
  const layout = useMobileLayout();
  const { t, language } = useLanguage();

  const { 
    entries, loading, xpToast, 
    addEntry, updateEntry, deleteEntry, refreshJournal 
  } = useJournal();

  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<JournalEntry | null>(null);
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null);
  const [form, setForm] = useState({ title: '', content: '', mood: 'good', tags: [] as string[] });
  const [search, setSearch] = useState('');
  const [aiReflection, setAiReflection] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
    setIsSaving(true);
    
    let finalMood = form.mood;
    let reflection = '';

    try {
      const aiResult = await processJournalAI(form.content);
      finalMood = aiResult.mood;
      reflection = aiResult.reflection;
    } catch (e) {
      console.warn('AI processing failed during save');
    }

    const payload = { ...form, mood: finalMood, aiReflection: reflection };

    if (editEntry) {
      await updateEntry(editEntry.id, payload);
    } else {
      await addEntry(payload);
    }
    
    setIsSaving(false);
    setShowModal(false);
  };

  const toggleTag = (tagKey: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tagKey) ? prev.tags.filter(t => t !== tagKey) : [...prev.tags, tagKey],
    }));
  };

  const filtered = useMemo(() => 
    search.trim()
      ? entries.filter(e => e.title.toLowerCase().includes(search.toLowerCase()) || e.content.toLowerCase().includes(search.toLowerCase()))
      : entries,
  [entries, search]);

  const todayEntry = useMemo(() => entries.find(e => e.date === today), [entries, today]);
  const moodEmoji = (val: string) => MOODS.find(m => m.value === val)?.emoji || '🙂';
  const moodColor = (val: string) => ({ great: c.green, good: c.cyan, neutral: c.yellow, bad: c.orange, terrible: c.red }[val] || c.purple);

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      {xpToast && (
        <View style={[styles.xpToast, { top: layout.insets.top + 12 }]}>
          <MaterialIcons name="bolt" size={16} color="#fff" />
          <Text style={[styles.xpToastText, { marginLeft: 6 }]}>{xpToast} {t('journal.success_toast')}</Text>
        </View>
      )}

      <View style={[styles.pageHeader, { borderBottomColor: c.border, paddingTop: layout.topPadding }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.headerIconBox, { backgroundColor: c.purple + '15' }]}>
            <MaterialIcons name="edit-note" size={24} color={c.purple} />
          </View>
          <View>
            <Text style={[styles.pageTitle, { color: c.textPrimary }]}>{t('sidebar.journal')}</Text>
            <Text style={[styles.pageSubtitle, { color: c.textSecondary }]}>{t('journal.subtitle').replace('{count}', entries.length.toString())}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshJournal} tintColor={c.purple} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 14, paddingBottom: layout.bottomPadding + 100 }}
      >
        {/* Mood Trend Analysis */}
        <Card style={{ padding: 18, marginBottom: 20 }}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="analytics" size={18} color={c.purple} />
            <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t('journal.analysis_title')}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 }}>
            {MOODS.map(m => {
              const count = entries.filter(e => e.mood === m.value).length;
              const pct = entries.length > 0 ? (count / entries.length) * 100 : 0;
              return (
                <View key={m.value} style={{ alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 24 }}>{m.emoji}</Text>
                  <View style={{ height: 40, width: 6, backgroundColor: moodColor(m.value) + '22', borderRadius: 3, justifyContent: 'flex-end' }}>
                    <View style={{ height: `${Math.max(pct, 5)}%`, width: '100%', backgroundColor: moodColor(m.value), borderRadius: 3 }} />
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: c.textSecondary }}>{count}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Today prompt */}
        {!todayEntry && (
          <TouchableOpacity
            style={[styles.todayPrompt, { backgroundColor: c.purple + '15', borderColor: c.purple + '44' }]}
            onPress={openAdd}
          >
            <View style={[styles.promptIconBox, { backgroundColor: c.purple }]}>
              <MaterialIcons name="edit" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.promptTitle, { color: c.purple }]}>{t('journal.today_prompt')}</Text>
              <Text style={[styles.promptSub, { color: c.textSecondary }]}>{t('journal.today_prompt_sub')}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={c.purple} />
          </TouchableOpacity>
        )}

        {/* Search */}
        <Input 
          value={search}
          onChangeText={setSearch}
          placeholder={t('journal.search_placeholder')}
          leftIcon="search"
          containerStyle={{ marginBottom: 14 }}
        />

        {/* Entries */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="edit-note" size={48} color={c.textMuted} />
            <Text style={[styles.emptyText, { color: c.textMuted }]}>{t('journal.empty_state')}</Text>
          </View>
        ) : filtered.map(entry => (
          <Card
            key={entry.id}
            style={styles.entryCard}
            onPress={() => setViewEntry(entry)}
          >
            <View style={styles.entryHeader}>
              <View style={styles.entryMeta}>
                <Text style={{ fontSize: 20 }}>{moodEmoji(entry.mood)}</Text>
                <Text style={[styles.entryDate, { color: c.textSecondary }]}>{formatDate(entry.date, language)}</Text>
              </View>
              <TouchableOpacity onPress={() => openEdit(entry)}>
                <MaterialIcons name="edit" size={16} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            {entry.title ? <Text style={[styles.entryTitle, { color: c.textPrimary }]}>{entry.title}</Text> : null}
            <Text style={[styles.entryPreview, { color: c.textSecondary }]} numberOfLines={2}>{entry.content}</Text>
            {entry.tags?.length > 0 && (
              <View style={styles.tagsRow}>
                {entry.tags.slice(0, 3).map(tagKey => (
                  <Badge key={tagKey} label={t(`journal.${tagKey}`)} color={c.purple} variant="solid" />
                ))}
              </View>
            )}
          </Card>
        ))}
      </ScrollView>

      <FloatingActionButton onPress={openAdd} />

      {/* Write/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.bgSecondary, paddingBottom: Math.max(layout.insets.bottom, 20) + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{editEntry ? t('journal.edit_journal') : t('journal.new_journal')}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <MaterialIcons name="close" size={24} color={c.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Mood */}
              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>{t('journal.mood_label')}</Text>
              <View style={styles.moodRow}>
                {MOODS.map(m => (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.moodBtn, form.mood === m.value && { backgroundColor: moodColor(m.value) + '22', borderColor: moodColor(m.value) }]}
                    onPress={() => setForm({ ...form, mood: m.value })}
                  >
                    <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
                    <Text style={[styles.moodLabel, { color: form.mood === m.value ? moodColor(m.value) : c.textMuted }]}>{t(m.labelKey)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input 
                label={t('journal.title_label')}
                value={form.title} 
                onChangeText={v => setForm({ ...form, title: v })}
                placeholder={t('journal.title_placeholder')}
              />

              <Input 
                label={t('journal.content_label')}
                value={form.content} 
                onChangeText={v => setForm({ ...form, content: v })}
                placeholder={t('journal.content_placeholder')}
                multiline
                inputStyle={{ height: 160, textAlignVertical: 'top' }}
              />

              <Text style={[styles.inputLabel, { color: c.textSecondary, marginTop: 12 }]}>{t('journal.tags_label')}</Text>
              <View style={styles.optionRow}>
                {COMMON_TAGS.map(tag => (
                  <TouchableOpacity
                    key={tag.key}
                    style={[styles.tagBtn, form.tags.includes(tag.key) && { backgroundColor: c.purple + '22', borderColor: c.purple }]}
                    onPress={() => toggleTag(tag.key)}
                  >
                    <Text style={[styles.tagBtnText, { color: form.tags.includes(tag.key) ? c.purple : c.textSecondary }]}>{t(tag.labelKey)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <Button label={t('tasks.cancel')} onPress={() => setShowModal(false)} variant="secondary" style={{ flex: 1, height: 60 }} />
                <Button 
                  label={isSaving ? 'AI Sedang Menganalisa...' : (editEntry ? t('tasks.save') : t('journal.write_btn'))} 
                  onPress={handleSubmit} 
                  variant="primary" 
                  disabled={isSaving}
                  style={{ flex: 1, height: 60 }} 
                />
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
                  <Text style={[styles.viewEntryDate, { color: c.textSecondary }]}>{formatDate(viewEntry.date, language)}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity onPress={() => openEdit(viewEntry)}>
                    <MaterialIcons name="edit" size={22} color={c.purple} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    Alert.alert(t('journal.delete_title') || 'Delete Entry', t('journal.delete_confirm') || 'Are you sure?', [
                      { text: t('tasks.cancel'), style: 'cancel' },
                      { text: t('tasks.delete_btn'), style: 'destructive', onPress: () => { deleteEntry(viewEntry.id); setViewEntry(null); } },
                    ]);
                  }}>
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
                
                {/* AI Reflection Card */}
                {(viewEntry.aiReflection || aiReflection) && (
                  <Card style={{ marginTop: 20, backgroundColor: c.purple + '08', borderColor: c.purple + '22', borderStyle: 'dashed' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <MaterialIcons name="auto-awesome" size={16} color={c.purple} />
                      <Text style={{ fontSize: 13, fontWeight: '900', color: c.purple }}>AI COACH REFLECTION</Text>
                    </View>
                    <Text style={{ fontSize: 14, color: c.textPrimary, lineHeight: 20 }}>
                      "{viewEntry.aiReflection || aiReflection}"
                    </Text>
                  </Card>
                )}

                {!viewEntry.aiReflection && !aiReflection && (
                  <Card style={{ marginTop: 20, backgroundColor: c.purple + '08', borderColor: c.purple + '22', borderStyle: 'dashed' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <MaterialIcons name="auto-awesome" size={16} color={c.purple} />
                      <Text style={{ fontSize: 13, fontWeight: '900', color: c.purple }}>AI COACH REFLECTION</Text>
                    </View>
                    {aiLoading ? (
                      <Text style={{ fontSize: 13, color: c.textSecondary, fontStyle: 'italic' }}>Thinking...</Text>
                    ) : (
                      <TouchableOpacity onPress={async () => {
                        setAiLoading(true);
                        const res = await analyzeJournalEntry(viewEntry.content);
                        setAiReflection(res);
                        setAiLoading(false);
                      }}>
                        <Text style={{ fontSize: 13, color: c.purple, fontWeight: '700' }}>Get AI Insight ✨</Text>
                      </TouchableOpacity>
                    )}
                  </Card>
                )}

                {viewEntry.tags?.length > 0 && (
                  <View style={styles.tagsRow}>
                    {viewEntry.tags.map(tagKey => (
                      <Badge key={tagKey} label={t(`journal.${tagKey}`)} color={c.purple} variant="solid" />
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
  xpToast: { position: 'absolute', right: 16, zIndex: 999, backgroundColor: '#8b5cf6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  xpToastText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  
  pageHeader: { paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1 },
  headerIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 28, fontWeight: '900' },
  pageSubtitle: { fontSize: 14, marginTop: 2 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  
  todayPrompt: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 14 },
  promptIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  promptTitle: { fontSize: 15, fontWeight: '700' },
  promptSub: { fontSize: 12, marginTop: 2 },
  
  entryCard: { padding: 14, marginBottom: 12 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  entryDate: { fontSize: 12 },
  entryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  entryPreview: { fontSize: 13, lineHeight: 18 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 15, fontWeight: '600', marginTop: 12 },
  
  moodRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  moodBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 74, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  moodLabel: { fontSize: 9, marginTop: 2, fontWeight: '600', textAlign: 'center' },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tagBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  tagBtnText: { fontSize: 12, fontWeight: '600' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 20 },
  
  viewEntryMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  viewEntryDate: { fontSize: 13 },
  viewEntryTitle: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  viewEntryContent: { fontSize: 15, lineHeight: 24, marginBottom: 16 },
});
