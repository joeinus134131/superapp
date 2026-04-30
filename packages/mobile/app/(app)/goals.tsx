import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, StyleSheet, RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { MOBILE_SPACING, useMobileLayout } from '../../lib/layout';
import { getData, setData, STORAGE_KEYS } from '../../lib/storage';
import { generateId, formatDate } from '../../lib/helpers';
import { addXP } from '../../lib/gamification';
import { PageHeader } from '../../components/PageHeader';

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  deadline: string;
  progress: number;
  completed: boolean;
  createdAt: string;
}

const GOAL_CATEGORIES = ['Karir', 'Keuangan', 'Kesehatan', 'Pendidikan', 'Personal', 'Hubungan', 'Lainnya'];
const CATEGORY_ICONS: Record<string, string> = {
  'Karir': 'work', 'Keuangan': 'account-balance-wallet', 'Kesehatan': 'favorite',
  'Pendidikan': 'school', 'Personal': 'person', 'Hubungan': 'people', 'Lainnya': 'star',
};

export default function GoalsScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [filter, setFilter] = useState<'active' | 'completed'>('active');
  const [refreshing, setRefreshing] = useState(false);
  const [xpToast, setXpToast] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', category: 'Personal', deadline: '', progress: 0,
  });

  const load = useCallback(async () => {
    const saved = await getData(STORAGE_KEYS.GOALS);
    if (saved && Array.isArray(saved)) setGoals(saved);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (data: Goal[]) => {
    setGoals(data);
    await setData(STORAGE_KEYS.GOALS, data);
  };

  const openAdd = () => {
    setEditGoal(null);
    setForm({ title: '', description: '', category: 'Personal', deadline: '', progress: 0 });
    setShowModal(true);
  };

  const openEdit = (goal: Goal) => {
    setEditGoal(goal);
    setForm({ title: goal.title, description: goal.description, category: goal.category, deadline: goal.deadline, progress: goal.progress });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    if (editGoal) {
      const updated = goals.map(g => g.id === editGoal.id ? { ...g, ...form } : g);
      await save(updated);
    } else {
      const newGoal: Goal = {
        id: generateId(), ...form, completed: false,
        createdAt: new Date().toISOString(),
      };
      await save([newGoal, ...goals]);
    }
    setShowModal(false);
  };

  const toggleComplete = async (id: string) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    const willComplete = !goal.completed;
    const updated = goals.map(g => g.id === id
      ? { ...g, completed: !g.completed, progress: willComplete ? 100 : g.progress }
      : g
    );
    await save(updated);
    if (willComplete) {
      const result = await addXP('GOAL_COMPLETE');
      setXpToast(`+${result.xpGained} XP 🎯 Goal selesai!`);
      setTimeout(() => setXpToast(null), 3000);
    }
  };

  const updateProgress = async (id: string, delta: number) => {
    const updated = goals.map(g => g.id === id
      ? { ...g, progress: Math.min(100, Math.max(0, g.progress + delta)) }
      : g
    );
    await save(updated);
  };

  const deleteGoal = (id: string) => {
    Alert.alert('Hapus Goal', 'Yakin?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => save(goals.filter(g => g.id !== id)) },
    ]);
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = goals.filter(g => filter === 'active' ? !g.completed : g.completed);
  const activeCount = goals.filter(g => !g.completed).length;
  const completedCount = goals.filter(g => g.completed).length;
  const avgProgress = goals.length > 0
    ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      {xpToast && (
        <View style={[styles.xpToast, { top: layout.insets.top + 12 }]}>
          <Text style={styles.xpToastText}>⚡ {xpToast}</Text>
        </View>
      )}
      <PageHeader
        title="Goals"
        subtitle="Susun target, ukur progres, lalu tuntaskan."
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
        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Aktif', value: activeCount, icon: 'flag' as const, color: c.purple },
            { label: 'Selesai', value: completedCount, icon: 'check-circle' as const, color: c.green },
            { label: 'Rata-rata', value: `${avgProgress}%`, icon: 'trending-up' as const, color: c.cyan },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '22' }]}>
                <MaterialIcons name={s.icon} size={20} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: c.textPrimary }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: c.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Filter */}
        <View style={styles.filterRow}>
          {(['active', 'completed'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && { backgroundColor: c.purple + '22', borderColor: c.purple }]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, { color: filter === f ? c.purple : c.textSecondary }]}>
                {f === 'active' ? `Aktif (${activeCount})` : `Selesai (${completedCount})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Goals List */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="flag" size={48} color={c.textMuted} />
            <Text style={[styles.emptyText, { color: c.textMuted }]}>
              {filter === 'active' ? 'Belum ada goal aktif' : 'Belum ada goal selesai'}
            </Text>
          </View>
        ) : filtered.map(goal => (
          <View key={goal.id} style={[styles.goalCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <View style={styles.goalHeader}>
              <View style={[styles.catBadge, { backgroundColor: c.purple + '22' }]}>
                <MaterialIcons name={CATEGORY_ICONS[goal.category] as any || 'star'} size={12} color={c.purple} />
                <Text style={[styles.catText, { color: c.purple }]}>{goal.category}</Text>
              </View>
              <View style={styles.goalActions}>
                <TouchableOpacity onPress={() => openEdit(goal)}>
                  <MaterialIcons name="edit" size={18} color={c.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteGoal(goal.id)}>
                  <MaterialIcons name="delete-outline" size={18} color={c.red} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[styles.goalTitle, { color: c.textPrimary, textDecorationLine: goal.completed ? 'line-through' : 'none', opacity: goal.completed ? 0.5 : 1 }]}>
              {goal.title}
            </Text>
            {goal.description ? <Text style={[styles.goalDesc, { color: c.textSecondary }]}>{goal.description}</Text> : null}

            {/* Progress */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressLabel, { color: c.textSecondary }]}>Progress</Text>
                <Text style={[styles.progressValue, { color: c.textPrimary }]}>{goal.progress}%</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
                <View style={[styles.progressFill, { width: `${goal.progress}%`, backgroundColor: goal.completed ? c.green : c.purple }]} />
              </View>
              {!goal.completed && (
                <View style={styles.progressControls}>
                  <TouchableOpacity style={[styles.progBtn, { backgroundColor: c.border }]} onPress={() => updateProgress(goal.id, -10)}>
                    <Text style={[{ color: c.textPrimary, fontSize: 16 }]}>−</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.progBtn, { backgroundColor: c.purple + '22' }]} onPress={() => updateProgress(goal.id, 10)}>
                    <Text style={[{ color: c.purple, fontSize: 16 }]}>+</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.goalFooter}>
              {goal.deadline ? (
                <View style={styles.deadlineRow}>
                  <MaterialIcons name="event" size={12} color={c.textMuted} />
                  <Text style={[styles.deadlineText, { color: c.textMuted }]}>{formatDate(goal.deadline)}</Text>
                </View>
              ) : null}
              <TouchableOpacity
                style={[styles.completeBtn, { backgroundColor: goal.completed ? c.green + '22' : c.purple, borderWidth: goal.completed ? 1 : 0, borderColor: c.green }]}
                onPress={() => toggleComplete(goal.id)}
              >
                <MaterialIcons name={goal.completed ? 'check-circle' : 'radio-button-unchecked'} size={16} color={goal.completed ? c.green : '#fff'} />
                <Text style={[styles.completeBtnText, { color: goal.completed ? c.green : '#fff' }]}>
                  {goal.completed ? 'Selesai' : 'Tandai Selesai'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.bgSecondary, paddingBottom: Math.max(layout.insets.bottom, 20) + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{editGoal ? 'Edit Goal' : 'Goal Baru'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <MaterialIcons name="close" size={24} color={c.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Judul Goal</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                value={form.title}
                onChangeText={v => setForm({ ...form, title: v })}
                placeholder="Contoh: Belajar bahasa Jepang..."
                placeholderTextColor={c.textMuted}
              />
              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Deskripsi</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                value={form.description}
                onChangeText={v => setForm({ ...form, description: v })}
                placeholder="Detail rencana..."
                placeholderTextColor={c.textMuted}
                multiline numberOfLines={3}
              />
              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Kategori</Text>
              <View style={styles.optionRow}>
                {GOAL_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.optionBtn, form.category === cat && { backgroundColor: c.purple + '22', borderColor: c.purple }]}
                    onPress={() => setForm({ ...form, category: cat })}
                  >
                    <Text style={[styles.optionText, { color: form.category === cat ? c.purple : c.textSecondary }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: c.border }]} onPress={() => setShowModal(false)}>
                  <Text style={{ color: c.textSecondary, fontWeight: '600' }}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: c.purple }]} onPress={handleSubmit}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{editGoal ? 'Simpan' : 'Tambah'}</Text>
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
  xpToast: { position: 'absolute', top: 70, right: 16, zIndex: 999, backgroundColor: '#8b5cf6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  xpToastText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1 },
  statIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  filterBtn: { flex: 1, minHeight: 44, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  filterText: { fontSize: 13, fontWeight: '700' },
  goalCard: { borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catText: { fontSize: 11, fontWeight: '700' },
  goalActions: { flexDirection: 'row', gap: 12 },
  goalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  goalDesc: { fontSize: 13, marginBottom: 10, lineHeight: 18 },
  progressSection: { marginBottom: 12 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12 },
  progressValue: { fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 6 },
  progressControls: { flexDirection: 'row', gap: 8 },
  progBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  goalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  deadlineText: { fontSize: 11 },
  completeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 42, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  completeBtnText: { fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 15, fontWeight: '600', marginTop: 12 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 12, padding: 12, fontSize: 15, borderWidth: 1 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
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
