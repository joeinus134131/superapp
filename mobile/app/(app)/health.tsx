import { HeaderText } from '../../components/HeaderText';
import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, StyleSheet, RefreshControl,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { WhenyaHeader } from '../../components/WhenyaHeader';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { MOBILE_SPACING, useMobileLayout } from '../../lib/layout';
import { getToday, formatDate } from '../../lib/helpers';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../../context/languageContext';
import { useRouter } from 'expo-router';

import { useHealth, Workout, DailyHealth } from '../../hooks/useHealth';
import { FloatingActionButton } from '../../components/FloatingActionButton';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';

const WORKOUT_TYPES = ['Run', 'Gym', 'Yoga', 'Swim', 'Cycle', 'HIIT', 'Walk', 'Others'];

const WORKOUT_CATEGORY_MAP: Record<string, string> = {
  run: 'run',
  lari: 'run',
  jogging: 'run',
  gym: 'gym',
  fitness: 'gym',
  workout: 'gym',
  yoga: 'yoga',
  pilates: 'yoga',
  swim: 'swim',
  renang: 'swim',
  swimming: 'swim',
  cycle: 'cycle',
  sepeda: 'cycle',
  bersepeda: 'cycle',
  cycling: 'cycle',
  hiit: 'hiit',
  tabata: 'hiit',
  walk: 'walk',
  jalan: 'walk',
  walking: 'walk',
  strength: 'strength',
  beban: 'strength',
  cardio: 'cardio',
  kardio: 'cardio',
  flexibility: 'flexibility',
  other: 'others',
  others: 'others',
  lainnya: 'others',
  lain: 'others',
};

const WORKOUT_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  run: 'directions-run',
  gym: 'fitness-center',
  strength: 'fitness-center',
  yoga: 'self-improvement',
  flexibility: 'self-improvement',
  swim: 'pool',
  cycle: 'directions-bike',
  hiit: 'bolt',
  cardio: 'favorite',
  walk: 'directions-walk',
  others: 'fitness-center',
};

const getWorkoutDetails = (workout: Workout | any, t: (key: string) => string) => {
  if (workout.exercise && typeof workout.exercise === 'string' && workout.exercise.trim()) {
    const rawType = String(workout.type || '').trim().toLowerCase().replace(/^cat_/, '');
    const normalized = WORKOUT_CATEGORY_MAP[rawType] || 'others';
    return {
      title: workout.exercise.trim(),
      icon: WORKOUT_ICONS[normalized] || 'fitness-center',
    };
  }

  const rawType = String(workout.type || workout.category || '').trim().replace(/^cat_/, '');
  const lower = rawType.toLowerCase();
  const normalized = WORKOUT_CATEGORY_MAP[lower] || lower;
  const icon = WORKOUT_ICONS[normalized] || 'fitness-center';

  const translated = t(`health.cat_${normalized}`);
  if (translated && !translated.startsWith('cat_') && translated !== `health.cat_${normalized}`) {
    return { title: translated, icon };
  }

  const direct = t(`health.cat_${lower}`);
  if (direct && !direct.startsWith('cat_') && direct !== `health.cat_${lower}`) {
    return { title: direct, icon };
  }

  const fallbackTitle = rawType ? rawType.charAt(0).toUpperCase() + rawType.slice(1) : (t('health.cat_others') || 'Lainnya');
  return { title: fallbackTitle, icon };
};

const getWorkoutTypeLabel = (type: string, t: (key: string) => string) => {
  const clean = String(type || '').trim().replace(/^cat_/, '');
  const normalized = WORKOUT_CATEGORY_MAP[clean.toLowerCase()] || clean.toLowerCase();
  const translated = t(`health.cat_${normalized}`);
  if (translated && !translated.startsWith('cat_') && translated !== `health.cat_${normalized}`) {
    return translated;
  }
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : (t('health.cat_others') || 'Lainnya');
};

export default function HealthScreen() {
  const { tx: translateCopy } = useLanguage();
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const today = getToday();
  const layout = useMobileLayout();
  const { t, language } = useLanguage();
  const router = useRouter();

  const {
    workouts, dailyData, dailyHistory, loading, xpToast,
    addWorkout, updateDailyData, refreshHealth
  } = useHealth();

  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showDailyModal, setShowDailyModal] = useState(false);

  const [form, setForm] = useState({ type: 'Run', duration: '', calories: '', notes: '' });
  const [dailyForm, setDailyForm] = useState({ steps: '', water: '', sleep: '', weight: '' });

  const handleAddWorkout = async () => {
    if (!form.duration) return;
    await addWorkout({
      type: form.type,
      duration: parseInt(form.duration) || 0,
      calories: parseInt(form.calories) || 0,
      notes: form.notes,
    });
    setShowWorkoutModal(false);
    setForm({ type: 'Run', duration: '', calories: '', notes: '' });
  };

  const handleSaveDaily = async () => {
    await updateDailyData({
      steps: parseInt(dailyForm.steps) || dailyData.steps,
      water: parseFloat(dailyForm.water) || dailyData.water,
      sleep: parseFloat(dailyForm.sleep) || dailyData.sleep,
      weight: parseFloat(dailyForm.weight) || dailyData.weight,
    });
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

  const getVisibleDays = (count: number) => {
    const days = [];
    for (let i = 0; i < count; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(getToday(d));
    }
    return days.reverse();
  };

  const last7Days = useMemo(() => getVisibleDays(7), []);
  const last30Days = useMemo(() => getVisibleDays(30), []);

  const maxSteps = useMemo(() =>
    Math.max(...last7Days.map(d => dailyHistory[d]?.steps || 0), 8000),
  [last7Days, dailyHistory]);

  const totalCalories = useMemo(() =>
    workouts
      .filter(w => {
        const d = new Date(w.date);
        const now = new Date();
        const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diff <= 7;
      })
      .reduce((s, w) => s + (w.calories || 0), 0),
  [workouts]);

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <WhenyaHeader
        title={t('sidebar.health')}
        subtitle={t('health.subtitle')}
        showBack={router.canGoBack()}
      />

      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshHealth} tintColor={c.purple} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: layout.bottomPadding + 100 }}
      >
        {/* Daily Stats Summary */}
        <View style={styles.metricsGrid}>
          {[
            { label: t('health.steps'), value: dailyData.steps.toLocaleString(), icon: 'directions-walk' as const, color: c.green },
            { label: t('health.water'), value: `${dailyData.water}L`, icon: 'water-drop' as const, color: c.blue },
            { label: t('health.sleep'), value: `${dailyData.sleep}h`, icon: 'bedtime' as const, color: c.purple },
            { label: t('health.weight'), value: `${dailyData.weight}kg`, icon: 'monitor-weight' as const, color: c.orange },
          ].map((m, i) => (
            <Card
              key={i}
              style={styles.metricCard}
              onPress={openDailyModal}
            >
              <View style={[styles.metricIcon, { backgroundColor: m.color + '15' }]}>
                <MaterialIcons name={m.icon} size={22} color={m.color} />
              </View>
              <Text style={[styles.metricValue, { color: c.textPrimary }]}>{m.value}</Text>
              <Text style={[styles.metricLabel, { color: c.textSecondary }]}>{m.label}</Text>
            </Card>
          ))}
        </View>

        {/* 7-Day Step Trend Chart */}
        <Card style={{ marginTop: 10, padding: 24 }}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <MaterialIcons name="bar-chart" size={18} color={c.green} />
              <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t('health.trend_steps')}</Text>
            </View>
            <Badge label={translateCopy("GOAL: 10K")} color={c.green} />
          </View>

          <View style={styles.chartContainer}>
            {last7Days.map(d => {
              const val = dailyHistory[d]?.steps || 0;
              const h = Math.max((val / maxSteps) * 100, 5);
              const isToday = d === today;
              return (
                <View key={d} style={styles.chartBarCol}>
                  <Text style={[styles.chartValText, { color: c.textMuted }]}>{val > 0 ? (val > 999 ? (val/1000).toFixed(1)+'k' : val) : ''}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: `${h}%`, backgroundColor: isToday ? c.green : c.green + '30' }]} />
                  </View>
                  <Text style={[styles.chartDateText, { color: isToday ? c.green : c.textMuted, fontWeight: isToday ? '900' : '600' }]}>{d.split(translateCopy("-"))[2]}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        {/* 30-Day Heatmap */}
        <Card style={{ marginTop: 10, padding: 24 }}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <MaterialIcons name="grid-on" size={18} color={c.blue} />
              <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t('health.hydration_history')}</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.heatmapGrid}>
              {last30Days.map(d => {
                const val = dailyHistory[d]?.water || 0;
                const level = Math.min(val / 3, 1);
                const isToday = d === today;
                return (
                  <View key={d} style={styles.heatCol}>
                    <View style={[
                      styles.heatCell,
                      { backgroundColor: c.bgInput },
                      val > 0 && { backgroundColor: c.blue, opacity: 0.2 + (level * 0.8) },
                      isToday && !val && { borderColor: c.blue, borderWidth: 1, borderStyle: 'dashed' }
                    ]} />
                    <Text style={[styles.heatLabel, { color: isToday ? c.blue : c.textMuted }]}>{d.split(translateCopy("-"))[2]}</Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </Card>

        {/* Workout History */}
        <Card style={{ marginTop: 10, padding: 24 }}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <MaterialIcons name="fitness-center" size={18} color={c.purple} />
              <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t('health.workout_activity')}</Text>
            </View>
            <Badge label={`7H: ${totalCalories} CAL`} color={c.purple} />
          </View>
          {workouts.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="fitness-center" size={40} color={c.textMuted} />
              <Text style={[styles.emptyText, { color: c.textMuted }]}>{t('health.empty_workout')}</Text>
            </View>
          ) : workouts.slice(0, 5).map(w => {
            const details = getWorkoutDetails(w, t);
            return (
              <View key={w.id} style={[styles.workoutItem, { borderBottomColor: c.border + '10' }]}>
                <View style={[styles.workoutIconBox, { backgroundColor: c.bgInput }]}>
                  <MaterialIcons name={details.icon} size={20} color={c.purple} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.workoutName, { color: c.textPrimary }]}>{details.title}</Text>
                  <Text style={[styles.workoutMeta, { color: c.textSecondary }]}>{w.duration} min • {w.calories} cal • {formatDate(w.date, language)}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={c.textMuted} />
              </View>
            );
          })}
        </Card>
      </ScrollView>

      <FloatingActionButton onPress={() => setShowWorkoutModal(true)} />

      {/* Workout Modal */}
      <Modal visible={showWorkoutModal} animationType="slide" transparent onRequestClose={() => setShowWorkoutModal(false)}>
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
                setShowWorkoutModal(false);
              }}
            />
            <View style={[styles.modalContent, { backgroundColor: c.bgSecondary, paddingBottom: Math.max(layout.insets.bottom, 20) + 16 }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{t('health.add_activity')}</Text>
                <TouchableOpacity onPress={() => setShowWorkoutModal(false)}><MaterialIcons name="close" size={24} color={c.textSecondary} /></TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
              <Text style={[styles.inputLabel, { color: c.textSecondary }]}>{t('health.workout_type')}</Text>
              <View style={styles.optionGrid}>
                {WORKOUT_TYPES.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.optionChip, { backgroundColor: c.bgInput, borderColor: c.border }, form.type === type && { backgroundColor: c.green + '20', borderColor: c.green }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setForm({ ...form, type: type }); }}
                  >
                    <Text style={[styles.optionChipText, { color: form.type === type ? c.green : c.textSecondary }]}>{getWorkoutTypeLabel(type, t)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 16, marginTop: 24 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label={t('health.duration')}
                    value={form.duration}
                    onChangeText={v => setForm({ ...form, duration: v })}
                    keyboardType="numeric"
                    placeholder="30"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label={t('health.calories')}
                    value={form.calories}
                    onChangeText={v => setForm({ ...form, calories: v })}
                    keyboardType="numeric"
                    placeholder="200"
                  />
                </View>
              </View>

              <Input
                label={t('health.notes')}
                value={form.notes}
                onChangeText={v => setForm({ ...form, notes: v })}
                placeholder={t('health.notes_placeholder')}
                multiline
                inputStyle={{ height: 80, textAlignVertical: 'top' }}
              />

              <Button
                label={t('health.save_workout')}
                onPress={handleAddWorkout}
                variant="primary"
                style={{ marginTop: 12, height: 60 }}
              />
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Daily Modal */}
      <Modal visible={showDailyModal} animationType="slide" transparent onRequestClose={() => setShowDailyModal(false)}>
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
                setShowDailyModal(false);
              }}
            />
            <View style={[styles.modalContent, { backgroundColor: c.bgSecondary, paddingBottom: Math.max(layout.insets.bottom, 20) + 16 }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{t('health.update_status')}</Text>
                <TouchableOpacity onPress={() => setShowDailyModal(false)}><MaterialIcons name="close" size={24} color={c.textSecondary} /></TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
              <View style={styles.inputGroup}>
                <View style={styles.inputItem}>
                  <Input
                    label={t('health.steps')}
                    value={dailyForm.steps}
                    onChangeText={v => setDailyForm({ ...dailyForm, steps: v })}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={styles.inputItem}>
                  <Input
                    label={`${t('health.water')} (L)`}
                    value={dailyForm.water}
                    onChangeText={v => setDailyForm({ ...dailyForm, water: v })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputItem}>
                  <Input
                    label={`${t('health.sleep')} (h)`}
                    value={dailyForm.sleep}
                    onChangeText={v => setDailyForm({ ...dailyForm, sleep: v })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                </View>
                <View style={styles.inputItem}>
                  <Input
                    label={`${t('health.weight')} (kg)`}
                    value={dailyForm.weight}
                    onChangeText={v => setDailyForm({ ...dailyForm, weight: v })}
                    keyboardType="decimal-pad"
                    placeholder="0"
                  />
                </View>
              </View>

              <Button
                label={t('health.save_daily')}
                onPress={handleSaveDaily}
                variant="primary"
                style={{ marginTop: 12, height: 60 }}
              />
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
  pageHeader: { paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1 },
  backBtn: { flexShrink: 0, width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerIconBox: { flexShrink: 0, width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 28, fontWeight: '900' },
  pageSubtitle: { fontSize: 14, marginTop: 4 },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20, marginBottom: 10 },
  metricCard: { width: '47%', padding: 20 },
  metricIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  metricValue: { fontSize: 24, fontWeight: '900' },
  metricLabel: { fontSize: 12, fontWeight: '700', marginTop: 2 },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  cardTitle: { fontSize: 16, fontWeight: '900' },

  chartContainer: { height: 180, width: '100%', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 10 },
  chartBarCol: { alignItems: 'center', gap: 8, flex: 1 },
  chartValText: { fontSize: 9, fontWeight: '800' },
  barTrack: { height: 120, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  barFill: { width: 14, borderRadius: 7 },
  chartDateText: { fontSize: 10 },

  heatmapGrid: { flexDirection: 'row', gap: 8, paddingBottom: 10 },
  heatCol: { alignItems: 'center', gap: 8 },
  heatCell: { width: 28, height: 28, borderRadius: 8 },
  heatLabel: { fontSize: 9, fontWeight: '800' },

  workoutItem: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16, borderBottomWidth: 1 },
  workoutIconBox: { width: 50, height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  workoutName: { fontSize: 16, fontWeight: '800' },
  workoutMeta: { fontSize: 12, fontWeight: '600', marginTop: 4 },

  emptyState: { alignItems: 'center', paddingVertical: 40, opacity: 0.5 },
  emptyText: { fontSize: 14, fontWeight: '800', marginTop: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingHorizontal: 24, paddingTop: 28, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  modalTitle: { fontSize: 24, fontWeight: '900' },
  inputLabel: { fontSize: 14, fontWeight: '800', marginBottom: 12 },
  inputGroup: { flexDirection: 'row', gap: 16 },
  inputItem: { flex: 1 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  optionChipText: { fontSize: 13, fontWeight: '800' },

  toast: { position: 'absolute', top: 100, alignSelf: 'center', backgroundColor: '#52745a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, zIndex: 1000 },
  toastText: { color: '#fff', fontWeight: '800' },
});
