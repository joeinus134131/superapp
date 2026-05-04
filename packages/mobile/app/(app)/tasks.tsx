import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, StyleSheet, Dimensions, RefreshControl, Alert, SectionList, FlatList
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { useMobileLayout } from '../../lib/layout';
import { formatDate, PRIORITY_COLORS, CATEGORIES } from '../../lib/helpers';
import { useLanguage } from '../../context/languageContext';
import * as Haptics from 'expo-haptics';

import { useTasks, Task } from '../../hooks/useTasks';
import { FloatingActionButton } from '../../components/FloatingActionButton';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';

const TaskCard = React.memo(({ task, onEdit, onToggle, c, t, language }: { task: Task, onEdit: (t: Task) => void, onToggle: (id: string, s: string) => void, c: any, t: any, language: string }) => {
  return (
    <Card
      style={styles.taskCard}
      onPress={() => onEdit(task)}
    >
      <View style={[styles.priorityTag, { backgroundColor: PRIORITY_COLORS[task.priority] }]} />
      <View style={styles.taskContent}>
        <View style={styles.taskHeader}>
          <Text style={[styles.taskTitle, { color: c.textPrimary }, task.status === 'done' && { textDecorationLine: 'line-through', opacity: 0.5 }]}>
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
          <Text style={[styles.taskDesc, { color: c.textSecondary }]} numberOfLines={2}>{task.description}</Text>
        ) : null}
        <View style={styles.taskFooter}>
          <Badge label={t(`tasks.${task.category.toLowerCase().startsWith('cat_') ? task.category.toLowerCase() : 'cat_' + task.category.toLowerCase()}`)} />
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
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();
  const { t, language } = useLanguage();

  const { tasks, loading, xpToast, addTask, updateTask, deleteTask, moveTask, refreshTasks } = useTasks();
  
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showPriorityLegend, setShowPriorityLegend] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  const [form, setForm] = useState({
    title: '', description: '', priority: 'P3', category: 'personal', deadline: '', status: 'todo'
  });

  const openAdd = useCallback(() => {
    setEditTask(null);
    setForm({ title: '', description: '', priority: 'P3', category: 'personal', deadline: '', status: 'todo' });
    setShowModal(true);
  }, []);

  const openEdit = useCallback((task: Task) => {
    setEditTask(task);
    setForm({ ...task });
    setShowModal(true);
  }, []);

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    if (editTask) {
      await updateTask(editTask.id, form);
    } else {
      await addTask(form);
    }
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(t('tasks.delete_title'), t('tasks.delete_confirm'), [
      { text: t('tasks.cancel'), style: 'cancel' },
      { text: t('tasks.delete_btn'), style: 'destructive', onPress: () => deleteTask(id) },
    ]);
  };

  const statuses = ['todo', 'in_progress', 'done'];
  const priorities = ['P1', 'P2', 'P3', 'P4'];

  const sections = useMemo(() => {
    if (filter !== 'all') return [];
    return statuses.map(s => ({
      title: s,
      data: tasks.filter(t => t.status === s)
    }));
  }, [tasks, filter]);

  const filteredTasks = useMemo(() => 
    filter === 'all' ? tasks : tasks.filter(t => t.status === filter),
  [tasks, filter]);

  const renderTask = useCallback(({ item }: { item: Task }) => (
    <TaskCard 
      task={item} 
      onEdit={openEdit} 
      onToggle={moveTask} 
      c={c} 
      t={t} 
      language={language} 
    />
  ), [openEdit, moveTask, c, t, language]);

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.pageHeader, { borderBottomColor: c.border, paddingTop: layout.topPadding }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.headerIconBox, { backgroundColor: c.purple + '15' }]}>
            <MaterialIcons name="assignment" size={24} color={c.purple} />
          </View>
          <View>
            <Text style={[styles.pageTitle, { color: c.textPrimary }]}>{t('sidebar.tasks')}</Text>
            <Text style={[styles.pageSubtitle, { color: c.textSecondary }]}>{t('tasks.subtitle')}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity 
            style={[styles.viewToggle, { backgroundColor: c.bgInput }]} 
            onPress={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
          >
            <MaterialIcons name={viewMode === 'list' ? 'dashboard' : 'view-list'} size={20} color={c.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['all', ...statuses].map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, filter === s && { backgroundColor: c.purple }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilter(s); }}
            >
              <Text style={[styles.filterText, { color: filter === s ? '#fff' : c.textSecondary }]}>
                {s === 'all' ? t('tasks.all_categories') : t(`tasks.status_${s}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {viewMode === 'list' ? (
        filter === 'all' ? (
          <SectionList
            sections={sections}
            keyExtractor={item => item.id}
            renderItem={renderTask}
            renderSectionHeader={({ section: { title, data } }) => (
              <View style={styles.sectionHeader}>
                <View style={[styles.statusIndicator, { backgroundColor: title === 'done' ? c.green : (title === 'in_progress' ? c.blue : c.purple) }]} />
                <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>
                  {(t(`tasks.status_${title}`) || title).toUpperCase()} ({data.length})
                </Text>
                <View style={[styles.sectionDivider, { backgroundColor: c.border }]} />
              </View>
            )}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: layout.bottomPadding + 100 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshTasks} tintColor={c.purple} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="assignment-late" size={64} color={c.textMuted} />
                <Text style={[styles.emptyText, { color: c.textMuted }]}>{t(`tasks.empty_${filter}`)}</Text>
              </View>
            }
          />
        ) : (
          <FlatList
            data={filteredTasks}
            keyExtractor={item => item.id}
            renderItem={renderTask}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: layout.bottomPadding + 100 }}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshTasks} tintColor={c.purple} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="assignment-late" size={64} color={c.textMuted} />
                <Text style={[styles.emptyText, { color: c.textMuted }]}>{t(`tasks.empty_${filter}`)}</Text>
              </View>
            }
          />
        )
      ) : (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: layout.bottomPadding + 100 }}
          snapToInterval={Dimensions.get('window').width - 48}
          decelerationRate="fast"
        >
          {statuses.map(s => {
            const columnTasks = tasks.filter(t => t.status === s);
            return (
              <View key={s} style={[styles.kanbanColumn, { width: Dimensions.get('window').width - 64 }]}>
                <View style={styles.columnHeader}>
                  <Text style={[styles.columnTitle, { color: c.textPrimary }]}>{t(`tasks.status_${s}`)}</Text>
                  <View style={[styles.countBadge, { backgroundColor: c.purple + '15' }]}>
                    <Text style={[styles.countText, { color: c.purple }]}>{columnTasks.length}</Text>
                  </View>
                </View>
                <FlatList
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
                          <Badge label={t(`tasks.${task.category.toLowerCase().startsWith('cat_') ? task.category.toLowerCase() : 'cat_' + task.category.toLowerCase()}`)} textStyle={{ fontSize: 10 }} />
                          <TouchableOpacity onPress={() => moveTask(task.id, s === 'done' ? 'todo' : 'done')}>
                            <MaterialIcons 
                              name={s === 'done' ? 'check-circle' : 'radio-button-unchecked'} 
                              size={18} 
                              color={s === 'done' ? c.green : c.textMuted} 
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Card>
                  )}
                  ListEmptyComponent={
                    <View style={[styles.kanbanEmpty, { borderColor: c.border }]}>
                      <Text style={{ color: c.textMuted, fontSize: 12 }}>{t('tasks.empty_all')}</Text>
                    </View>
                  }
                />
              </View>
            );
          })}
        </ScrollView>
      )}

      <FloatingActionButton onPress={openAdd} />

      {/* Task Modal */}
      <Modal visible={Boolean(showModal)} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.bgSecondary, paddingBottom: Math.max(layout.insets.bottom, 20) + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{editTask ? t('tasks.edit_task') : t('tasks.new_task')}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><MaterialIcons name="close" size={24} color={c.textSecondary} /></TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
                        <Text style={{ fontWeight: '900' }}>{p}</Text>: {t(`tasks.priority_${p.toLowerCase()}`)}
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
                  style={{ flex: 1, height: 60 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
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
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 24, paddingBottom: 24, borderBottomWidth: 1 },
  headerIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 28, fontWeight: '900' },
  pageSubtitle: { fontSize: 14, marginTop: 4 },
  viewToggle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, marginTop: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  statusIndicator: { width: 8, height: 8, borderRadius: 4 },
  sectionDivider: { flex: 1, height: 1, opacity: 0.5 },
  
  filterWrapper: { paddingVertical: 16 },
  filterScroll: { paddingHorizontal: 24, gap: 10 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(150,150,150,0.1)' },
  filterText: { fontSize: 13, fontWeight: '700' },
  
  taskCard: { flexDirection: 'row', marginBottom: 16 },
  priorityTag: { width: 6 },
  taskContent: { flex: 1, padding: 18 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  taskTitle: { fontSize: 16, fontWeight: '800', flex: 1, marginRight: 10 },
  taskDesc: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deadline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deadlineText: { fontSize: 11, fontWeight: '600' },
  
  emptyContainer: { alignItems: 'center', paddingVertical: 80, opacity: 0.5 },
  emptyText: { fontSize: 15, fontWeight: '700', marginTop: 12 },
  
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
  
  toast: { position: 'absolute', top: 100, alignSelf: 'center', backgroundColor: '#8b5cf6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, zIndex: 1000 },
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
});
