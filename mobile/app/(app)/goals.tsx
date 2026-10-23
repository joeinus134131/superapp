import { useOpenItem } from '../../hooks/useOpenItem';
import {
  GOAL_TEMPLATES,
  GOAL_TYPE_INFO,
  GOAL_UNITS,
  NUMERIC_GOAL_TYPES,
  addGoalEntry,
  addMonths,
  createGoal,
  formatCompactValue,
  formatGoalValue,
  getGoalSnapshot,
  getJourneyStops,
  getRecoveryOptions,
  goalFromTemplate,
  inferGoalFromTitle,
  isLinkedGoal,
  markCelebrated,
  migrateGoal,
  migrateGoals,
  normalizeGoalCategory,
  parseGoalAmount,
  pendingCelebrations,
  pickNextGoalAction,
  removeGoalEntry,
  setGoalStatus,
  simulateGoal,
  sortGoals,
  toggleGoalMilestone,
  withCachedProgress,
} from '@superapp/shared/goals';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Modal, Alert, StyleSheet, RefreshControl,
  KeyboardAvoidingView, Platform, Keyboard, DeviceEventEmitter,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { WhenyaHeader } from '../../components/WhenyaHeader';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { useMobileLayout } from '../../lib/layout';
import { getData, setData, STORAGE_KEYS } from '../../lib/storage';
import { generateId, formatDate, getToday } from '../../lib/helpers';
import { ensureArray } from '@superapp/shared/helpers';
import { addXP } from '../../lib/gamification';
import { useLanguage } from '../../context/languageContext';
import { useRouter } from 'expo-router';

import { FloatingActionButton } from '../../components/FloatingActionButton';
import { statusAlert } from '../../lib/statusAlert';

interface MilestoneItem {
  id: string;
  text: string;
  done: boolean;
  weight?: number;
  doneAt?: string | null;
}

const GOAL_CATEGORIES = ['finance', 'career', 'health', 'education', 'personal', 'relationship', 'other'];
const CATEGORY_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  career: 'work',
  finance: 'account-balance-wallet',
  health: 'favorite',
  education: 'school',
  personal: 'person',
  relationship: 'people',
  other: 'star',
};

const STATUS_LABELS: Record<string, string> = {
  ahead: 'Lebih cepat',
  on_track: 'Sesuai jadwal',
  behind: 'Tertinggal',
  at_risk: 'Perlu perhatian',
  overdue: 'Lewat tenggat',
  no_deadline: 'Tanpa tenggat',
  paused: 'Dijeda',
  completed: 'Tercapai',
};

const SIMPLE_MODES = [
  { id: 'save', idLabel: 'Tabungan', enLabel: 'Savings', type: 'accumulate', unit: 'IDR', category: 'finance' },
  { id: 'debt', idLabel: 'Cicilan', enLabel: 'Payoff', type: 'payoff', unit: 'IDR', category: 'finance' },
  { id: 'metric', idLabel: 'Target Angka', enLabel: 'Number Target', type: 'increase', unit: 'times', category: 'personal' },
  { id: 'steps', idLabel: 'Tahapan', enLabel: 'Checklist', type: 'milestone', unit: 'custom', category: 'personal' },
];

const QUICK_DELTAS: Record<string, { label: string; enLabel?: string; value: number }[]> = {
  IDR: [
    { label: '+100rb', enLabel: '+100k', value: 100_000 },
    { label: '+500rb', enLabel: '+500k', value: 500_000 },
    { label: '+1jt', enLabel: '+1M', value: 1_000_000 },
  ],
  kg: [
    { label: '-0.5 kg', value: 0.5 },
    { label: '-1 kg', value: 1 },
  ],
  km: [
    { label: '+3 km', value: 3 },
    { label: '+5 km', value: 5 },
  ],
  book: [{ label: '+1', value: 1 }],
  hour: [
    { label: '+1', value: 1 },
    { label: '+2', value: 2 },
  ],
  day: [{ label: '+1', value: 1 }],
  times: [
    { label: '+1', value: 1 },
    { label: '+5', value: 5 },
  ],
  custom: [
    { label: '+1', value: 1 },
    { label: '+5', value: 5 },
  ],
};

function modeFromType(type: string) {
  if (type === 'accumulate') return 'save';
  if (type === 'payoff') return 'debt';
  if (['increase', 'decrease', 'consistency'].includes(type)) return 'metric';
  return 'steps';
}

const getCategoryDetails = (rawCategory: string | undefined, t: (key: string) => string) => {
  const normalized = normalizeGoalCategory(rawCategory);
  const icon = CATEGORY_ICONS[normalized] || 'star';
  const translated = t(`goals.cat_${normalized}`);

  let label = translated;
  if (!translated || translated.startsWith('cat_') || translated === `goals.cat_${normalized}`) {
    const fallbackNames: Record<string, string> = {
      career: 'Karir',
      finance: 'Keuangan',
      health: 'Kesehatan',
      education: 'Pendidikan',
      personal: 'Personal',
      relationship: 'Hubungan',
      other: 'Lainnya',
    };
    label = fallbackNames[normalized] || (rawCategory ? String(rawCategory).replace(/^cat_/, '') : 'Personal');
    label = label.charAt(0).toUpperCase() + label.slice(1);
  }
  return { key: normalized, icon, label };
};

export default function GoalsScreen() {
  const { tx: translateCopy, t, language } = useLanguage();
  const copy = (id: string, en: string) => (language === 'id' ? id : en);
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();
  const router = useRouter();

  const [goals, setGoals] = useState<any[]>([]);
  const [ctxData, setCtxData] = useState<any>({
    habits: [],
    books: [],
    pomodoro: { sessions: [] },
    health: { workouts: [], weights: [] },
    transactions: [],
  });
  const [showModal, setShowModal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editGoal, setEditGoal] = useState<any | null>(null);
  const [filter, setFilter] = useState<'active' | 'completed' | 'archived'>('active');
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [xpToast, setXpToast] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    why: '',
    identity: '',
    category: 'finance',
    type: 'accumulate',
    unit: 'IDR',
    startValue: '0',
    targetValue: '100000000',
    startDate: getToday(),
    targetDate: addMonths(getToday(), 12),
    sourceKind: 'manual',
    milestones: [] as MilestoneItem[],
    futureLetterText: '',
  });
  const [newStep, setNewStep] = useState('');

  const [quickLogGoal, setQuickLogGoal] = useState<any | null>(null);
  const [logForm, setLogForm] = useState({ amount: '', kind: 'add', date: getToday(), note: '' });

  const [detailGoalId, setDetailGoalId] = useState<string | null>(null);
  const [simMonthly, setSimMonthly] = useState('2000000');

  const load = useCallback(async () => {
    const [saved, habits, books, pomodoro, health, transactions] = await Promise.all([
      getData(STORAGE_KEYS.GOALS),
      getData(STORAGE_KEYS.HABITS),
      getData(STORAGE_KEYS.READING),
      getData(STORAGE_KEYS.POMODORO),
      getData(STORAGE_KEYS.HEALTH),
      getData(STORAGE_KEYS.TRANSACTIONS),
    ]);
    const nextCtx = {
      habits: ensureArray(habits),
      books: ensureArray(books),
      pomodoro: pomodoro || { sessions: [] },
      health: health || { workouts: [], weights: [] },
      transactions: ensureArray(transactions),
    };
    const migrated = migrateGoals(ensureArray(saved));
    const full = { ...nextCtx, goals: migrated };
    setCtxData(nextCtx);
    setGoals(migrated.map(g => withCachedProgress(g, full)));
  }, []);

  useEffect(() => {
    load();
    const subscription = DeviceEventEmitter.addListener('whenya:data-synced', load);
    return () => subscription.remove();
  }, [load]);

  const fullCtx = useMemo(() => ({ ...ctxData, goals }), [ctxData, goals]);

  const save = async (nextGoals: any[], celebrateGoalId?: string) => {
    const localCtx = { ...ctxData, goals: nextGoals };
    const normalized: any[] = [];
    for (const raw of nextGoals) {
      let g = migrateGoal(raw);
      const snap = getGoalSnapshot(g, localCtx);
      g = { ...g, progress: snap.percent };
      if (celebrateGoalId && g.id === celebrateGoalId) {
        const newly = pendingCelebrations(g, snap);
        if (newly.length > 0) {
          g = markCelebrated(g, newly);
          const highest = newly[newly.length - 1];
          if (highest === 100) {
            await rewardXP(g.id, 'GOAL_COMPLETE', `${t('goals.success_toast')}`);
          } else {
            await rewardXP(`${g.id}:${highest}`, 'GOAL_CHECKPOINT', `Checkpoint ${highest}%`);
          }
        }
      }
      normalized.push(g);
    }
    await setData(STORAGE_KEYS.GOALS, normalized, true);
    setGoals(normalized);
    DeviceEventEmitter.emit('whenya:goals-updated');
  };

  const rewardXP = async (id: string, action: string = 'GOAL_COMPLETE', label?: string) => {
    try {
      const result = await addXP(action, 1, `goal:${id}`);
      if (result.xpGained > 0) {
        setXpToast(`+${result.xpGained} XP 🏆 ${label || t('goals.success_toast')}`);
        setTimeout(() => setXpToast(null), 3000);
      }
    } catch {
      setXpToast(language === 'id' ? 'Tujuan tersimpan; XP belum tersimpan.' : 'Goal saved; XP could not save.');
    }
  };

  const openAdd = (template?: any) => {
    setEditGoal(null);
    setShowAdvanced(false);
    if (template) {
      const tpl = goalFromTemplate(template, fullCtx);
      setForm({
        title: translateCopy(tpl.title),
        why: translateCopy(tpl.why),
        identity: '',
        category: tpl.category,
        type: tpl.type,
        unit: tpl.unit,
        startValue: String(tpl.startValue ?? 0),
        targetValue: String(tpl.targetValue ?? 0),
        startDate: tpl.startDate || getToday(),
        targetDate: tpl.targetDate || addMonths(getToday(), 12),
        sourceKind: tpl.source?.kind || 'manual',
        milestones: (tpl.milestones || []).map((m: any) => ({ ...m, text: translateCopy(m.text) })),
        futureLetterText: '',
      });
    } else {
      setForm({
        title: '',
        why: '',
        identity: '',
        category: 'finance',
        type: 'accumulate',
        unit: 'IDR',
        startValue: '0',
        targetValue: '100000000',
        startDate: getToday(),
        targetDate: addMonths(getToday(), 12),
        sourceKind: 'manual',
        milestones: [],
        futureLetterText: '',
      });
    }
    setShowModal(true);
  };

  const openEdit = (goal: any) => {
    setEditGoal(goal);
    setShowAdvanced(false);
    setForm({
      title: goal.title || '',
      why: goal.why || goal.description || '',
      identity: goal.identity || '',
      category: normalizeGoalCategory(goal.category),
      type: goal.type || 'milestone',
      unit: goal.unit || 'IDR',
      startValue: String(goal.startValue ?? 0),
      targetValue: String(goal.targetValue ?? 0),
      startDate: goal.startDate || getToday(),
      targetDate: goal.targetDate || goal.deadline || '',
      sourceKind: goal.source?.kind || 'manual',
      milestones: goal.milestones || [],
      futureLetterText: goal.futureLetter?.text || '',
    });
    setShowModal(true);
  };

  const handleSimpleModeSelect = (mode: typeof SIMPLE_MODES[number]) => {
    setForm(prev => ({
      ...prev,
      type: mode.type,
      unit: mode.unit,
      category: mode.category,
      startValue: mode.type === 'payoff' ? (prev.startValue === '0' ? '15000000' : prev.startValue) : '0',
      targetValue: mode.type === 'payoff' ? '0' : mode.unit === 'IDR' ? '100000000' : '12',
    }));
  };

  const handleTitleChange = (nextTitle: string) => {
    const inferred = !editGoal ? inferGoalFromTitle(nextTitle) : null;
    if (inferred) {
      setForm(prev => ({
        ...prev,
        title: nextTitle,
        type: inferred.type,
        unit: inferred.unit,
        category: inferred.category || prev.category,
        startValue: inferred.startValue !== undefined ? String(inferred.startValue) : prev.startValue,
        targetValue: inferred.targetValue !== undefined ? String(inferred.targetValue) : prev.targetValue,
        sourceKind: inferred.source?.kind || prev.sourceKind,
      }));
    } else {
      setForm(prev => ({ ...prev, title: nextTitle }));
    }
  };

  const addStep = () => {
    if (!newStep.trim()) return;
    setForm({
      ...form,
      milestones: [...form.milestones, { id: generateId(), text: newStep.trim(), done: false, weight: 1 }],
    });
    setNewStep('');
  };

  const toggleStep = (id: string) => {
    setForm({
      ...form,
      milestones: form.milestones.map(s => (s.id === id ? { ...s, done: !s.done } : s)),
    });
  };

  useOpenItem(goals, entry => setDetailGoalId(entry.id));

  const handleSubmit = async () => {
    if (!form.title.trim() || saving) return;
    setSaving(true);
    try {
      const isNumeric = NUMERIC_GOAL_TYPES.includes(form.type);
      const parsedStart = isNumeric ? parseGoalAmount(form.startValue) : 0;
      const parsedTarget = isNumeric ? parseGoalAmount(form.targetValue) : 100;

      const payload = {
        title: form.title.trim(),
        why: form.why.trim(),
        description: form.why.trim(),
        identity: form.identity.trim(),
        category: normalizeGoalCategory(form.category),
        type: form.type,
        unit: form.unit,
        startValue: Number.isFinite(parsedStart) ? parsedStart : 0,
        targetValue: Number.isFinite(parsedTarget) ? parsedTarget : 0,
        startDate: form.startDate || getToday(),
        targetDate: form.targetDate || '',
        source: { kind: form.sourceKind || 'manual' },
        milestones: form.milestones,
        futureLetter: form.futureLetterText.trim()
          ? { text: form.futureLetterText.trim(), writtenAt: new Date().toISOString() }
          : null,
      };

      if (editGoal) {
        const updated = goals.map(g =>
          g.id === editGoal.id ? migrateGoal({ ...g, ...payload, updatedAt: new Date().toISOString() }) : g
        );
        await save(updated, editGoal.id);
        statusAlert.success(
          language === 'id' ? 'Target Diperbarui' : 'Goal Updated',
          form.title
        );
      } else {
        const created = createGoal(payload);
        await save([created, ...goals], created.id);
        statusAlert.success(
          language === 'id' ? 'Target Berhasil Dibuat' : 'Goal Created Successfully',
          form.title
        );
      }
      setShowModal(false);
    } catch {
      statusAlert.error(
        language === 'id' ? 'Tujuan Belum Tersimpan' : 'Goal Not Saved',
        language === 'id'
          ? 'Input tetap ada; coba lagi.'
          : 'Your input is preserved; please retry.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Instant 1-tap progress increment directly from the card
  const handleInstantAdd = async (goal: any, deltaValue: number) => {
    const updated = addGoalEntry(goal, {
      amount: deltaValue,
      kind: 'add',
      date: getToday(),
      note: '',
    });
    await addXP('GOAL_LOG');
    await save(goals.map(g => (g.id === goal.id ? updated : g)), goal.id);
    statusAlert.success(
      language === 'id' ? 'Progres Dicatat' : 'Progress Logged',
      `+${deltaValue} • ${copy('+XP diraih!', '+XP earned!')}`
    );
  };

  const openQuickLog = (goal: any, preset?: number) => {
    setQuickLogGoal(goal);
    setLogForm({
      amount: preset !== undefined ? String(preset) : '',
      kind: goal.type === 'decrease' ? 'set' : 'add',
      date: getToday(),
      note: '',
    });
  };

  const handleQuickLogSave = async () => {
    if (!quickLogGoal) return;
    const parsed = parseGoalAmount(logForm.amount);
    if (!Number.isFinite(parsed)) return;
    const updated = addGoalEntry(quickLogGoal, {
      amount: parsed,
      kind: logForm.kind,
      date: logForm.date || getToday(),
      note: logForm.note,
    });
    await addXP('GOAL_LOG');
    await save(goals.map(g => (g.id === quickLogGoal.id ? updated : g)), quickLogGoal.id);
    setQuickLogGoal(null);
    statusAlert.success(
      language === 'id' ? 'Progres Diperbarui' : 'Progress Updated',
      `${quickLogGoal.title}: +${parsed}`
    );
  };

  const deleteGoal = async (id: string) => {
    Alert.alert(t('goals.delete_title'), t('goals.delete_confirm'), [
      { text: t('tasks.cancel'), style: 'cancel' },
      {
        text: t('tasks.delete_btn'),
        style: 'destructive',
        onPress: () => {
          if (detailGoalId === id) setDetailGoalId(null);
          save(goals.filter(g => g.id !== id));
          setShowModal(false);
          statusAlert.info(
            language === 'id' ? 'Target Dihapus' : 'Goal Deleted',
            language === 'id' ? 'Target telah dihapus.' : 'Goal was removed.'
          );
        },
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const activeList = useMemo(
    () => sortGoals(goals.filter(g => !g.archived && !g.completed), fullCtx),
    [goals, fullCtx],
  );
  const filtered = useMemo(() => {
    if (filter === 'archived') return goals.filter(g => g.archived);
    if (filter === 'completed') return goals.filter(g => !g.archived && g.completed);
    return activeList;
  }, [filter, goals, activeList]);

  const nextBest = useMemo(() => pickNextGoalAction(goals, fullCtx), [goals, fullCtx]);
  const detailGoal = useMemo(() => goals.find(g => g.id === detailGoalId) || null, [goals, detailGoalId]);
  const detailSnap = useMemo(
    () => (detailGoal ? getGoalSnapshot(detailGoal, fullCtx) : null),
    [detailGoal, fullCtx],
  );

  const activeSimpleMode = modeFromType(form.type);

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <WhenyaHeader
        title={t('sidebar.goals')}
        subtitle={t('goals.subtitle')}
        showBack={router.canGoBack()}
        tabs={[
          { key: 'active', label: translateCopy('Aktif'), count: activeList.length },
          { key: 'completed', label: translateCopy('Selesai'), count: goals.filter(g => g.completed && !g.archived).length },
          { key: 'archived', label: translateCopy('Arsip'), count: goals.filter(g => g.archived).length },
        ]}
        activeTab={filter}
        onTabChange={(tabKey) => setFilter(tabKey as any)}
      />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.purple} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: layout.bottomPadding + 100 }}
      >
        {/* Next Best Action card */}
        {nextBest && filter === 'active' && (
          <View style={[styles.focusCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.focusOverline, { color: c.green }]}>
                {translateCopy('LANGKAH PALING BERDAMPAK HARI INI')}
              </Text>
              <Text style={[styles.focusTitle, { color: c.textPrimary }]}>{translateCopy(nextBest.goal.title)}</Text>
              <Text style={[styles.focusMeta, { color: c.textSecondary }]}>
                {nextBest.snapshot.isNumeric
                  ? `${formatCompactValue(nextBest.snapshot.current, nextBest.goal.unit, language, translateCopy)} / ${formatCompactValue(nextBest.snapshot.target, nextBest.goal.unit, language, translateCopy)} (${nextBest.snapshot.percent}%)`
                  : `${nextBest.snapshot.percent}%`}
              </Text>
            </View>
            {nextBest.snapshot.isNumeric && !isLinkedGoal(nextBest.goal) ? (
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: c.purple }]}
                onPress={() => openQuickLog(nextBest.goal)}
              >
                <MaterialIcons name="add" size={16} color="#fff" />
                <Text style={styles.smallBtnText}>{translateCopy('Catat')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.smallBtn, { backgroundColor: c.purple }]}
                onPress={() => setDetailGoalId(nextBest.goal.id)}
              >
                <Text style={styles.smallBtnText}>{translateCopy('Buka detail')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 1-click starter strip when empty */}
        {goals.length === 0 && (
          <View style={{ marginBottom: 18 }}>
            <Text style={[styles.sectionHeading, { color: c.textPrimary }]}>
              {translateCopy('Mulai dalam 1 klik')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {GOAL_TEMPLATES.map(tpl => (
                <TouchableOpacity
                  key={tpl.id}
                  style={[styles.tplCard, { backgroundColor: c.bgCard, borderColor: c.border }]}
                  onPress={() => openAdd(tpl)}
                >
                  <Text style={[styles.tplTitle, { color: c.textPrimary }]}>{translateCopy(tpl.title)}</Text>
                  <Text style={[styles.tplMeta, { color: c.textMuted }]}>
                    {tpl.targetValue ? formatCompactValue(tpl.targetValue, tpl.unit, language, translateCopy) : translateCopy('Tahapan')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="track-changes" size={64} color={c.textMuted} />
            <Text style={[styles.emptyText, { color: c.textMuted }]}>{t(`goals.empty_${filter}`)}</Text>
          </View>
        ) : (
          filtered.map(goal => {
            const catInfo = getCategoryDetails(goal.category, t);
            const snap = getGoalSnapshot(goal, fullCtx);
            const statusLabel = translateCopy(STATUS_LABELS[snap.status] || 'Sesuai jadwal');
            const quickChips = (QUICK_DELTAS[goal.unit] || QUICK_DELTAS.custom).slice(0, 2);

            return (
              <TouchableOpacity
                key={goal.id}
                style={[styles.goalCard, { backgroundColor: c.bgCard, borderColor: c.border }]}
                onPress={() => setDetailGoalId(goal.id)}
              >
                <View style={styles.goalHeader}>
                  <View style={[styles.iconBox, { backgroundColor: c.bgInput }]}>
                    <MaterialIcons name={catInfo.icon} size={22} color={c.purple} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.goalTitle, { color: c.textPrimary }]}>{translateCopy(goal.title)}</Text>
                    <Text style={[styles.goalCat, { color: c.textMuted }]}>{catInfo.label}</Text>
                    {goal.why ? (
                      <Text style={[styles.goalWhy, { color: c.textSecondary }]} numberOfLines={1}>
                        {translateCopy(goal.why)}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[styles.badge, { backgroundColor: c.green + '20' }]}>
                    <Text style={[styles.badgeText, { color: c.green }]}>{statusLabel}</Text>
                  </View>
                </View>

                <View style={styles.progressSection}>
                  <View style={styles.progressInfo}>
                    <Text style={[styles.progressLabel, { color: c.textPrimary }]}>
                      {snap.isNumeric
                        ? `${formatCompactValue(snap.current, goal.unit, language, translateCopy)} / ${formatCompactValue(snap.target, goal.unit, language, translateCopy)}`
                        : t('goals.progress_label').replace('{percent}', String(snap.percent))}
                    </Text>
                    <Text style={[styles.progressLabel, { color: c.green }]}>{snap.percent}%</Text>
                  </View>
                  <View style={[styles.progressTrack, { backgroundColor: c.bgInput }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${snap.percent}%`, backgroundColor: goal.completed ? c.green : c.purple },
                      ]}
                    />
                  </View>
                </View>

                {/* Single clean summary line */}
                <Text style={[styles.weekQuotaText, { color: c.textSecondary }]}>
                  {snap.requiredPerMonth !== null
                    ? `${translateCopy('Cukup')} ${formatCompactValue(snap.requiredPerMonth, goal.unit, language, translateCopy)}/${translateCopy('bulan')}`
                    : goal.targetDate
                      ? `${t('goals.target')} ${formatDate(goal.targetDate, language)}`
                      : translateCopy('Ketuk kartu untuk rincian & simulasi')}
                </Text>

                {/* Single action button on card */}
                <View style={styles.cardFooterRow}>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {snap.isNumeric && !isLinkedGoal(goal) && !goal.completed && (
                      <TouchableOpacity
                        style={[styles.smallBtn, { backgroundColor: c.purple }]}
                        onPress={() => openQuickLog(goal)}
                      >
                        <MaterialIcons name="add" size={15} color="#fff" />
                        <Text style={styles.smallBtnText}>{translateCopy('Catat progres')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.outlineBtn, { borderColor: c.border }]}
                    onPress={() => openEdit(goal)}
                  >
                    <MaterialIcons name="edit" size={15} color={c.textSecondary} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <FloatingActionButton onPress={() => openAdd()} />

      {/* Quick Log Modal — Clean, Icon-Free, Structured */}
      <Modal visible={!!quickLogGoal} animationType="fade" transparent onRequestClose={() => setQuickLogGoal(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setQuickLogGoal(null)} />
            <View style={[styles.modalContent, { backgroundColor: c.bgSecondary, paddingBottom: 28 }]}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: c.textPrimary }]}>
                    {copy('Update Progres', 'Update Progress')}
                  </Text>
                  {quickLogGoal && (
                    <Text style={{ color: c.textSecondary, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                      {translateCopy(quickLogGoal.title)}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setQuickLogGoal(null)} style={styles.textCloseBtn}>
                  <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '700' }}>
                    {copy('Tutup', 'Close')}
                  </Text>
                </TouchableOpacity>
              </View>

              {quickLogGoal && (
                <>
                  <View style={styles.chipWrapRow}>
                    {(QUICK_DELTAS[quickLogGoal.unit] || QUICK_DELTAS.custom).map(chip => (
                      <TouchableOpacity
                        key={chip.label}
                        style={[styles.cleanChip, { borderColor: c.border, backgroundColor: c.bgInput }]}
                        onPress={() => setLogForm(prev => ({ ...prev, kind: 'add', amount: String(chip.value) }))}
                      >
                        <Text style={{ color: c.textPrimary, fontSize: 12, fontWeight: '700' }}>
                          {language === 'id' ? chip.label : (chip.enLabel || chip.label)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={[styles.inputLabel, { color: c.textSecondary }]}>
                      {copy('Jumlah', 'Amount')}
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                      value={logForm.amount}
                      onChangeText={v => setLogForm({ ...logForm, amount: v })}
                      placeholder={copy('Contoh: 500rb', 'e.g. 500000')}
                      placeholderTextColor={c.textMuted}
                    />
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={[styles.inputLabel, { color: c.textSecondary }]}>
                      {copy('Catatan', 'Note')}
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                      value={logForm.note}
                      onChangeText={v => setLogForm({ ...logForm, note: v })}
                      placeholder={copy('Opsional', 'Optional')}
                      placeholderTextColor={c.textMuted}
                    />
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.secondaryModalBtn, { borderColor: c.border }]}
                      onPress={() => setQuickLogGoal(null)}
                    >
                      <Text style={{ color: c.textPrimary, fontWeight: '700', fontSize: 14 }}>
                        {copy('Batal', 'Cancel')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.submitBtn, { backgroundColor: c.purple }]}
                      onPress={handleQuickLogSave}
                    >
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                        {copy('Simpan', 'Save')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Detail / Update Goal Sheet Modal — Clean, Icon-Free, Structured */}
      <Modal visible={!!detailGoal} animationType="slide" transparent onRequestClose={() => setDetailGoalId(null)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setDetailGoalId(null)} />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: c.bgSecondary, paddingBottom: Math.max(layout.insets.bottom, 20) + 16 },
            ]}
          >
            {detailGoal && detailSnap && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{translateCopy(detailGoal.title)}</Text>
                    <Text style={{ color: c.textSecondary, fontWeight: '600', fontSize: 13, marginTop: 4 }}>
                      {detailSnap.isNumeric
                        ? `${formatGoalValue(detailSnap.current, detailGoal.unit, language, translateCopy)} / ${formatGoalValue(detailSnap.target, detailGoal.unit, language, translateCopy)} (${detailSnap.percent}%)`
                        : `${detailSnap.percent}% · ${translateCopy(STATUS_LABELS[detailSnap.status] || 'Sesuai jadwal')}`}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setDetailGoalId(null)} style={styles.textCloseBtn}>
                    <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '700' }}>
                      {copy('Tutup', 'Close')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24, gap: 16 }}>
                  {detailGoal.why ? (
                    <Text style={{ color: c.textSecondary, fontSize: 13 }}>
                      {translateCopy(detailGoal.why)}
                    </Text>
                  ) : null}

                  {/* Clean Progress Bar + 4 Checkpoints */}
                  <View style={[styles.cleanSectionBox, { backgroundColor: c.bgInput, borderColor: c.border }]}>
                    <View style={[styles.progressTrack, { backgroundColor: c.border, marginBottom: 12 }]}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${detailSnap.percent}%`, backgroundColor: detailGoal.completed ? c.green : c.purple },
                        ]}
                      />
                    </View>
                    <View style={styles.checkpointPlainRow}>
                      {getJourneyStops(detailGoal, detailSnap).map((stop: any) => (
                        <Text
                          key={stop.percent}
                          style={{
                            fontSize: 11,
                            fontWeight: stop.reached ? '800' : '600',
                            color: stop.reached ? c.green : c.textMuted,
                          }}
                        >
                          {stop.percent}%
                        </Text>
                      ))}
                    </View>
                  </View>

                  {detailSnap.isNumeric && (() => {
                    const sim = simulateGoal({
                      current: detailSnap.current,
                      target: detailSnap.target,
                      start: detailSnap.start,
                      perMonth: parseGoalAmount(simMonthly) || 0,
                      annualReturn: detailGoal.unit === 'IDR' && detailGoal.type === 'accumulate' ? 6 : 0,
                    });
                    const recovery = getRecoveryOptions(detailGoal, detailSnap);

                    return (
                      <View style={[styles.cleanSectionBox, { backgroundColor: c.bgInput, borderColor: c.border }]}>
                        <Text style={[styles.inputLabel, { color: c.textSecondary }]}>
                          {copy('Target per bulan', 'Monthly target')}
                        </Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: c.bgSecondary, color: c.textPrimary, borderColor: c.border }]}
                          value={simMonthly}
                          onChangeText={setSimMonthly}
                          placeholder={copy('Contoh: 2jt', 'e.g. 2000000')}
                          placeholderTextColor={c.textMuted}
                        />
                        {sim.reachable && (
                          <Text style={{ color: c.green, fontWeight: '700', fontSize: 12, marginTop: 8 }}>
                            {sim.months === 0
                              ? translateCopy('Target sudah tercapai!')
                              : translateCopy('Tercapai dalam {0} bulan ({1})', [
                                  sim.months,
                                  formatDate(sim.date, language),
                                ])}
                          </Text>
                        )}

                        {recovery && (recovery.extendTo || recovery.reduceTargetTo !== null) && (
                          <View style={{ marginTop: 12, gap: 6 }}>
                            <Text style={{ color: c.textSecondary, fontSize: 11, fontWeight: '700' }}>
                              {copy('Sesuaikan jadwal', 'Adjust schedule')}
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                              {recovery.extendTo && (
                                <TouchableOpacity
                                  style={[styles.cleanChip, { borderColor: c.border, backgroundColor: c.bgSecondary }]}
                                  onPress={() =>
                                    save(
                                      goals.map(g =>
                                        g.id === detailGoal.id ? { ...g, targetDate: recovery.extendTo } : g
                                      )
                                    )
                                  }
                                >
                                  <Text style={{ color: c.textPrimary, fontSize: 12, fontWeight: '600' }}>
                                    {translateCopy('Geser tenggat ke {0}', [formatDate(recovery.extendTo, language)])}
                                  </Text>
                                </TouchableOpacity>
                              )}
                              {recovery.reduceTargetTo !== null && (
                                <TouchableOpacity
                                  style={[styles.cleanChip, { borderColor: c.border, backgroundColor: c.bgSecondary }]}
                                  onPress={() =>
                                    save(
                                      goals.map(g =>
                                        g.id === detailGoal.id ? { ...g, targetValue: recovery.reduceTargetTo } : g
                                      )
                                    )
                                  }
                                >
                                  <Text style={{ color: c.textPrimary, fontSize: 12, fontWeight: '600' }}>
                                    {translateCopy('Sesuaikan target ke {0}', [
                                      formatCompactValue(recovery.reduceTargetTo, detailGoal.unit, language, translateCopy),
                                    ])}
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })()}

                  {(detailGoal.milestones || []).length > 0 && (
                    <View style={{ gap: 8 }}>
                      <Text style={[styles.inputLabel, { color: c.textSecondary, marginBottom: 0 }]}>
                        {copy('Tahapan', 'Steps')}
                      </Text>
                      {(detailGoal.milestones || []).map((ms: any) => (
                        <TouchableOpacity
                          key={ms.id}
                          style={[styles.cleanListRow, { borderColor: c.border, backgroundColor: c.bgInput }]}
                          onPress={() =>
                            save(
                              goals.map(g => (g.id === detailGoal.id ? toggleGoalMilestone(g, ms.id) : g)),
                              detailGoal.id,
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.stepText,
                              { color: c.textPrimary },
                              ms.done && { textDecorationLine: 'line-through', opacity: 0.55 },
                            ]}
                          >
                            {translateCopy(ms.text)}
                          </Text>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: ms.done ? c.green : c.textMuted }}>
                            {ms.done ? translateCopy('Selesai') : copy('Belum', 'Pending')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {detailSnap.isNumeric && (detailGoal.entries || []).length > 0 && (
                    <View style={{ gap: 8 }}>
                      <Text style={[styles.inputLabel, { color: c.textSecondary, marginBottom: 0 }]}>
                        {copy('Riwayat', 'History')}
                      </Text>
                      {[...(detailGoal.entries || [])].reverse().slice(0, 10).map((entry: any) => (
                        <View
                          key={entry.id}
                          style={[styles.cleanListRow, { borderColor: c.border, backgroundColor: c.bgInput }]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontWeight: '700', fontSize: 13, color: c.textPrimary }}>
                              {entry.kind === 'set' ? '= ' : '+ '}
                              {formatGoalValue(entry.amount, detailGoal.unit, language, translateCopy)}
                            </Text>
                            <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>
                              {entry.date}
                              {entry.note ? ` · ${entry.note}` : ''}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={() =>
                              save(goals.map(g => (g.id === detailGoal.id ? removeGoalEntry(g, entry.id) : g)))
                            }
                            style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                          >
                            <Text style={{ color: c.red, fontSize: 12, fontWeight: '700' }}>
                              {copy('Hapus', 'Delete')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.secondaryModalBtn, { borderColor: c.border }]}
                      onPress={() => {
                        const target = detailGoal;
                        setDetailGoalId(null);
                        openEdit(target);
                      }}
                    >
                      <Text style={{ color: c.textPrimary, fontWeight: '700', fontSize: 14 }}>
                        {copy('Edit', 'Edit')}
                      </Text>
                    </TouchableOpacity>
                    {detailSnap.isNumeric && !isLinkedGoal(detailGoal) && !detailGoal.completed && (
                      <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: c.purple }]}
                        onPress={() => {
                          const target = detailGoal;
                          setDetailGoalId(null);
                          openQuickLog(target);
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                          {copy('Update Progres', 'Update Progress')}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {!detailGoal.completed && (
                      <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: c.green }]}
                        onPress={async () => {
                          await save(
                            goals.map(g => (g.id === detailGoal.id ? setGoalStatus(g, 'completed') : g)),
                            detailGoal.id,
                          );
                          setDetailGoalId(null);
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                          {translateCopy('Selesai')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Clean, Structured, Icon-Free Create / Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => {
                Keyboard.dismiss();
                setShowModal(false);
              }}
            />
            <View
              style={[
                styles.modalContent,
                { backgroundColor: c.bgSecondary, paddingBottom: Math.max(layout.insets.bottom, 20) + 16 },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: c.textPrimary }]}>
                  {editGoal ? copy('Edit Tujuan', 'Edit Goal') : copy('Tujuan Baru', 'New Goal')}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)} style={styles.textCloseBtn}>
                  <Text style={{ color: c.textSecondary, fontSize: 13, fontWeight: '700' }}>
                    {copy('Tutup', 'Close')}
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 28, gap: 16 }}
              >
                {/* 1. Jenis Tujuan (4 clean text pills, no icons/emojis) */}
                <View>
                  <Text style={[styles.inputLabel, { color: c.textSecondary }]}>
                    {copy('Jenis', 'Type')}
                  </Text>
                  <View style={styles.modeGrid}>
                    {SIMPLE_MODES.map(mode => {
                      const selected = activeSimpleMode === mode.id;
                      return (
                        <TouchableOpacity
                          key={mode.id}
                          style={[
                            styles.modeBtn,
                            { borderColor: c.border, backgroundColor: c.bgInput },
                            selected && { borderColor: c.purple, backgroundColor: c.purple + '15' },
                          ]}
                          onPress={() => handleSimpleModeSelect(mode)}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: selected ? '800' : '600',
                              color: selected ? c.purple : c.textPrimary,
                              textAlign: 'center',
                              flex: 1,
                            }}
                          >
                            {language === 'id' ? mode.idLabel : mode.enLabel}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* 2. Nama Tujuan */}
                <View>
                  <Text style={[styles.inputLabel, { color: c.textSecondary }]}>
                    {copy('Nama tujuan', 'Goal name')}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                    value={form.title}
                    onChangeText={handleTitleChange}
                    placeholder={copy('Contoh: Dana Darurat 30jt', 'e.g. Emergency Fund')}
                    placeholderTextColor={c.textMuted}
                  />
                </View>

                {/* 3. Target Angka / Nominal */}
                {NUMERIC_GOAL_TYPES.includes(form.type) && (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {(form.type === 'payoff' || form.type === 'decrease') && (
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inputLabel, { color: c.textSecondary }]}>
                          {copy('Nilai awal', 'Starting value')}
                        </Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                          value={form.startValue}
                          onChangeText={v => setForm({ ...form, startValue: v })}
                          placeholder={copy('20jt', '20M')}
                          placeholderTextColor={c.textMuted}
                        />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.inputLabel, { color: c.textSecondary }]}>
                        {copy('Target', 'Target')}
                      </Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                        value={form.targetValue}
                        onChangeText={v => setForm({ ...form, targetValue: v })}
                        placeholder={copy('100jt', '100M')}
                        placeholderTextColor={c.textMuted}
                      />
                    </View>
                  </View>
                )}

                {/* 4. Batas Waktu */}
                <View>
                  <Text style={[styles.inputLabel, { color: c.textSecondary }]}>
                    {copy('Batas waktu', 'Timeline')}
                  </Text>
                  <View style={styles.chipWrapRow}>
                    {[
                      { label: '3 Bulan', months: 3 },
                      { label: '6 Bulan', months: 6 },
                      { label: '1 Tahun', months: 12 },
                      { label: '2 Tahun', months: 24 },
                    ].map(opt => {
                      const expectedDate = addMonths(getToday(), opt.months);
                      const active = form.targetDate === expectedDate;
                      return (
                        <TouchableOpacity
                          key={opt.label}
                          style={[
                            styles.cleanChip,
                            { borderColor: c.border, backgroundColor: c.bgInput },
                            active && { borderColor: c.purple, backgroundColor: c.purple + '15' },
                          ]}
                          onPress={() => setForm(prev => ({ ...prev, targetDate: expectedDate }))}
                        >
                          <Text
                            style={{
                              color: active ? c.purple : c.textPrimary,
                              fontSize: 12,
                              fontWeight: active ? '800' : '600',
                            }}
                          >
                            {translateCopy(opt.label)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {activeSimpleMode === 'steps' && (
                  <View style={{ gap: 8 }}>
                    <Text style={[styles.inputLabel, { color: c.textSecondary, marginBottom: 0 }]}>
                      {copy('Daftar tahapan', 'Steps')}
                    </Text>
                    <View style={styles.journeyInput}>
                      <TextInput
                        style={[
                          styles.input,
                          { flex: 1, backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border },
                        ]}
                        value={newStep}
                        onChangeText={setNewStep}
                        placeholder={copy('Tulis langkah…', 'Add a step…')}
                        placeholderTextColor={c.textMuted}
                      />
                      <TouchableOpacity
                        style={[styles.textActionBtn, { backgroundColor: c.purple }]}
                        onPress={addStep}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                          {copy('Tambah', 'Add')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {form.milestones.map(step => (
                      <TouchableOpacity
                        key={step.id}
                        style={[styles.cleanListRow, { borderColor: c.border, backgroundColor: c.bgInput }]}
                        onPress={() => toggleStep(step.id)}
                      >
                        <Text
                          style={[
                            styles.stepText,
                            { color: c.textPrimary },
                            step.done && { textDecorationLine: 'line-through', opacity: 0.55 },
                          ]}
                        >
                          {step.text}
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: step.done ? c.green : c.textMuted }}>
                          {step.done ? translateCopy('Selesai') : copy('Belum', 'Pending')}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Collapsible Extra Details */}
                <TouchableOpacity
                  style={{ paddingVertical: 4 }}
                  onPress={() => setShowAdvanced(!showAdvanced)}
                >
                  <Text style={{ color: c.textSecondary, fontWeight: '700', fontSize: 12 }}>
                    {showAdvanced
                      ? copy('Sembunyikan detail tambahan', 'Hide extra details')
                      : copy('Detail tambahan (opsional)', 'Extra details (optional)')}
                  </Text>
                </TouchableOpacity>

                {showAdvanced && (
                  <View style={{ gap: 14 }}>
                    {NUMERIC_GOAL_TYPES.includes(form.type) && activeSimpleMode === 'metric' && (
                      <View>
                        <Text style={[styles.inputLabel, { color: c.textSecondary }]}>
                          {copy('Satuan', 'Unit')}
                        </Text>
                        <View style={styles.chipWrapRow}>
                          {GOAL_UNITS.map(u => {
                            const selected = form.unit === u.id;
                            return (
                              <TouchableOpacity
                                key={u.id}
                                style={[
                                  styles.cleanChip,
                                  { borderColor: c.border, backgroundColor: c.bgInput },
                                  selected && { backgroundColor: c.purple + '15', borderColor: c.purple },
                                ]}
                                onPress={() => setForm({ ...form, unit: u.id })}
                              >
                                <Text style={{ fontSize: 12, fontWeight: '700', color: selected ? c.purple : c.textSecondary }}>
                                  {translateCopy(u.label)}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    <View>
                      <Text style={[styles.inputLabel, { color: c.textSecondary }]}>
                        {copy('Catatan / alasan singkat', 'Short note')}
                      </Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                        value={form.why}
                        onChangeText={v => setForm({ ...form, why: v })}
                        placeholder={copy('Opsional', 'Optional')}
                        placeholderTextColor={c.textMuted}
                      />
                    </View>

                    <View>
                      <Text style={[styles.inputLabel, { color: c.textSecondary }]}>
                        {copy('Kategori', 'Category')}
                      </Text>
                      <View style={styles.chipWrapRow}>
                        {GOAL_CATEGORIES.map(cat => {
                          const isSelected = normalizeGoalCategory(form.category) === cat;
                          return (
                            <TouchableOpacity
                              key={cat}
                              style={[
                                styles.cleanChip,
                                { borderColor: c.border, backgroundColor: c.bgInput },
                                isSelected && { backgroundColor: c.purple + '15', borderColor: c.purple },
                              ]}
                              onPress={() => setForm({ ...form, category: cat })}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? c.purple : c.textSecondary }}>
                                {t(`goals.cat_${cat}`)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                )}

                <View style={styles.modalActions}>
                  {editGoal && (
                    <>
                      <TouchableOpacity
                        accessibilityRole="button"
                        style={[styles.secondaryModalBtn, { borderColor: c.border }]}
                        onPress={async () => {
                          await save(
                            goals.map(goal =>
                              goal.id === editGoal.id
                                ? setGoalStatus(goal, goal.archived ? 'active' : 'archived')
                                : goal
                            )
                          );
                          setShowModal(false);
                        }}
                      >
                        <Text style={{ color: c.textPrimary, fontSize: 13, fontWeight: '700' }}>
                          {editGoal.archived ? copy('Pulihkan', 'Restore') : copy('Arsipkan', 'Archive')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.secondaryModalBtn, { borderColor: c.red }]}
                        onPress={() => deleteGoal(editGoal.id)}
                      >
                        <Text style={{ color: c.red, fontSize: 13, fontWeight: '700' }}>
                          {copy('Hapus', 'Delete')}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: c.purple }]}
                    disabled={saving}
                    onPress={handleSubmit}
                  >
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                      {editGoal ? copy('Simpan', 'Save') : copy('Simpan Tujuan', 'Save Goal')}
                    </Text>
                  </TouchableOpacity>
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
  focusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  focusOverline: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  focusTitle: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  focusMeta: { fontSize: 12, marginTop: 2 },
  sectionHeading: { fontSize: 16, fontWeight: '800' },
  tplCard: {
    width: 175,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 10,
  },
  tplTitle: { fontSize: 14, fontWeight: '800' },
  tplMeta: { fontSize: 11, marginTop: 4 },
  goalCard: { borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1 },
  goalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  iconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  goalTitle: { fontSize: 17, fontWeight: '800' },
  goalCat: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  goalWhy: { fontSize: 12, marginTop: 3 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  progressSection: { marginBottom: 8 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 13, fontWeight: '800' },
  progressTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  weekQuotaText: { fontSize: 12, marginTop: 4, fontWeight: '600' },
  cardFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  smallBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  outlineBtnText: { fontSize: 12, fontWeight: '600' },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeBtn: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkpointRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
  },
  checkpointStop: { alignItems: 'center', gap: 4 },
  checkpointDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },
  empty: { alignItems: 'center', paddingVertical: 70, opacity: 0.5 },
  emptyText: { fontSize: 15, fontWeight: '700', marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 22, paddingTop: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 20, fontWeight: '900' },
  inputLabel: { fontSize: 12, fontWeight: '800', marginBottom: 6 },
  input: { borderRadius: 14, padding: 13, fontSize: 15, borderWidth: 1 },
  catRow: { flexDirection: 'row', gap: 10 },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  catBtnText: { fontSize: 12, fontWeight: '700' },
  journeyInput: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  addBtn: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(150,150,150,0.06)',
  },
  stepText: { flex: 1, fontSize: 13, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18, alignItems: 'center' },
  deleteBtn: { width: 50, height: 50, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  submitBtn: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  secondaryModalBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCloseBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipWrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cleanChip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  fieldBlock: {
    marginTop: 14,
  },
  cleanSectionBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  checkpointPlainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cleanListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  textActionBtn: {
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toast: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: '#193f30',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 18,
    zIndex: 1000,
  },
  toastText: { color: '#fff', fontWeight: '800' },
});
