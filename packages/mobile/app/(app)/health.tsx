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
import { generateId, getToday, formatDate } from '../../lib/helpers';
import { addXP } from '../../lib/gamification';
import { PageHeader } from '../../components/PageHeader';

interface Workout {
  id: string;
  type: string;
  duration: number;
  calories: number;
  notes: string;
  date: string;
}

interface DailyHealth {
  date: string;
  steps: number;
  water: number;
  sleep: number;
  weight: number;
}

const WORKOUT_TYPES = ['Lari', 'Gym', 'Yoga', 'Renang', 'Bersepeda', 'HIIT', 'Jalan Kaki', 'Lainnya'];

export default function HealthScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const today = getToday();
  const layout = useMobileLayout();

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [dailyData, setDailyData] = useState<DailyHealth>({ date: today, steps: 0, water: 0, sleep: 0, weight: 0 });
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [xpToast, setXpToast] = useState<string | null>(null);
  const [form, setForm] = useState({ type: 'Lari', duration: '', calories: '', notes: '' });
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [dailyForm, setDailyForm] = useState({ steps: '', water: '', sleep: '', weight: '' });

  const load = useCallback(async () => {
    const saved = await getData(STORAGE_KEYS.HEALTH);
    if (saved) {
      if (saved.workouts) setWorkouts(saved.workouts);
      const todayData = saved.daily?.[today] || { date: today, steps: 0, water: 0, sleep: 0, weight: 0 };
      setDailyData(todayData);
    }
  }, [today]);

  useEffect(() => { load(); }, [load]);

  const saveHealth = async (updates: { workouts?: Workout[]; daily?: Record<string, DailyHealth> }) => {
    const current = await getData(STORAGE_KEYS.HEALTH) || {};
    const newData = { ...current, ...updates };
    await setData(STORAGE_KEYS.HEALTH, newData);
  };

  const addWorkout = async () => {
    if (!form.duration) return;
    const workout: Workout = {
      id: generateId(), type: form.type,
      duration: parseInt(form.duration) || 0,
      calories: parseInt(form.calories) || 0,
      notes: form.notes, date: today,
    };
    const updated = [workout, ...workouts];
    setWorkouts(updated);
    await saveHealth({ workouts: updated });
    setShowWorkoutModal(false);
    setForm({ type: 'Lari', duration: '', calories: '', notes: '' });
    const result = await addXP('WORKOUT');
    setXpToast(`+${result.xpGained} XP 💪 Workout selesai!`);
    setTimeout(() => setXpToast(null), 2500);
  };

  const deleteWorkout = (id: string) => {
    Alert.alert('Hapus Workout', 'Yakin?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive', onPress: async () => {
          const updated = workouts.filter(w => w.id !== id);
          setWorkouts(updated);
          await saveHealth({ workouts: updated });
        }
      },
    ]);
  };

  const saveDailyData = async () => {
    const updated: DailyHealth = {
      date: today,
      steps: parseInt(dailyForm.steps) || dailyData.steps,
      water: parseFloat(dailyForm.water) || dailyData.water,
      sleep: parseFloat(dailyForm.sleep) || dailyData.sleep,
      weight: parseFloat(dailyForm.weight) || dailyData.weight,
    };
    setDailyData(updated);
    const current = await getData(STORAGE_KEYS.HEALTH) || {};
    const daily = { ...(current.daily || {}), [today]: updated };
    await saveHealth({ daily });
    setShowDailyModal(false);
  };

  const openDailyModal = () => {
    setDailyForm({
      steps: dailyData.steps ? String(dailyData.steps) : '',
      water: dailyData.water ? String(dailyData.water) : '',
      sleep: dailyData.sleep ? String(dailyData.sleep) : '',
      weight: dailyData.weight ? String(dailyData.weight) : '',
    });
    setShowDailyModal(true);
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const thisWeekWorkouts = workouts.filter(w => {
    const d = new Date(w.date);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  });
  const totalCalories = thisWeekWorkouts.reduce((s, w) => s + w.calories, 0);
  const totalMinutes = thisWeekWorkouts.reduce((s, w) => s + w.duration, 0);

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      {xpToast && (
        <View style={[styles.xpToast, { top: layout.insets.top + 12 }]}><Text style={styles.xpToastText}>⚡ {xpToast}</Text></View>
      )}
      <PageHeader
        title="Kesehatan"
        subtitle="Tracking workout dan kondisi harian."
        textColor={c.textPrimary}
        subtextColor={c.textSecondary}
        borderColor={c.border}
        backgroundColor={c.bgPrimary}
        actionColor={c.green}
        onActionPress={() => setShowWorkoutModal(true)}
      />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.purple} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: MOBILE_SPACING.screen, paddingTop: 14, paddingBottom: layout.bottomPadding }}
      >
        {/* Weekly Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Workout', value: thisWeekWorkouts.length, unit: 'sesi', icon: 'fitness-center' as const, color: c.purple },
            { label: 'Kalori', value: totalCalories, unit: 'kal', icon: 'local-fire-department' as const, color: c.red },
            { label: 'Menit', value: totalMinutes, unit: 'min', icon: 'timer' as const, color: c.cyan },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '22' }]}>
                <MaterialIcons name={s.icon} size={20} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: c.textPrimary }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: c.textMuted }]}>{s.unit}</Text>
              <Text style={[styles.statSubLabel, { color: c.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Daily Tracker */}
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="today" size={18} color={c.cyan} />
            <Text style={[styles.cardTitle, { color: c.textPrimary }]}>Data Hari Ini</Text>
            <TouchableOpacity onPress={openDailyModal} style={styles.editBtn}>
              <MaterialIcons name="edit" size={16} color={c.purple} />
              <Text style={[styles.editBtnText, { color: c.purple }]}>Update</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dailyGrid}>
            {[
              { label: 'Langkah', value: dailyData.steps ? `${dailyData.steps.toLocaleString()}` : '—', unit: 'steps', icon: 'directions-walk' as const, color: c.green },
              { label: 'Air', value: dailyData.water ? `${dailyData.water}L` : '—', unit: '', icon: 'water-drop' as const, color: c.cyan },
              { label: 'Tidur', value: dailyData.sleep ? `${dailyData.sleep}j` : '—', unit: '', icon: 'bedtime' as const, color: c.purple },
              { label: 'Berat', value: dailyData.weight ? `${dailyData.weight}kg` : '—', unit: '', icon: 'monitor-weight' as const, color: c.orange },
            ].map((item, i) => (
              <View key={i} style={[styles.dailyItem, { backgroundColor: item.color + '11', borderColor: item.color + '33' }]}>
                <MaterialIcons name={item.icon} size={22} color={item.color} />
                <Text style={[styles.dailyValue, { color: c.textPrimary }]}>{item.value}</Text>
                <Text style={[styles.dailyLabel, { color: c.textMuted }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Workout History */}
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="history" size={18} color={c.purple} />
            <Text style={[styles.cardTitle, { color: c.textPrimary }]}>Riwayat Workout</Text>
          </View>
          {workouts.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="fitness-center" size={40} color={c.textMuted} />
              <Text style={[styles.emptyText, { color: c.textMuted }]}>Belum ada workout</Text>
            </View>
          ) : workouts.slice(0, 15).map(w => (
            <View key={w.id} style={[styles.workoutRow, { borderBottomColor: c.border }]}>
              <View style={[styles.workoutIcon, { backgroundColor: c.purple + '22' }]}>
                <MaterialIcons name="fitness-center" size={18} color={c.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.workoutType, { color: c.textPrimary }]}>{w.type}</Text>
                <Text style={[styles.workoutMeta, { color: c.textMuted }]}>
                  {w.duration} min • {w.calories} kal • {formatDate(w.date)}
                </Text>
                {w.notes ? <Text style={[styles.workoutNotes, { color: c.textSecondary }]}>{w.notes}</Text> : null}
              </View>
              <TouchableOpacity onPress={() => deleteWorkout(w.id)}>
                <MaterialIcons name="delete-outline" size={18} color={c.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Add Workout Modal */}
      <Modal visible={showWorkoutModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.bgSecondary, paddingBottom: Math.max(layout.insets.bottom, 20) + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>Catat Workout</Text>
              <TouchableOpacity onPress={() => setShowWorkoutModal(false)}>
                <MaterialIcons name="close" size={24} color={c.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Jenis Olahraga</Text>
              <View style={styles.optionRow}>
                {WORKOUT_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.optionBtn, form.type === t && { backgroundColor: c.green + '22', borderColor: c.green }]}
                    onPress={() => setForm({ ...form, type: t })}
                  >
                    <Text style={[styles.optionText, { color: form.type === t ? c.green : c.textSecondary }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Durasi (menit)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                value={form.duration} onChangeText={v => setForm({ ...form, duration: v })}
                placeholder="30" placeholderTextColor={c.textMuted} keyboardType="numeric"
              />
              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Kalori Terbakar (opsional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                value={form.calories} onChangeText={v => setForm({ ...form, calories: v })}
                placeholder="200" placeholderTextColor={c.textMuted} keyboardType="numeric"
              />
              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Catatan</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                value={form.notes} onChangeText={v => setForm({ ...form, notes: v })}
                placeholder="Catatan workout..." placeholderTextColor={c.textMuted}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: c.border }]} onPress={() => setShowWorkoutModal(false)}>
                  <Text style={{ color: c.textSecondary, fontWeight: '600' }}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: c.green }]} onPress={addWorkout}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Simpan</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Daily Update Modal */}
      <Modal visible={showDailyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.bgSecondary, paddingBottom: Math.max(layout.insets.bottom, 20) + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>Update Data Harian</Text>
              <TouchableOpacity onPress={() => setShowDailyModal(false)}>
                <MaterialIcons name="close" size={24} color={c.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { label: 'Langkah Kaki', key: 'steps', placeholder: '8000', keyboard: 'numeric' as const },
                { label: 'Minum Air (liter)', key: 'water', placeholder: '2.5', keyboard: 'decimal-pad' as const },
                { label: 'Jam Tidur', key: 'sleep', placeholder: '8', keyboard: 'decimal-pad' as const },
                { label: 'Berat Badan (kg)', key: 'weight', placeholder: '65', keyboard: 'decimal-pad' as const },
              ].map(field => (
                <View key={field.key}>
                  <Text style={[styles.inputLabel, { color: c.textSecondary }]}>{field.label}</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                    value={(dailyForm as any)[field.key]}
                    onChangeText={v => setDailyForm({ ...dailyForm, [field.key]: v })}
                    placeholder={field.placeholder}
                    placeholderTextColor={c.textMuted}
                    keyboardType={field.keyboard}
                  />
                </View>
              ))}
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: c.border }]} onPress={() => setShowDailyModal(false)}>
                  <Text style={{ color: c.textSecondary, fontWeight: '600' }}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { backgroundColor: c.green }]} onPress={saveDailyData}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Simpan</Text>
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
  statIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10 },
  statSubLabel: { fontSize: 9, marginTop: 1 },
  card: { borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, paddingHorizontal: 4 },
  editBtnText: { fontSize: 12, fontWeight: '600' },
  dailyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dailyItem: { width: '47%', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, minHeight: 110, justifyContent: 'center' },
  dailyValue: { fontSize: 20, fontWeight: '800', marginTop: 6 },
  dailyLabel: { fontSize: 11, marginTop: 2 },
  workoutRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  workoutIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  workoutType: { fontSize: 14, fontWeight: '700' },
  workoutMeta: { fontSize: 12, marginTop: 2 },
  workoutNotes: { fontSize: 11, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, marginTop: 8 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: { minHeight: 40, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'transparent', justifyContent: 'center' },
  optionText: { fontSize: 12, fontWeight: '600' },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 12, padding: 12, fontSize: 15, borderWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 20 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  submitBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});
