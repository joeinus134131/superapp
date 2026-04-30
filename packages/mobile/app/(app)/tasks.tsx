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
import { generateId, formatDate, PRIORITY_COLORS, PRIORITY_LABELS, CATEGORIES } from '../../lib/helpers';
import { addXP } from '../../lib/gamification';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  deadline: string;
  status: string;
  createdAt: string;
}

export default function TasksScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [xpToast, setXpToast] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '', description: '', priority: 'P3', category: 'Personal', deadline: '', status: 'todo'
  });

  const load = useCallback(async () => {
    const saved = await getData(STORAGE_KEYS.TASKS);
    if (saved && Array.isArray(saved)) setTasks(saved);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (newTasks: Task[]) => {
    setTasks(newTasks);
    await setData(STORAGE_KEYS.TASKS, newTasks);
  };

  const openAdd = () => {
    setEditTask(null);
    setForm({ title: '', description: '', priority: 'P3', category: 'Personal', deadline: '', status: 'todo' });
    setShowModal(true);
  };

  const openEdit = (task: Task) => {
    setEditTask(task);
    setForm({ ...task });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    if (editTask) {
      const wasDone = editTask.status === 'done';
      const nowDone = form.status === 'done';
      const updated = tasks.map(t => t.id === editTask.id ? { ...t, ...form } : t);
      await save(updated);
      if (!wasDone && nowDone) await rewardXP();
    } else {
      const newTask: Task = { ...form, id: generateId(), createdAt: new Date().toISOString() };
      await save([newTask, ...tasks]);
      if (form.status === 'done') await rewardXP();
    }
    setShowModal(false);
  };

  const deleteTask = async (id: string) => {
    Alert.alert('Hapus Task', 'Yakin ingin menghapus task ini?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => save(tasks.filter(t => t.id !== id)) },
    ]);
  };

  const moveTask = async (id: string, newStatus: string) => {
    const task = tasks.find(t => t.id === id);
    const wasDone = task?.status === 'done';
    await save(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));
    if (newStatus === 'done' && !wasDone) await rewardXP();
  };

  const rewardXP = async () => {
    const result = await addXP('TASK_COMPLETE');
    setXpToast(`+${result.xpGained} XP`);
    setTimeout(() => setXpToast(null), 2000);
  };

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.category === filter);
  const todo = filtered.filter(t => t.status === 'todo');
  const inProgress = filtered.filter(t => t.status === 'in-progress');
  const done = filtered.filter(t => t.status === 'done');

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const priorities = ['P1', 'P2', 'P3', 'P4'];
  const statuses = [
    { value: 'todo', label: 'To Do' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
  ];

  const renderTaskCard = (task: Task) => (
    <View key={task.id} style={[styles.taskCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
      <TouchableOpacity onPress={() => openEdit(task)} activeOpacity={0.7} style={{ flex: 1 }}>
        <View style={styles.taskHeader}>
          <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[task.priority] + '22' }]}>
            <Text style={[styles.priorityText, { color: PRIORITY_COLORS[task.priority] }]}>
              {task.priority} — {PRIORITY_LABELS[task.priority]}
            </Text>
          </View>
          <Text style={[styles.categoryText, { color: c.textMuted }]}>{task.category}</Text>
        </View>
        <Text style={[styles.taskTitle, { color: c.textPrimary, textDecorationLine: task.status === 'done' ? 'line-through' : 'none', opacity: task.status === 'done' ? 0.5 : 1 }]}>
          {task.title}
        </Text>
        {task.description ? <Text style={[styles.taskDesc, { color: c.textSecondary }]} numberOfLines={2}>{task.description}</Text> : null}
        {task.deadline ? (
          <View style={styles.deadlineRow}>
            <MaterialIcons name="event" size={12} color={c.textMuted} />
            <Text style={[styles.deadlineText, { color: c.textMuted }]}>{formatDate(task.deadline)}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
      <View style={styles.taskActions}>
        {task.status !== 'done' && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: c.green + '22' }]} onPress={() => moveTask(task.id, 'done')}>
            <MaterialIcons name="check" size={18} color={c.green} />
          </TouchableOpacity>
        )}
        {task.status === 'todo' && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: c.blue + '22' }]} onPress={() => moveTask(task.id, 'in-progress')}>
            <MaterialIcons name="play-arrow" size={18} color={c.blue} />
          </TouchableOpacity>
        )}
        {task.status === 'done' && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: c.yellow + '22' }]} onPress={() => moveTask(task.id, 'todo')}>
            <MaterialIcons name="replay" size={18} color={c.yellow} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: c.red + '22' }]} onPress={() => deleteTask(task.id)}>
          <MaterialIcons name="delete-outline" size={18} color={c.red} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSection = (title: string, items: Task[], icon: string, color: string) => (
    <View style={{ marginBottom: 16 }}>
      <View style={styles.sectionHeader}>
        <MaterialIcons name={icon as any} size={18} color={color} />
        <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>{title}</Text>
        <View style={[styles.countBadge, { backgroundColor: color + '22' }]}>
          <Text style={[styles.countText, { color }]}>{items.length}</Text>
        </View>
      </View>
      {items.length === 0 ? (
        <Text style={[styles.emptyText, { color: c.textMuted }]}>Tidak ada task</Text>
      ) : items.map(renderTaskCard)}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      {/* XP Toast */}
      {xpToast && (
        <View style={[styles.xpToast, { top: layout.insets.top + 12 }]}>
          <Text style={styles.xpToastText}>⚡ {xpToast}</Text>
        </View>
      )}

      {/* Header */}
      <View style={[styles.pageHeader, { backgroundColor: c.bgPrimary, borderBottomColor: c.border, paddingTop: layout.topPadding }]}>
        <View>
          <Text style={[styles.pageTitle, { color: c.textPrimary }]}>📋 Tasks</Text>
          <Text style={[styles.pageSubtitle, { color: c.textSecondary }]}>Kelola tugas dan proyekmu</Text>
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: c.purple }]} onPress={openAdd}>
          <MaterialIcons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: MOBILE_SPACING.screen, gap: 10 }}>
        {['all', ...CATEGORIES].map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterTab, filter === cat && { backgroundColor: c.purple + '22', borderColor: c.purple }]}
            onPress={() => setFilter(cat)}
          >
            <Text style={[styles.filterText, { color: filter === cat ? c.purple : c.textSecondary }]}>
              {cat === 'all' ? 'Semua' : cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Task List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: MOBILE_SPACING.screen, paddingTop: 12, paddingBottom: layout.bottomPadding }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.purple} />}
        showsVerticalScrollIndicator={false}
      >
        {renderSection('To Do', todo, 'radio-button-unchecked', c.blue)}
        {renderSection('In Progress', inProgress, 'autorenew', c.yellow)}
        {renderSection('Done', done, 'check-circle', c.green)}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.bgSecondary, paddingBottom: Math.max(layout.insets.bottom, 20) + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>
                {editTask ? 'Edit Task' : 'Task Baru'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <MaterialIcons name="close" size={24} color={c.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Judul</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                value={form.title}
                onChangeText={t => setForm({ ...form, title: t })}
                placeholder="Judul task..."
                placeholderTextColor={c.textMuted}
              />

              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Deskripsi</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                value={form.description}
                onChangeText={t => setForm({ ...form, description: t })}
                placeholder="Deskripsi opsional..."
                placeholderTextColor={c.textMuted}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Prioritas</Text>
              <View style={styles.optionRow}>
                {priorities.map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.optionBtn, form.priority === p && { backgroundColor: PRIORITY_COLORS[p] + '22', borderColor: PRIORITY_COLORS[p] }]}
                    onPress={() => setForm({ ...form, priority: p })}
                  >
                    <Text style={[styles.optionText, { color: form.priority === p ? PRIORITY_COLORS[p] : c.textSecondary }]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Kategori</Text>
              <View style={styles.optionRow}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.optionBtn, form.category === cat && { backgroundColor: c.purple + '22', borderColor: c.purple }]}
                    onPress={() => setForm({ ...form, category: cat })}
                  >
                    <Text style={[styles.optionText, { color: form.category === cat ? c.purple : c.textSecondary }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Status</Text>
              <View style={styles.optionRow}>
                {statuses.map(s => (
                  <TouchableOpacity
                    key={s.value}
                    style={[styles.optionBtn, form.status === s.value && { backgroundColor: c.green + '22', borderColor: c.green }]}
                    onPress={() => setForm({ ...form, status: s.value })}
                  >
                    <Text style={[styles.optionText, { color: form.status === s.value ? c.green : c.textSecondary }]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: c.border }]} onPress={() => setShowModal(false)}>
                  <Text style={{ color: c.textSecondary, fontWeight: '600' }}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: c.purple }]} onPress={handleSubmit}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{editTask ? 'Simpan' : 'Tambah'}</Text>
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
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: MOBILE_SPACING.screen, paddingBottom: 16, borderBottomWidth: 1 },
  pageTitle: { fontSize: 28, fontWeight: '900' },
  pageSubtitle: { fontSize: 15, marginTop: 6, lineHeight: 22 },
  addBtn: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  filterRow: { maxHeight: 56, marginTop: 10, marginBottom: 6 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: 'transparent' },
  filterText: { fontSize: 13, fontWeight: '700' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', flex: 1 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  countText: { fontSize: 12, fontWeight: '700' },

  taskCard: { borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  priorityText: { fontSize: 10, fontWeight: '700' },
  categoryText: { fontSize: 11, fontWeight: '500' },
  taskTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6, lineHeight: 22 },
  taskDesc: { fontSize: 13, marginBottom: 8, lineHeight: 20 },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  deadlineText: { fontSize: 12 },
  taskActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  emptyText: { textAlign: 'center', fontSize: 14, paddingVertical: 18 },

  xpToast: { position: 'absolute', top: 50, right: 16, zIndex: 999, backgroundColor: '#8b5cf6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  xpToastText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 12, padding: 12, fontSize: 15, borderWidth: 1 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  optionText: { fontSize: 13, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 20 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  submitBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});
