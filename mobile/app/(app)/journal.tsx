import { useOpenItem } from '../../hooks/useOpenItem';
import { useCreateAction } from '../../hooks/useCreateAction';
import { HeaderText } from '../../components/HeaderText';
import { useState, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, StyleSheet, RefreshControl, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import { WhenyaHeader } from '../../components/WhenyaHeader';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { MOBILE_SPACING, useMobileLayout } from '../../lib/layout';
import { getToday, formatDate } from '../../lib/helpers';
import { FloatingActionButton } from '../../components/FloatingActionButton';
import { useLanguage } from '../../context/languageContext';
import { useRouter } from 'expo-router';

import { useJournal, JournalEntry } from '../../hooks/useJournal';
import { analyzeJournalEntry, processJournalAI } from '../../lib/ai';
import { Card } from '../../components/ui/Card';
import { statusAlert } from '../../lib/statusAlert';
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
  const { tx: translateCopy } = useLanguage();
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const today = getToday();
  const layout = useMobileLayout();
  const { t, language } = useLanguage();
  const router = useRouter();

  const {
    entries, loading, error, rewardError, retryJournalReward, xpToast,
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
  const saveLock = useRef(false);

  const openAdd = () => {
    setEditEntry(null);
    setForm({ title: '', content: '', mood: 'good', tags: [] });
    setShowModal(true);
  };

  useCreateAction(() => openAdd());

  const openEdit = (entry: JournalEntry) => {
    setViewEntry(null);
    setEditEntry(entry);
    setForm({ title: entry.title, content: entry.content, mood: entry.mood, tags: entry.tags || [] });
    setShowModal(true);
  };

  useOpenItem(entries, entry => {
    setAiReflection(null);
    setViewEntry(entry);
  });

  const handleGenerateAiReflection = async () => {
    if (!viewEntry) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAiLoading(true);
    try {
      const res = await analyzeJournalEntry(viewEntry.content, language);
      if (res) {
        setAiReflection(res);
        await updateEntry(viewEntry.id, { aiReflection: res });
        setViewEntry(prev => prev ? { ...prev, aiReflection: res } : null);
        statusAlert.success(
          language === 'id' ? 'Refleksi AI Siap' : 'AI Reflection Ready',
          language === 'id' ? 'AI Coach telah menganalisis catatan jurnal Anda.' : 'AI Coach analyzed your journal entry.'
        );
      }
    } catch {
      statusAlert.error(
        language === 'id' ? 'Gagal Memuat Refleksi' : 'Failed to Generate Reflection',
        language === 'id' ? 'Koneksi ke AI Coach sedang sibuk. Silakan coba lagi.' : 'AI Coach is busy. Please try again.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.content.trim() || saveLock.current) return;
    saveLock.current = true; setIsSaving(true);
    try {
      let mood = form.mood, reflection = '';
      let timer: ReturnType<typeof setTimeout>;
      try {
        const ai = await Promise.race([processJournalAI(form.content, language), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('AI timeout')), 10000); })]);
        if (ai.available !== false) mood = ai.mood; reflection = ai.reflection;
      } catch { /* Journal can be saved even when optional AI is unavailable. */ }
      finally { clearTimeout(timer); }
      const payload = { ...form, mood, aiReflection: reflection };
      if (editEntry) await updateEntry(editEntry.id, payload);
      else await addEntry(payload);
      setShowModal(false);
      statusAlert.success(
        language === 'id' ? 'Jurnal Tersimpan' : 'Journal Saved',
        language === 'id' ? 'Refleksi harian Anda berhasil disimpan.' : 'Your daily reflection was safely saved.'
      );
    } catch {
      statusAlert.error(
        language === 'id' ? 'Jurnal Belum Tersimpan' : 'Journal was not saved',
        language === 'id' ? 'Input tetap ada. Silakan coba simpan lagi.' : 'Your input is preserved. Please retry saving.'
      );
      Alert.alert(
        language === 'id' ? 'Jurnal belum tersimpan' : 'Journal was not saved',
        language === 'id' ? 'Input tetap ada. Silakan coba simpan lagi.' : 'Your input is preserved. Please retry saving.'
      );
    } finally { saveLock.current = false; setIsSaving(false); }
  };

  const toggleTag = (tagKey: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tagKey) ? prev.tags.filter(t => t !== tagKey) : [...prev.tags, tagKey],
    }));
  };

  const filtered = useMemo(() =>
    search.trim()
      ? entries.filter(e => String(e.title || '').toLowerCase().includes(search.toLowerCase()) || String(e.content || '').toLowerCase().includes(search.toLowerCase()))
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

      <WhenyaHeader
        title={t('sidebar.journal')}
        subtitle={t('journal.subtitle').replace('{count}', entries.length.toString())}
        showBack={router.canGoBack()}
      />

      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshJournal} tintColor={c.purple} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 14, paddingBottom: layout.bottomPadding + 100 }}
      >
        {error && <TouchableOpacity accessibilityRole="button" onPress={refreshJournal} style={{ minHeight: 48, padding: 16 }}><Text style={{ color: c.textPrimary }}>{language === 'id' ? 'Jurnal gagal dimuat. Ketuk untuk coba lagi.' : 'Journal could not load. Tap to retry.'}</Text></TouchableOpacity>}
        {rewardError && <TouchableOpacity accessibilityRole="button" onPress={() => retryJournalReward(rewardError)} style={{ minHeight: 48, padding: 16 }}><Text style={{ color: c.textPrimary }}>{language === 'id' ? 'Jurnal tersimpan. XP belum tersimpan; ketuk untuk coba lagi.' : 'Journal saved. XP could not save; tap to retry.'}</Text></TouchableOpacity>}
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
                    <View style={{ height: `${Math.max(pct, 0)}%`, width: '100%', backgroundColor: moodColor(m.value), borderRadius: 3 }} />
                  </View>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: c.textSecondary }}>{count}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Today prompt */}
        {!todayEntry ? (
          <TouchableOpacity
            style={[styles.todayPrompt, { backgroundColor: c.purple + '15', borderColor: c.purple + '44' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              openAdd();
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('journal.today_prompt')}
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
        ) : (
          <TouchableOpacity
            style={[styles.todayPrompt, { backgroundColor: '#10B98115', borderColor: '#10B98144' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setViewEntry(todayEntry);
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={translateCopy("Lihat refleksi hari ini")}
          >
            <View style={[styles.promptIconBox, { backgroundColor: '#10B981' }]}>
              <MaterialIcons name="check" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.promptTitle, { color: '#10B981' }]}>{translateCopy("Refleksi Hari Ini Selesai")}</Text>
              <Text style={[styles.promptSub, { color: c.textSecondary }]}>{translateCopy("Ketuk untuk membaca atau tekan (+) untuk catatan baru.")}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#10B981" />
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
                <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{editEntry ? t('journal.edit_journal') : t('journal.new_journal')}</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <MaterialIcons name="close" size={24} color={c.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
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
                  label={isSaving ? (language === 'id' ? 'Menyimpan…' : 'Saving…') : (editEntry ? t('tasks.save') : t('journal.write_btn'))}
                  onPress={handleSubmit}
                  variant="primary"
                  disabled={isSaving}
                  style={{ flex: 1, height: 60 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* View Entry Modal */}
      {viewEntry && (
        <Modal visible={!!viewEntry} animationType="slide" transparent onRequestClose={() => setViewEntry(null)}>
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
                    Alert.alert(t('journal.delete_title') || translateCopy("Delete Entry"), t('journal.delete_confirm') || translateCopy("Are you sure?"), [
                      { text: t('tasks.cancel'), style: 'cancel' },
                      {
                        text: t('tasks.delete_btn'),
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await deleteEntry(viewEntry.id);
                            setViewEntry(null);
                            statusAlert.info(
                              language === 'id' ? 'Jurnal Dihapus' : 'Journal Deleted',
                              language === 'id' ? 'Entri jurnal telah dihapus.' : 'Journal entry removed.'
                            );
                          } catch {
                            statusAlert.error(
                              language === 'id' ? 'Jurnal Belum Terhapus' : 'Failed to Delete',
                              language === 'id' ? 'Silakan coba lagi.' : 'Please retry.'
                            );
                          }
                        }
                      },
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
                {(viewEntry.aiReflection || aiReflection) ? (
                  <View
                    style={[
                      styles.aiCard,
                      {
                        backgroundColor: isDark ? 'rgba(139, 92, 246, 0.12)' : '#F6F3FF',
                        borderColor: isDark ? 'rgba(139, 92, 246, 0.32)' : '#E4D9FC',
                      },
                    ]}
                  >
                    <View style={styles.aiCardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.aiIconBadge, { backgroundColor: isDark ? '#6D28D9' : '#8B5CF6' }]}>
                          <MaterialIcons name="auto-awesome" size={14} color="#FFFFFF" />
                        </View>
                        <Text style={[styles.aiCardTitle, { color: isDark ? '#DDD6FE' : '#6D28D9' }]}>
                          {translateCopy("REFLEKSI AI COACH")}
                        </Text>
                      </View>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={translateCopy("Perbarui refleksi")}
                        onPress={handleGenerateAiReflection}
                        disabled={aiLoading}
                        style={[
                          styles.aiRefreshBtn,
                          { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(109, 40, 217, 0.08)' },
                        ]}
                      >
                        {aiLoading ? (
                          <ActivityIndicator size="small" color={isDark ? '#DDD6FE' : '#6D28D9'} />
                        ) : (
                          <MaterialIcons name="refresh" size={17} color={isDark ? '#DDD6FE' : '#6D28D9'} />
                        )}
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.aiQuoteContainer, { borderLeftColor: isDark ? '#8B5CF6' : '#7C3AED' }]}>
                      <Text style={[styles.aiQuoteText, { color: c.textPrimary }]}>
                        "{viewEntry.aiReflection || aiReflection}"
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.aiCard,
                      {
                        backgroundColor: isDark ? 'rgba(139, 92, 246, 0.07)' : '#F9F7FD',
                        borderColor: isDark ? 'rgba(139, 92, 246, 0.22)' : '#EAE3FA',
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <View style={[styles.aiIconBadge, { backgroundColor: isDark ? '#6D28D9' : '#8B5CF6' }]}>
                        <MaterialIcons name="auto-awesome" size={14} color="#FFFFFF" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.aiCardTitle, { color: isDark ? '#DDD6FE' : '#6D28D9' }]}>
                          {translateCopy("REFLEKSI AI COACH")}
                        </Text>
                        <Text style={{ fontSize: 12, color: c.textSecondary, marginTop: 2 }}>
                          {translateCopy("Dapatkan sudut pandang bijak dari tulisan jurnal ini")}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.aiBtn,
                        {
                          backgroundColor: isDark ? '#6D28D9' : '#7C3AED',
                          opacity: aiLoading ? 0.7 : 1,
                        },
                      ]}
                      onPress={handleGenerateAiReflection}
                      disabled={aiLoading}
                      accessibilityRole="button"
                      accessibilityLabel={translateCopy("Minta Refleksi AI Coach")}
                    >
                      {aiLoading ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text style={styles.aiBtnText}>{translateCopy("Sedang berpikir...")}</Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <MaterialIcons name="auto-awesome" size={16} color="#FFFFFF" />
                          <Text style={styles.aiBtnText}>{translateCopy("Dapatkan Insight AI")}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
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
  xpToast: { position: 'absolute', right: 16, zIndex: 999, backgroundColor: '#52745a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  xpToastText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  pageHeader: { paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1 },
  backBtn: { flexShrink: 0, width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerIconBox: { flexShrink: 0, width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
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

  aiCard: {
    marginTop: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  aiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  aiIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiCardTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  aiRefreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiQuoteContainer: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 4,
  },
  aiQuoteText: {
    fontSize: 14.5,
    lineHeight: 22,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  aiBtn: {
    minHeight: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
  },
  aiBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
