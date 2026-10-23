import { useOpenItem } from '../../hooks/useOpenItem';
import { useCreateAction } from '../../hooks/useCreateAction';
import { HeaderText } from '../../components/HeaderText';
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, StyleSheet, RefreshControl, Alert, SectionList, FlatList,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { WhenyaHeader } from '../../components/WhenyaHeader';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { useMobileLayout } from '../../lib/layout';
import { getToday, formatDate, PRIORITY_COLORS, CATEGORIES } from '../../lib/helpers';
import { useLanguage } from '../../context/languageContext';
import * as Haptics from 'expo-haptics';
import { useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { getData, setData } from '../../lib/storage';
import { useTasks, Task } from '../../hooks/useTasks';
import { LevelUpModal } from '../../components/LevelUpModal';
import { FloatingActionButton } from '../../components/FloatingActionButton';
import { Card } from '../../components/ui/Card';
import { statusAlert } from '../../lib/statusAlert';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';

const getCategoryLabel = (category: string | undefined, t: any) => {
  if (!category) return t('tasks.cat_other') || 'Lainnya';
  const clean = String(category).trim().replace(/^cat_/, '');
  const key = `cat_${clean.toLowerCase()}`;
  const translated = t(`tasks.${key}`);
  if (translated && !translated.startsWith('cat_') && translated !== key) {
    return translated;
  }
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : (t('tasks.cat_other') || 'Lainnya');
};

const TaskCard = React.memo(({ task, onEdit, onToggle, onFocus, c, t, language, isSmall }: { task: Task, onFocus: (task: Task) => void, onEdit: (t: Task) => void, onToggle: (id: string, s: string) => void, c: any, t: any, language: string, isSmall?: boolean }) => {
  return (
    <Card
      style={styles.taskCard}
      onPress={() => onEdit(task)}
    >
      <View style={[styles.priorityTag, { backgroundColor: PRIORITY_COLORS[task.priority] }]} />
      <View style={styles.taskContent}>
        <View style={styles.taskHeader}>
          <Text style={[isSmall ? styles.taskTitleSmall : styles.taskTitle, { color: c.textPrimary }, task.status === 'done' && { textDecorationLine: 'line-through', opacity: 0.5 }]} numberOfLines={1}>
            {task.title}
          </Text>
          <TouchableOpacity onPress={() => onToggle(task.id, task.status === 'done' ? 'todo' : 'done')}>
            <MaterialIcons
              name={task.status === 'done' ? 'check-circle' : 'radio-button-unchecked'}
              size={24}
              color={task.status === 'done' ? c.green : c.textMuted}
            />
          </TouchableOpacity>
        </View>
        {task.description ? (
          <Text style={[isSmall ? styles.taskDescSmall : styles.taskDesc, { color: c.textSecondary }]} numberOfLines={1}>{task.description}</Text>
        ) : null}
        {task.status !== 'done' && <TouchableOpacity accessibilityRole="button" onPress={() => onFocus(task)} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: c.textPrimary, fontWeight: '700' }}>{language === 'id' ? 'Fokus pada tugas ini' : 'Focus on this task'}</Text></TouchableOpacity>}
        <View style={styles.taskFooter}>
          <Badge label={getCategoryLabel(task.category, t)} />
          {task.deadline ? (
            <View style={styles.deadline}>
              <MaterialIcons name="event" size={14} color={c.textMuted} />
              <Text style={[styles.deadlineText, { color: c.textMuted }]}>{formatDate(task.deadline, language)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Card>
  );
});

export default function TasksScreen() {
  const { tx: translateCopy } = useLanguage();
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const { width } = useWindowDimensions();
  const isSmall = width < 380;
  const layout = useMobileLayout();
  const { t, language } = useLanguage();
  const router = useRouter();
  const { goalId, goalTitle, nextStep } = useLocalSearchParams<{ goalId?: string; goalTitle?: string; nextStep?: string }>();

  const {
    tasks, loading, xpToast, setXpToast, levelUpData, setLevelUpData,
    addTask, updateTask, deleteTask, moveTask, refreshTasks
  } = useTasks();

  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPriorityLegend, setShowPriorityLegend] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const modeTouched = useRef(false);
  useEffect(() => {
    let active = true;
    getData('superapp_task_view_mode').then(mode => {
      if (active && !modeTouched.current && (mode === 'list' || mode === 'kanban')) setViewMode(mode);
    });
    return () => { active = false; };
  }, []);
  const selectViewMode = (mode: 'list' | 'kanban') => {
    modeTouched.current = true;
    setViewMode(mode);
    void setData('superapp_task_view_mode', mode);
  };

  const [form, setForm] = useState<Omit<Task, 'id' | 'createdAt'>>({
    title: '', description: '', priority: 'P3', category: 'personal', deadline: '', status: 'todo'
  });

  const openAdd = useCallback(() => {
    setEditTask(null);
    setForm({ title: nextStep || '', description: '', priority: 'P3', category: 'personal', deadline: getToday(), status: 'todo', ...(goalId ? { goalId, goalTitle } : {}) });
    setShowModal(true);
  }, [goalId, goalTitle, nextStep]);

  useCreateAction(() => openAdd());

  const openEdit = useCallback((task: Task) => {
    setEditTask(task);
    setForm({ ...task });
    setShowModal(true);
  }, []);

  useOpenItem(tasks, entry => openEdit(entry));

  const handleSubmit = async () => {
    if (!form.title.trim() || saving) return;
    setSaving(true);
    try {
      if (editTask) {
        await updateTask(editTask.id, form);
        statusAlert.success(
          language === 'id' ? 'Tugas Diperbarui' : 'Task Updated',
          form.title
        );
      } else {
        await addTask(form);
        statusAlert.success(
          language === 'id' ? 'Tugas Berhasil Disimpan' : 'Task Created Successfully',
          form.title
        );
      }
      setShowModal(false);
    } catch {
      statusAlert.error(
        language === 'id' ? 'Gagal menyimpan tugas' : 'Could not save task',
        language === 'id' ? 'Input tetap tersimpan di form. Silakan coba lagi.' : 'Your input is still in the form. Please retry.'
      );
      Alert.alert(
        language === 'id' ? 'Gagal menyimpan tugas' : 'Could not save task',
        language === 'id' ? 'Input tetap tersimpan di form. Silakan coba lagi.' : 'Your input is still in the form. Please retry.'
      );
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(t('tasks.delete_title'), t('tasks.delete_confirm'), [
      { text: t('tasks.cancel'), style: 'cancel' },
      {
        text: t('tasks.delete_btn'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask(id);
            statusAlert.info(
              language === 'id' ? 'Tugas Dihapus' : 'Task Deleted',
              language === 'id' ? 'Tugas telah dihapus dari daftar.' : 'Task removed from list.'
            );
          } catch {
            statusAlert.error(
              language === 'id' ? 'Gagal Menghapus' : 'Failed to delete'
            );
          }
        }
      },
    ]);
  };

  const statuses = ['todo', 'in_progress', 'done'];
  const priorities = ['P1', 'P2', 'P3', 'P4'];

  const sectionListRef = useRef<SectionList<any>>(null);
  const kanbanScrollRef = useRef<ScrollView>(null);
  const isProgrammaticScroll = useRef(false);

  const scopedTasks = useMemo(() => goalId ? tasks.filter(task => task.goalId === goalId) : tasks, [tasks, goalId]);
  const sections = useMemo(() => {
    return statuses.map(s => ({
      title: s,
      data: scopedTasks.filter(t => t.status === s)
    }));
  }, [scopedTasks]);

  const toggleWithFeedback = useCallback(async (id: string, status: string) => {
    try {
      await moveTask(id, status);
      if (status === 'done') {
        statusAlert.success(
          language === 'id' ? 'Tugas Selesai' : 'Task Completed',
          language === 'id' ? 'Kerja bagus, satu langkah maju hari ini!' : 'Great job, progress achieved!'
        );
      }
    } catch {
      statusAlert.error(
        language === 'id' ? 'Gagal menyimpan. Coba lagi.' : 'Could not save. Please retry.'
      );
    }
  }, [moveTask, language]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (isProgrammaticScroll.current) return;
    if (viewableItems && viewableItems.length > 0) {
      const first = viewableItems[0];
      const itemStatus = first.section?.title || first.item?.status;
      if (itemStatus && statuses.includes(itemStatus) && itemStatus !== filter) {
        setFilter(itemStatus);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 30,
  }).current;

  const handleTabChange = (tabKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilter(tabKey);
    isProgrammaticScroll.current = true;
    setTimeout(() => { isProgrammaticScroll.current = false; }, 600);

    if (viewMode === 'list') {
      if (tabKey === 'all') {
        try {
          sectionListRef.current?.scrollToLocation({
            sectionIndex: 0,
            itemIndex: 0,
            viewOffset: 0,
            animated: true,
          });
        } catch (e) {}
      } else {
        const targetIndex = statuses.indexOf(tabKey);
        if (targetIndex >= 0) {
          try {
            sectionListRef.current?.scrollToLocation({
              sectionIndex: targetIndex,
              itemIndex: 0,
              viewOffset: 12,
              animated: true,
            });
          } catch (e) {}
        }
      }
    } else {
      const colWidth = width - 44;
      const targetIndex = statuses.indexOf(tabKey);
      if (targetIndex >= 0) {
        kanbanScrollRef.current?.scrollTo({ x: targetIndex * colWidth, animated: true });
      } else if (tabKey === 'all') {
        kanbanScrollRef.current?.scrollTo({ x: 0, animated: true });
      }
    }
  };

  const renderTask = useCallback(({ item }: { item: Task }) => (
    <TaskCard
      task={item}
      onEdit={openEdit}
      onFocus={task => router.push({ pathname: "/(app)/pomodoro", params: { taskId: task.id } } as any)}
      onToggle={toggleWithFeedback}
      c={c}
      t={t}
      language={language}
      isSmall={isSmall}
    />
  ), [openEdit, toggleWithFeedback, c, t, language, isSmall, router]);

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <WhenyaHeader
        title={t('sidebar.tasks')}
        subtitle={t('tasks.subtitle')}
        showBack={router.canGoBack()}
        rightSlot={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {(['list', 'kanban'] as const).map(mode => (
              <TouchableOpacity
                key={mode}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: viewMode === mode ? (isDark ? '#3D6850' : '#193F30') : (isDark ? 'rgba(255,255,255,0.08)' : '#ECEFE6'),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  selectViewMode(mode);
                }}
                accessibilityRole="button"
                accessibilityLabel={mode === 'list' ? translateCopy("Tampilan List") : translateCopy("Tampilan Kanban")}
              >
                <MaterialIcons
                  name={mode === 'list' ? 'view-list' : 'dashboard'}
                  size={17}
                  color={viewMode === mode ? '#fff' : c.textPrimary}
                />
              </TouchableOpacity>
            ))}
          </View>
        }
        tabs={['all', ...statuses].map(s => ({
          key: s,
          label: s === 'all' ? t('tasks.all_categories') : t(`tasks.status_${s}`),
          count: s === 'all' ? tasks.length : tasks.filter(t => t.status === s).length,
        }))}
        activeTab={filter}
        onTabChange={handleTabChange}
      />

      {goalId && <View style={{ paddingHorizontal: layout.screenPadding, paddingVertical: 12, backgroundColor: c.bgCard }}><Text style={{ color: c.textPrimary, fontWeight: '700', fontSize: 16 }}>{language === 'id' ? 'Tugas untuk tujuan' : 'Tasks for goal'}: {goalTitle}</Text><TouchableOpacity accessibilityRole="button" onPress={() => router.setParams({ goalId: undefined, goalTitle: undefined, nextStep: undefined })} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: c.textPrimary }}>{language === 'id' ? 'Tampilkan semua tugas' : 'Show all tasks'}</Text></TouchableOpacity></View>}
      {viewMode === 'list' ? (
        <SectionList
          ref={sectionListRef}
          sections={sections}
          keyExtractor={item => item.id}
          renderItem={renderTask}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onScrollToIndexFailed={() => {}}
          onScroll={(e) => {
            if (isProgrammaticScroll.current) return;
            if (e.nativeEvent.contentOffset.y <= 10 && filter !== 'all') {
              setFilter('all');
            }
          }}
          scrollEventThrottle={16}
          renderSectionHeader={({ section: { title, data } }) => (
            <View style={styles.sectionHeader}>
              <View style={[styles.statusIndicator, { backgroundColor: title === 'done' ? c.green : (title === 'in_progress' ? c.blue : c.purple) }]} />
              <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
                {(t(`tasks.status_${title}`) || title).toUpperCase()} ({data.length})
              </Text>
              <View style={[styles.sectionDivider, { backgroundColor: c.border }]} />
            </View>
          )}
          renderSectionFooter={({ section }) => (
            section.data.length === 0 ? (
              <View style={{ paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' }}>
                <Text style={{ color: c.textMuted, fontSize: 13, fontStyle: 'italic' }}>
                  {t(`tasks.empty_${section.title}`) || (language === 'id' ? 'Belum ada tugas di status ini' : 'No tasks in this status')}
                </Text>
              </View>
            ) : null
          )}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: layout.bottomPadding + 100 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshTasks} tintColor={c.purple} />}
          ListEmptyComponent={
            scopedTasks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <MaterialIcons name="assignment-late" size={48} color={c.textMuted} />
                </View>
                <Text style={[styles.emptyText, { color: c.textMuted }]}>{t('tasks.empty_all')}</Text>
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: c.purple + '15' }]}
                  onPress={openAdd}
                >
                  <Text style={{ color: c.purple, fontWeight: '800' }}>{translateCopy("Buat Tugas Baru")}</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      ) : (
        <ScrollView
          ref={kanbanScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: layout.bottomPadding + 100 }}
          snapToInterval={width - 44}
          decelerationRate="fast"
          onMomentumScrollEnd={(e) => {
            if (isProgrammaticScroll.current) return;
            const offsetX = e.nativeEvent.contentOffset.x;
            const colWidth = width - 44;
            const index = Math.max(0, Math.min(statuses.length - 1, Math.round(offsetX / colWidth)));
            const activeStatus = statuses[index];
            if (activeStatus && activeStatus !== filter) {
              setFilter(activeStatus);
            }
          }}
        >
          {statuses.map(s => {
            const columnTasks = scopedTasks.filter(t => t.status === s);
            return (
              <View key={s} style={[styles.kanbanColumn, { width: width - 64 }]}>
                <View style={styles.columnHeader}>
                  <Text style={[styles.columnTitle, { color: c.textPrimary }]}>{t(`tasks.status_${s}`)}</Text>
                  <View style={[styles.countBadge, { backgroundColor: c.purple + '15' }]}>
                    <Text style={[styles.countText, { color: c.purple }]}>{columnTasks.length}</Text>
                  </View>
                </View>
                <FlatList
                  refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshTasks} tintColor={c.purple} />}
                  data={columnTasks}
                  keyExtractor={item => item.id}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item: task }) => (
                    <Card
                      key={task.id}
                      style={styles.kanbanCard}
                      onPress={() => openEdit(task)}
                    >
                      <View style={[styles.priorityTag, { backgroundColor: PRIORITY_COLORS[task.priority] }]} />
                      <View style={{ padding: 12, flex: 1 }}>
                        <Text style={[styles.kanbanTaskTitle, { color: c.textPrimary }]} numberOfLines={2}>{task.title}</Text>
                        <View style={styles.kanbanFooter}>
                          <Badge label={getCategoryLabel(task.category, t)} textStyle={{ fontSize: 10 }} />
                          <TouchableOpacity
                            onPress={() => {
                              const nextStatus = s === 'todo' ? 'in_progress' : s === 'in_progress' ? 'done' : 'todo';
                              moveTask(task.id, nextStatus);
                            }}
                            style={styles.kanbanActionBtn}
                          >
                            <MaterialIcons
                              name={s === 'done' ? 'check-circle' : s === 'in_progress' ? 'pending' : 'radio-button-unchecked'}
                              size={20}
                              color={s === 'done' ? c.green : s === 'in_progress' ? c.blue : c.textMuted}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Card>
                  )}
                  ListEmptyComponent={
                    <View style={[styles.kanbanEmpty, { borderColor: c.border }]}>
                      <Text style={{ color: c.textMuted, fontSize: 12 }}>{t(`tasks.empty_${s}`) || t('tasks.empty_all')}</Text>
                    </View>
                  }
                />
              </View>
            );
          })}
        </ScrollView>
      )}

      <FloatingActionButton onPress={openAdd} />

      <LevelUpModal
        visible={!!levelUpData}
        level={levelUpData}
        onClose={() => setLevelUpData(null)}
      />

      {/* Task Modal */}
      <Modal visible={Boolean(showModal)} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
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
                <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{editTask ? t('tasks.edit_task') : t('tasks.new_task')}</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}><MaterialIcons name="close" size={24} color={c.textSecondary} /></TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
              {form.goalId && <View style={{ paddingVertical: 12 }}><Text style={{ color: c.textSecondary }}>{language === 'id' ? 'Terkait tujuan' : 'Linked goal'}: {form.goalTitle}</Text><TouchableOpacity accessibilityRole="button" onPress={() => setForm(value => ({ ...value, goalId: undefined, goalTitle: undefined }))} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: c.textPrimary }}>{language === 'id' ? 'Lepas kaitan tujuan' : 'Remove goal link'}</Text></TouchableOpacity></View>}
              <Input
                label={t('tasks.title_label')}
                value={form.title}
                onChangeText={text => setForm({ ...form, title: text })}
                placeholder={t('tasks.title_placeholder')}
                autoFocus={!editTask}
              />

              <Input
                label={t('tasks.desc_label')}
                value={form.description}
                onChangeText={text => setForm({ ...form, description: text })}
                placeholder={t('tasks.desc_placeholder')}
                multiline={true}
                inputStyle={styles.textArea}
              />

              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>{t('tasks.priority_label')}</Text>
                <TouchableOpacity onPress={() => setShowPriorityLegend(!showPriorityLegend)}>
                  <MaterialIcons name="info-outline" size={16} color={c.purple} />
                </TouchableOpacity>
              </View>

              {showPriorityLegend && (
                <View style={[styles.legendBox, { backgroundColor: c.bgInput, borderColor: c.purple + '30' }]}>
                  {priorities.map(p => (
                    <View key={p} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: PRIORITY_COLORS[p] }]} />
                      <Text style={[styles.legendText, { color: c.textPrimary }]}>
                        <Text style={{ fontWeight: '900' }}>{p}</Text>: {t(`tasks.priority_${String(p || '').toLowerCase()}`)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.optionRow}>
                {priorities.map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.priorityBtn, { borderColor: c.border }, form.priority === p && { backgroundColor: PRIORITY_COLORS[p] + '15', borderColor: PRIORITY_COLORS[p] }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setForm({ ...form, priority: p }); }}
                  >
                    <Text style={[styles.optionText, { color: form.priority === p ? PRIORITY_COLORS[p] : c.textSecondary }]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: c.textSecondary, marginTop: 20 }]}>{t('tasks.category_label')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionRowScroll}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryBtn, { borderColor: c.border }, form.category === cat && { backgroundColor: c.purple + '15', borderColor: c.purple }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setForm({ ...form, category: cat }); }}
                  >
                    <Text style={[styles.optionText, { color: form.category === cat ? c.purple : c.textSecondary }]}>{t(`tasks.${cat.startsWith('cat_') ? cat : 'cat_' + cat}`)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: c.textSecondary, marginTop: 20 }]}>{t('tasks.status_label')}</Text>
              <View style={styles.optionRow}>
                {statuses.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusBtn, { borderColor: c.border }, form.status === s && { backgroundColor: c.green + '15', borderColor: c.green }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setForm({ ...form, status: s }); }}
                  >
                    <Text style={[styles.optionText, { color: form.status === s ? c.green : c.textSecondary }]}>{t(`tasks.status_${s}`)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                {editTask && (
                  <Button
                    label=""
                    onPress={() => handleDelete(editTask.id)}
                    variant="danger"
                    icon={<MaterialIcons name="delete-outline" size={24} color={c.red} />}
                    style={{ width: 60, height: 60 }}
                  />
                )}
                <Button
                  label={t('tasks.save')}
                  onPress={handleSubmit}
                  loading={saving}
                  style={{ flex: 1, height: 60 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {xpToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{xpToast}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 24, borderBottomWidth: 1 },
  backBtn: { flexShrink: 0, width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerIconBox: { flexShrink: 0, width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 24, fontWeight: '900' },
  pageSubtitle: { fontSize: 13, marginTop: 2, opacity: 0.7 },
  viewToggle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, marginTop: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  statusIndicator: { width: 4, height: 16, borderRadius: 2 },
  sectionDivider: { flex: 1, height: 1, opacity: 0.2 },

  filterWrapper: { paddingVertical: 12 },
  filterScroll: { paddingHorizontal: 24, gap: 10 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, gap: 8 },
  filterText: { fontSize: 13, fontWeight: '800' },
  filterTextSmall: { fontSize: 11, fontWeight: '800' },
  chipBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, minWidth: 20, alignItems: 'center' },
  chipBadgeText: { fontSize: 10, fontWeight: '900' },

  taskCard: { flexDirection: 'row', marginBottom: 16 },
  priorityTag: { width: 6 },
  taskContent: { flex: 1, padding: 18 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  taskTitle: { fontSize: 16, fontWeight: '800', flex: 1, marginRight: 10 },
  taskTitleSmall: { fontSize: 14, fontWeight: '800', flex: 1, marginRight: 8 },
  taskDesc: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  taskDescSmall: { fontSize: 11, lineHeight: 16, marginBottom: 10 },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deadline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deadlineText: { fontSize: 11, fontWeight: '600' },

  emptyContainer: { alignItems: 'center', paddingVertical: 100 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(150,150,150,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyText: { fontSize: 14, fontWeight: '600', marginBottom: 24, textAlign: 'center', paddingHorizontal: 40 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingHorizontal: 24, paddingTop: 28, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  modalTitle: { fontSize: 24, fontWeight: '900' },
  inputLabel: { fontSize: 14, fontWeight: '800', marginBottom: 12 },
  textArea: { height: 100, textAlignVertical: 'top' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 12 },
  legendBox: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12 },
  optionRow: { flexDirection: 'row', gap: 10 },
  optionRowScroll: { flexDirection: 'row', gap: 10 },
  priorityBtn: { flex: 1, height: 50, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  categoryBtn: { paddingHorizontal: 20, height: 50, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  statusBtn: { flex: 1, height: 50, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  optionText: { fontSize: 13, fontWeight: '800' },
  modalActions: { flexDirection: 'row', gap: 16, marginTop: 32 },

  toast: { position: 'absolute', top: 100, alignSelf: 'center', backgroundColor: '#52745a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, zIndex: 1000 },
  toastText: { color: '#fff', fontWeight: '800' },

  kanbanColumn: { marginRight: 20, paddingTop: 10 },
  columnHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 4 },
  columnTitle: { fontSize: 18, fontWeight: '900', textTransform: 'capitalize' },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  countText: { fontSize: 12, fontWeight: '800' },
  kanbanEmpty: { padding: 20, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', height: 100 },
  kanbanCard: { flexDirection: 'row', marginBottom: 12 },
  kanbanTaskTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  kanbanFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kanbanActionBtn: { padding: 4, marginRight: -4 },
});
