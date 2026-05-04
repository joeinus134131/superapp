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
import { useLanguage } from '../../context/languageContext';

import { FloatingActionButton } from '../../components/FloatingActionButton';

interface JourneyItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  deadline: string;
  progress: number;
  completed: boolean;
  journey: JourneyItem[];
  createdAt: string;
}

const GOAL_CATEGORIES = ['career', 'finance', 'health', 'education', 'personal', 'relationship', 'other'];
const CATEGORY_ICONS: Record<string, string> = {
  'career': 'work', 'finance': 'account-balance-wallet', 'health': 'favorite',
  'education': 'school', 'personal': 'person', 'relationship': 'people', 'other': 'star',
};

export default function GoalsScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();
  const { t, language } = useLanguage();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [filter, setFilter] = useState<'active' | 'completed'>('active');
  const [refreshing, setRefreshing] = useState(false);
  const [xpToast, setXpToast] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '', description: '', category: 'career', deadline: '', journey: [] as JourneyItem[]
  });
  const [newStep, setNewStep] = useState('');

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
    setForm({ title: '', description: '', category: 'career', deadline: '', journey: [] });
    setShowModal(true);
  };

  const openEdit = (goal: Goal) => {
    setEditGoal(goal);
    setForm({ ...goal });
    setShowModal(true);
  };

  const addStep = () => {
    if (!newStep.trim()) return;
    setForm({ ...form, journey: [...form.journey, { id: generateId(), text: newStep.trim(), completed: false }] });
    setNewStep('');
  };

  const toggleStep = (id: string) => {
    setForm({
      ...form,
      journey: form.journey.map(s => s.id === id ? { ...s, completed: !s.completed } : s)
    });
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    const completedSteps = form.journey.filter(s => s.completed).length;
    const progress = form.journey.length > 0 ? (completedSteps / form.journey.length) * 100 : 0;
    const isNowCompleted = progress === 100 && form.journey.length > 0;

    if (editGoal) {
      const wasCompleted = editGoal.completed;
      const updated = goals.map(g => g.id === editGoal.id ? { ...g, ...form, progress, completed: isNowCompleted } : g);
      await save(updated);
      if (!wasCompleted && isNowCompleted) await rewardXP();
    } else {
      const newGoal: Goal = {
        ...form, id: generateId(), progress, completed: isNowCompleted,
        createdAt: new Date().toISOString(),
      };
      await save([newGoal, ...goals]);
      if (isNowCompleted) await rewardXP();
    }
    setShowModal(false);
  };

  const rewardXP = async () => {
    const result = await addXP('GOAL_ACHIEVED');
    setXpToast(`+${result.xpGained} XP 🏆 ${t('goals.success_toast')}`);
    setTimeout(() => setXpToast(null), 3000);
  };

  const deleteGoal = async (id: string) => {
    Alert.alert(t('goals.delete_title'), t('goals.delete_confirm'), [
      { text: t('tasks.cancel'), style: 'cancel' },
      { text: t('tasks.delete_btn'), style: 'destructive', onPress: () => save(goals.filter(g => g.id !== id)) },
    ]);
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const filtered = goals.filter(g => filter === 'active' ? !g.completed : g.completed);

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <View style={[styles.pageHeader, { borderBottomColor: c.border, paddingTop: layout.topPadding, paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.headerIconBox, { backgroundColor: c.cyan + '15', width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }]}>
            <MaterialIcons name="flag" size={24} color={c.cyan} />
          </View>
          <View>
            <Text style={[styles.pageTitle, { color: c.textPrimary, fontSize: 28, fontWeight: '900' }]}>{t('sidebar.goals')}</Text>
            <Text style={[styles.pageSubtitle, { color: c.textSecondary, fontSize: 14, marginTop: 2 }]}>{t('goals.subtitle')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, filter === 'active' && { borderBottomColor: c.purple }]} onPress={() => setFilter('active')}>
          <Text style={[styles.tabText, { color: filter === 'active' ? c.purple : c.textSecondary }]}>
            {t('goals.active_targets').replace('{count}', goals.filter(g => !g.completed).length.toString())}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, filter === 'completed' && { borderBottomColor: c.green }]} onPress={() => setFilter('completed')}>
          <Text style={[styles.tabText, { color: filter === 'completed' ? c.green : c.textSecondary }]}>
            {t('goals.completed_targets').replace('{count}', goals.filter(g => g.completed).length.toString())}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.purple} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: layout.bottomPadding + 100 }}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="track-changes" size={64} color={c.textMuted} />
            <Text style={[styles.emptyText, { color: c.textMuted }]}>{t(`goals.empty_${filter}`)}</Text>
          </View>
        ) : filtered.map(goal => (
          <TouchableOpacity key={goal.id} style={[styles.goalCard, { backgroundColor: c.bgCard, borderColor: c.border }]} onPress={() => openEdit(goal)}>
            <View style={styles.goalHeader}>
              <View style={[styles.iconBox, { backgroundColor: c.bgInput }]}>
                <MaterialIcons name={CATEGORY_ICONS[goal.category] as any} size={24} color={c.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.goalTitle, { color: c.textPrimary }]}>{goal.title}</Text>
                <Text style={[styles.goalCat, { color: c.textMuted }]}>{t(`goals.cat_${goal.category}`)}</Text>
              </View>
              {goal.completed && (
                <View style={[styles.badge, { backgroundColor: c.green + '20' }]}>
                  <Text style={[styles.badgeText, { color: c.green }]}>{t('goals.achieved_badge')}</Text>
                </View>
              )}
            </View>

            <View style={styles.progressSection}>
              <View style={styles.progressInfo}>
                <Text style={[styles.progressLabel, { color: c.textSecondary }]}>{t('goals.progress_label').replace('{percent}', Math.round(goal.progress).toString())}</Text>
                {goal.deadline ? <Text style={[styles.deadline, { color: c.textMuted }]}>{formatDate(goal.deadline, language)}</Text> : null}
              </View>
              <View style={[styles.progressTrack, { backgroundColor: c.bgInput }]}>
                <View style={[styles.progressFill, { width: `${goal.progress}%`, backgroundColor: goal.completed ? c.green : c.purple }]} />
              </View>
            </View>

            {goal.journey.length > 0 && (
              <View style={styles.milestones}>
                <Text style={[styles.milestoneLabel, { color: c.textMuted }]}>{t('goals.journey_label')}</Text>
                {goal.journey.slice(0, 2).map(step => (
                  <View key={step.id} style={styles.milestoneItem}>
                    <MaterialIcons name={step.completed ? "check-box" : "check-box-outline-blank"} size={16} color={step.completed ? c.green : c.textMuted} />
                    <Text style={[styles.milestoneText, { color: c.textSecondary }, step.completed && { textDecorationLine: 'line-through' }]} numberOfLines={1}>{step.text}</Text>
                  </View>
                ))}
                {goal.journey.length > 2 && <Text style={{ fontSize: 10, color: c.textMuted, marginTop: 4 }}>+ {goal.journey.length - 2} more steps</Text>}
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FloatingActionButton onPress={openAdd} />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.bgSecondary, paddingBottom: Math.max(layout.insets.bottom, 20) + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{editGoal ? t('goals.edit_goal') : t('goals.new_goal')}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><MaterialIcons name="close" size={24} color={c.textSecondary} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>{t('goals.title_label')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                value={form.title} onChangeText={v => setForm({ ...form, title: v })}
                placeholder={t('goals.title_placeholder')} placeholderTextColor={c.textMuted}
              />

              <Text style={[styles.inputLabel, { color: c.textSecondary, marginTop: 20 }]}>{t('goals.cat_label')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
                {GOAL_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catBtn, { borderColor: c.border }, form.category === cat && { backgroundColor: c.purple + '15', borderColor: c.purple }]}
                    onPress={() => setForm({ ...form, category: cat })}
                  >
                    <MaterialIcons name={CATEGORY_ICONS[cat] as any} size={18} color={form.category === cat ? c.purple : c.textMuted} />
                    <Text style={[styles.catBtnText, { color: form.category === cat ? c.purple : c.textSecondary }]}>{t(`goals.cat_${cat}`)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: c.textSecondary, marginTop: 20 }]}>{t('goals.journey_setup_label')}</Text>
              <View style={styles.journeyInput}>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                  value={newStep} onChangeText={setNewStep} placeholder={t('goals.add_step_placeholder')} placeholderTextColor={c.textMuted}
                />
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: c.purple }]} onPress={addStep}>
                  <MaterialIcons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {form.journey.map(step => (
                <View key={step.id} style={styles.stepItem}>
                  <TouchableOpacity onPress={() => toggleStep(step.id)}>
                    <MaterialIcons name={step.completed ? "check-box" : "check-box-outline-blank"} size={24} color={step.completed ? c.green : c.textMuted} />
                  </TouchableOpacity>
                  <Text style={[styles.stepText, { color: c.textPrimary }, step.completed && { textDecorationLine: 'line-through', opacity: 0.6 }]}>{step.text}</Text>
                  <TouchableOpacity onPress={() => setForm({ ...form, journey: form.journey.filter(s => s.id !== step.id) })}>
                    <MaterialIcons name="remove-circle-outline" size={20} color={c.red} />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.modalActions}>
                {editGoal && (
                  <TouchableOpacity style={[styles.deleteBtn, { borderColor: c.red }]} onPress={() => deleteGoal(editGoal.id)}>
                    <MaterialIcons name="delete-outline" size={24} color={c.red} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: c.purple }]} onPress={handleSubmit}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{t('goals.start_btn')}</Text>
                </TouchableOpacity>
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
  pageHeader: { paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1 },
  headerIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 28, fontWeight: '900' },
  pageSubtitle: { fontSize: 14, marginTop: 4 },
  tabs: { flexDirection: 'row', paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, fontWeight: '800' },
  goalCard: { borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1 },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  goalTitle: { fontSize: 18, fontWeight: '800' },
  goalCat: { fontSize: 12, fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '900' },
  progressSection: { marginBottom: 20 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, fontWeight: '800' },
  deadline: { fontSize: 11, fontWeight: '600' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  milestones: { borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)', paddingTop: 16 },
  milestoneLabel: { fontSize: 10, fontWeight: '900', marginBottom: 10, letterSpacing: 1 },
  milestoneItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  milestoneText: { fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 80, opacity: 0.5 },
  emptyText: { fontSize: 15, fontWeight: '700', marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingHorizontal: 24, paddingTop: 28, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  modalTitle: { fontSize: 24, fontWeight: '900' },
  inputLabel: { fontSize: 14, fontWeight: '800', marginBottom: 12 },
  input: { borderRadius: 16, padding: 16, fontSize: 16, borderWidth: 1 },
  catRow: { flexDirection: 'row', gap: 10 },
  catBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, height: 48, borderRadius: 14, borderWidth: 1, marginRight: 10 },
  catBtnText: { fontSize: 13, fontWeight: '700' },
  journeyInput: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  addBtn: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, padding: 12, borderRadius: 14, backgroundColor: 'rgba(150,150,150,0.05)' },
  stepText: { flex: 1, fontSize: 14, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 16, marginTop: 32 },
  deleteBtn: { width: 60, height: 60, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  submitBtn: { flex: 1, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  toast: { position: 'absolute', top: 100, alignSelf: 'center', backgroundColor: '#06b6d4', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, zIndex: 1000 },
  toastText: { color: '#fff', fontWeight: '800' },
});
