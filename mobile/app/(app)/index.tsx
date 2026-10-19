import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, Dimensions, useWindowDimensions, DeviceEventEmitter, Image, Animated as RNAnimated, Easing, Modal
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, { Circle, G, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../context/themeContext';
import { useTasks, Task } from '../../hooks/useTasks';
import { useAIInsights } from '../../hooks/useAIInsights';
import { registerForPushNotificationsAsync, sendImmediateNotification } from '../../lib/notifications';
import { FloatingActionButton } from '../../components/FloatingActionButton';
import { useColors } from '../../lib/theme';
import { useLanguage } from '../../context/languageContext';
import { MOBILE_SPACING, getTwoColumnCardWidth, useMobileLayout } from '../../lib/layout';
import { getData, setData, STORAGE_KEYS } from '../../lib/storage';
import { EncryptedStorage } from '../../lib/secureStorage';
import { greetingTime, getToday, formatCurrency } from '../../lib/helpers';
import { getXP, getCurrentLevel, getXPProgress, checkDailyLogin, addXP } from '../../lib/gamification';
import { BrandLogo } from '../../components/BrandLogo';
import { RadarChart } from '../../components/RadarChart';
import { DailyQuestCard } from '../../components/DailyQuestCard';
import { LevelUpModal } from '../../components/LevelUpModal';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { QuickCaptureModal } from '../../components/QuickCaptureModal';
import { CrossModuleInsights } from '../../components/CrossModuleInsights';
import { useSettings } from '../../context/settingsContext';
import { useAuth } from '../../hooks/useAuth';

export default function DashboardScreen() {
  const { tx: translateCopy } = useLanguage();
  const { language: uiLanguage } = useLanguage();

  const { isDark } = useTheme();
  const c = useColors(isDark);
  const { t, language } = useLanguage();
  const { settings, updateSetting } = useSettings();
  const { user } = useAuth();
  const router = useRouter();
  const today = getToday();
  const layout = useMobileLayout();
  const { width: screenWidth } = useWindowDimensions();
  const columnWidth = getTwoColumnCardWidth(screenWidth);

  const [refreshing, setRefreshing] = useState(false);
  const [gamData, setGamData] = useState({ totalXP: 0 });
  const [habitsList, setHabitsList] = useState<any[]>([]);
  const [goalsList, setGoalsList] = useState<any[]>([]);
  const [stats, setStats] = useState({
    tasksCompleted: 0, tasksTotal: 0,
    habitsToday: 0, habitsTotal: 0,
    streak: 0, totalIncome: 0, totalExpense: 0,
    focusSessions: 0, goalsActive: 0,
    booksReading: 0, journalEntries: 0,
    workoutsThisWeek: 0,
  });
  const { tasks, loading, xpToast, addTask, updateTask, deleteTask, moveTask, refreshTasks } = useTasks();
  const { insights, loading: loadingInsights, refreshInsights } = useAIInsights();

  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<any>(null);
  const [newLevelData, setNewLevelData] = useState<any>(null);
  const [emergencyStep, setEmergencyStep] = useState<'menu' | 'mission'>('menu');
  const [selectedEmergency, setSelectedEmergency] = useState<any>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showDNAModal, setShowDNAModal] = useState(false);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;

  useEffect(() => {
    RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        RNAnimated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const loadData = useCallback(async () => {
    const [habits, transactions, pomodoro, goals, books, journal, health, xp] = await Promise.all([
      getData(STORAGE_KEYS.HABITS),
      EncryptedStorage.getItem(STORAGE_KEYS.TRANSACTIONS),
      getData(STORAGE_KEYS.POMODORO),
      getData(STORAGE_KEYS.GOALS),
      getData(STORAGE_KEYS.READING),
      getData(STORAGE_KEYS.JOURNAL),
      getData(STORAGE_KEYS.HEALTH),
      getXP(),
    ]);

    const taskList = tasks || [];
    const habitList = Array.isArray(habits) ? habits : [];
    setHabitsList(habitList);
    const tx = Array.isArray(transactions) ? transactions : [];
    const p = pomodoro || { sessions: [] };
    const g = Array.isArray(goals) ? goals : [];
    setGoalsList(g);
    const b = Array.isArray(books) ? books : [];
    const j = Array.isArray(journal) ? journal : [];
    const hl = health || { workouts: [] };

    const completedTasks = taskList.filter((x: any) => x.status === 'done').length;
    const todayHabits = habitList.filter((x: any) => x.completedDates?.includes(today)).length;
    let maxStreak = 0;
    habitList.forEach((x: any) => { if (x.streak && x.streak > maxStreak) maxStreak = x.streak; });
    const income = tx.filter((x: any) => x.type === 'income').reduce((s: number, x: any) => s + x.amount, 0);
    const expense = tx.filter((x: any) => x.type === 'expense').reduce((s: number, x: any) => s + x.amount, 0);
    const todaySessions = p.sessions?.filter((s: any) => s.date === today).length || 0;
    const activeGoals = g.filter((x: any) => !x.completed && !x.archived).length;
    const readingBooks = b.filter((x: any) => x.status === 'reading').length;
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const workoutsWeek = hl.workouts?.filter((w: any) => new Date(w.date) >= weekAgo).length || 0;

    setStats({
      tasksCompleted: completedTasks, tasksTotal: taskList.length,
      habitsToday: todayHabits, habitsTotal: habitList.length,
      streak: maxStreak, totalIncome: income, totalExpense: expense,
      focusSessions: todaySessions, goalsActive: activeGoals,
      booksReading: readingBooks, journalEntries: j.length,
      workoutsThisWeek: workoutsWeek,
    });
    setGamData(xp);
    RNAnimated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, [today, tasks]);

  const toggleHabitToday = async (habitId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = habitsList.map((h: any) => {
      if (h.id !== habitId) return h;
      const dates = Array.isArray(h.completedDates) ? [...h.completedDates] : [];
      const isDone = dates.includes(today);
      const newDates = isDone ? dates.filter((d: string) => d !== today) : [...dates, today];
      const newStreak = isDone ? Math.max(0, (h.streak || 1) - 1) : (h.streak || 0) + 1;
      if (!isDone) {
        handleAddXP('HABIT_COMPLETE');
      }
      return { ...h, completedDates: newDates, streak: newStreak };
    });
    setHabitsList(updated);
    await setData(STORAGE_KEYS.HABITS, updated);
    const todayCount = updated.filter((h: any) => h.completedDates?.includes(today)).length;
    setStats(prev => ({
      ...prev,
      habitsToday: todayCount,
      habitsTotal: updated.length,
      streak: Math.max(...updated.map((h: any) => h.streak || 0), 0),
    }));
  };

  const handleAddXP = async (action: string) => {
    const result = await addXP(action);
    setGamData({ totalXP: result.totalXP });

    // Sync to cloud immediately so leaderboard is updated
    const { SyncService } = require('../../lib/syncService');
    SyncService.runSync().catch((e: any) => console.warn('[Sync] XP sync failed:', e));

    if (result.levelUp) {
      setNewLevelData(result.newLevel);
      setShowLevelUpModal(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };


  useEffect(() => {
    loadData();
    checkDailyLogin();
    registerForPushNotificationsAsync();
    const subscription = DeviceEventEmitter.addListener('whenya:data-synced', loadData);
    return () => subscription.remove();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), refreshTasks(), refreshInsights(true)]);
    setRefreshing(false);
  };

  const level = getCurrentLevel(gamData.totalXP);
  const progress = getXPProgress(gamData.totalXP);

  const dnaData = [
    { label: 'MIND', value: Math.min((stats.focusSessions / 4) * 100, 100) || 20 },
    { label: 'BODY', value: Math.min(((stats.workoutsThisWeek / 3) * 50 + (stats.habitsToday / (stats.habitsTotal || 1)) * 50), 100) || 20 },
    { label: 'MONEY', value: stats.totalIncome > 0 ? Math.min((1 - stats.totalExpense / stats.totalIncome) * 100, 100) : 50 },
    { label: 'SOUL', value: Math.min((stats.journalEntries / 10) * 100, 100) || 20 },
    { label: 'GROWTH', value: Math.min(((stats.goalsActive / 3) * 50 + (stats.tasksCompleted / (stats.tasksTotal || 1)) * 50), 100) || 20 },
    { label: 'SOCIAL', value: Math.min((stats.streak / 21) * 100, 100) || 20 },
  ];

  const quickActions = [
    { label: t('sidebar.tasks'), icon: 'checklist' as const, route: '/tasks', color: c.purple },
    { label: t('sidebar.habits'), icon: 'local-fire-department' as const, route: '/habits', color: c.green },
    { label: t('sidebar.social'), icon: 'people' as const, route: '/social', color: c.purple },
    { label: t('sidebar.pomodoro'), icon: 'timer' as const, route: '/pomodoro', color: c.cyan },
    { label: t('sidebar.finance'), icon: 'account-balance-wallet' as const, route: '/finance', color: '#10b981' },
    { label: t('sidebar.goals'), icon: 'flag' as const, route: '/goals', color: '#f59e0b' },
    { label: t('sidebar.reading'), icon: 'menu-book' as const, route: '/reading', color: '#52745a' },
    { label: t('sidebar.health'), icon: 'fitness-center' as const, route: '/health', color: '#ef4444' },
    { label: t('sidebar.journal'), icon: 'create' as const, route: '/journal', color: '#ec4899' },
  ];

  const displayName = user?.name ? user.name.split(' ')[0] : 'Sahabat';
  const openTasks = (tasks || []).filter((task: any) => task.status !== 'done');
  const displayTasks = openTasks.slice(0, 4);
  const dateLabel = new Intl.DateTimeFormat(uiLanguage === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());

  // Real Weekly Days & Completion Rate
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Sen, 6 = Min
  const monday = new Date(now);
  monday.setDate(now.getDate() - dayOfWeek);

  const dayNames = [translateCopy("Sen"), translateCopy("Sel"), translateCopy("Rab"), translateCopy("Kam"), translateCopy("Jum"), translateCopy("Sab"), translateCopy("Min")];
  const weeklyDays = dayNames.map((name, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    const dateStr = d.toISOString().split('T')[0];
    const isCurrentDay = dateStr === today;

    let pct = 0;
    if (habitsList.length > 0) {
      const doneCount = habitsList.filter((h: any) => h.completedDates?.includes(dateStr)).length;
      pct = Math.round((doneCount / habitsList.length) * 100);
    } else if (tasks && tasks.length > 0) {
      const doneTasks = tasks.filter((t: any) => t.status === 'done' && (t.completedAt?.startsWith(dateStr) || t.updatedAt?.startsWith(dateStr))).length;
      const dayTasks = tasks.filter((t: any) => t.createdAt?.startsWith(dateStr) || t.deadline?.startsWith(dateStr) || t.status === 'done').length;
      pct = dayTasks > 0 ? Math.round((doneTasks / dayTasks) * 100) : 0;
    }

    return {
      day: name,
      pct: Math.min(100, Math.max(0, pct)),
      active: isCurrentDay,
    };
  });

  const pastOrTodayDays = weeklyDays.filter((_, idx) => idx <= dayOfWeek);
  const overallWeekPct = pastOrTodayDays.length > 0
    ? Math.round(pastOrTodayDays.reduce((acc, curr) => acc + curr.pct, 0) / pastOrTodayDays.length)
    : 0;
  const weekProgressDecimal = Math.min(1, Math.max(0, overallWeekPct / 100));

  // Real Active Primary Goal
  const activeGoals = goalsList.filter((x: any) => !x.archived && !x.completed);
  const primaryGoal = activeGoals[0] || goalsList[0];
  const goalProgressPct = primaryGoal
    ? (primaryGoal.progress != null
        ? Math.min(100, Math.max(0, Math.round(primaryGoal.progress)))
        : (primaryGoal.target ? Math.min(100, Math.round(((primaryGoal.current || 0) / primaryGoal.target) * 100)) : 0))
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bgPrimary }}>
      <ScrollView
        style={[styles.container, { backgroundColor: c.bgPrimary }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.purple} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, { paddingTop: layout.topPadding + 8, paddingBottom: layout.bottomPadding + 40 }]}>
          {/* Header */}
          <RNAnimated.View style={[styles.header, { opacity: fadeAnim }]}>
            <View style={styles.headerTop}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View style={{ marginBottom: 4 }}>
                  <BrandLogo size={22} showText={true} textSize={17} style={{ justifyContent: 'flex-start' }} />
                </View>
                <Text style={[styles.greeting, { color: c.textPrimary }]}>{translateCopy("Halo,")} {displayName} 👋</Text>
                <Text style={[styles.headerSubtitle, { color: c.textSecondary }]}>
                  {translateCopy("Langkah kecil hari ini, membawa perubahan besar nanti.")}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TouchableOpacity
                  style={[styles.headerIconBtn, { backgroundColor: c.bgCard, borderColor: c.border }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowNotificationsModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="notifications-none" size={20} color={c.textPrimary} />
                  <View style={[styles.unreadDot, { backgroundColor: '#C8AD80' }]} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/(app)/more' as any)}
                  activeOpacity={0.8}
                  style={[styles.avatarCircle, { backgroundColor: '#193F30' }]}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 14 }}>
                    {displayName.charAt(0).toUpperCase()}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </RNAnimated.View>

          {/* Search / Quick Input Pill */}
          <TouchableOpacity
            style={[styles.searchPill, { backgroundColor: c.bgCard, borderColor: c.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowQuickCapture(true);
            }}
            activeOpacity={0.85}
          >
            <MaterialIcons name="search" size={20} color={c.textMuted} />
            <Text style={[styles.searchPlaceholder, { color: c.textMuted }]}>
              {translateCopy("Apa yang ingin kamu capai hari ini?")}
            </Text>
          </TouchableOpacity>

          {/* 5 Quick Action Shortcuts (matching Mockup Image 4) */}
          <View style={styles.quickShortcutsRow}>
            {[
              { label: translateCopy("Tugas"), icon: 'checklist' as const, route: '/(app)/tasks', bg: '#EBF4F0', color: '#193F30' },
              { label: translateCopy("Kebiasaan"), icon: 'local-fire-department' as const, route: '/(app)/habits', bg: '#EFF4EE', color: '#397353' },
              { label: translateCopy("Keuangan"), icon: 'account-balance-wallet' as const, route: '/(app)/finance', bg: '#F7F2E7', color: '#B38B4D' },
              { label: translateCopy("Jurnal"), icon: 'create' as const, route: '/(app)/journal', bg: '#F9EFEF', color: '#D97706' },
              { label: translateCopy("Tujuan"), icon: 'flag' as const, route: '/(app)/goals', bg: '#F5F7EC', color: '#193F30' },
            ].map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.shortcutItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(item.route as any);
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.shortcutIconBox, { backgroundColor: isDark ? c.bgCard : item.bg, borderColor: c.border }]}>
                  <MaterialIcons name={item.icon} size={22} color={isDark ? c.textPrimary : item.color} />
                </View>
                <Text style={[styles.shortcutLabel, { color: c.textPrimary }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Progres Minggu Ini (matching Mockup Image 4) */}
          <View style={[styles.whenyaCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardHeaderTitle, { color: c.textPrimary }]}>{translateCopy("Progres Minggu Ini")}</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/insights' as any)}>
                <MaterialIcons name="chevron-right" size={22} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.weekProgressRow}>
              <View style={styles.progressRingWrapper}>
                <Svg width={76} height={76} viewBox="0 0 76 76">
                  <Circle cx="38" cy="38" r="32" stroke={isDark ? 'rgba(255,255,255,0.1)' : '#E4E8E1'} strokeWidth="7" fill="none" />
                  <Circle
                    cx="38" cy="38" r="32"
                    stroke="#397353"
                    strokeWidth="7"
                    strokeDasharray="201"
                    strokeDashoffset={201 * (1 - weekProgressDecimal)}
                    strokeLinecap="round"
                    fill="none"
                    transform="rotate(-90 38 38)"
                  />
                </Svg>
                <View style={styles.progressRingCenter}>
                  <Text style={[styles.progressRingText, { color: c.textPrimary }]}>{overallWeekPct}%</Text>
                </View>
              </View>
              <View style={{ flex: 1, paddingLeft: 14 }}>
                <Text style={[styles.weekProgressMotivation, { color: c.textPrimary }]}>
                  {overallWeekPct >= 70
                    ? translateCopy("Kamu berada di jalur yang tepat!")
                    : overallWeekPct >= 30
                    ? translateCopy("Konsistensi mulai terbangun!")
                    : translateCopy("Mulai langkah kecilmu hari ini!")}
                </Text>
                <Text style={[styles.weekProgressSub, { color: c.textSecondary }]}>
                  {overallWeekPct >= 70
                    ? translateCopy("Terus konsisten untuk versi terbaik dari dirimu.")
                    : translateCopy("Selesaikan tugas atau kebiasaan pertamamu.")}
                </Text>
              </View>
            </View>

            {/* 7-day mini bars */}
            <View style={styles.weekBarsContainer}>
              {weeklyDays.map((d, i) => (
                <View key={i} style={styles.dayBarCol}>
                  <View style={[styles.dayBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#EBF0E9' }]}>
                    <View
                      style={[
                        styles.dayBarFill,
                        {
                          height: `${d.pct}%`,
                          backgroundColor: d.active ? '#193F30' : '#397353',
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.dayBarLabel, { color: d.active ? c.textPrimary : c.textMuted, fontWeight: d.active ? '800' : '500' }]}>
                    {d.day}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Tujuan Utama Card (matching Mockup Image 3 & 4) */}
          <View style={[styles.whenyaCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="flag" size={18} color="#C8AD80" />
                <Text style={[styles.cardHeaderTitle, { color: c.textPrimary }]}>{translateCopy("Tujuan Utama")}</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(app)/goals' as any)}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#193F30' }}>{translateCopy("Lihat Semua")}</Text>
              </TouchableOpacity>
            </View>
            {primaryGoal ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <View style={[styles.goalThumbBox, { backgroundColor: '#193F30' }]}>
                    <MaterialIcons name="nature-people" size={24} color="#C8AD80" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.goalTitle, { color: c.textPrimary }]} numberOfLines={1}>
                      {primaryGoal.title}
                    </Text>
                    <Text style={[styles.goalSub, { color: c.textSecondary }]} numberOfLines={1}>
                      {primaryGoal.category || primaryGoal.description || translateCopy("Target fokus saat ini")}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#193F30' }}>{goalProgressPct}%</Text>
                </View>
                <View style={[styles.goalTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#EBF0E9' }]}>
                  <View style={[styles.goalFill, { width: `${goalProgressPct}%`, backgroundColor: '#193F30' }]} />
                </View>
              </>
            ) : (
              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: c.textSecondary, marginBottom: 10, textAlign: 'center' }}>
                  {translateCopy("Belum ada tujuan aktif. Tentukan target hidupmu untuk fokus yang lebih terarah.")}
                </Text>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#193F30', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }}
                  onPress={() => router.push('/(app)/goals' as any)}
                >
                  <MaterialIcons name="add" size={16} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>{translateCopy("Buat Tujuan")}</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity
              style={[styles.focusActionBtn, { backgroundColor: '#193F30', marginTop: 12 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/(app)/pomodoro' as any);
              }}
              activeOpacity={0.85}
            >
              <MaterialIcons name="play-circle-outline" size={18} color="#ffffff" />
              <Text style={styles.focusActionBtnText}>{translateCopy("Mulai Sesi Fokus")}</Text>
            </TouchableOpacity>
          </View>

          {/* Tugas Hari Ini */}
          <View style={{ marginTop: 6, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>{translateCopy("Tugas Hari Ini")}</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/tasks' as any)}>
                <Text style={{ fontSize: 13, color: '#193F30', fontWeight: '700' }}>{translateCopy("Lihat semua")}</Text>
              </TouchableOpacity>
            </View>

            {displayTasks.length > 0 ? (
              displayTasks.map((task: any) => {
                const isCompleted = task.status === 'done';
                return (
                  <View
                    key={task.id}
                    style={[
                      styles.taskCardRow,
                      { backgroundColor: c.bgCard, borderColor: c.border },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        moveTask(task.id, isCompleted ? 'todo' : 'done');
                        if (!isCompleted) handleAddXP('TASK_COMPLETE');
                      }}
                      style={[
                        styles.taskCheckCircle,
                        {
                          borderColor: isCompleted ? '#193F30' : c.border,
                          backgroundColor: isCompleted ? '#193F30' : 'transparent',
                        },
                      ]}
                    >
                      {isCompleted && <MaterialIcons name="check" size={14} color="#ffffff" />}
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.taskRowTitle,
                          {
                            color: isCompleted ? c.textMuted : c.textPrimary,
                            textDecorationLine: isCompleted ? 'line-through' : 'none',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {task.title}
                      </Text>
                      <Text style={[styles.taskRowTime, { color: c.textMuted }]}>
                        {task.deadline ? String(task.deadline).slice(11, 16) : translateCopy("Hari ini")}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.categoryTag,
                        {
                          backgroundColor:
                            task.category === 'Kerja'
                              ? '#EBF3FE'
                              : task.category === 'Pengembangan'
                              ? '#F5EEF9'
                              : '#EFF7ED',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryTagText,
                          {
                            color:
                              task.category === 'Kerja'
                                ? '#2563EB'
                                : task.category === 'Pengembangan'
                                ? '#7C3AED'
                                : '#193F30',
                          },
                        ]}
                      >
                        {task.category || translateCopy("Personal")}
                      </Text>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={[styles.emptyCardBox, { backgroundColor: c.bgCard, borderColor: c.border }]}>
                <MaterialIcons name="task-alt" size={32} color="#193F30" style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyCardTitle, { color: c.textPrimary }]}>{translateCopy("Semua tugas selesai!")}</Text>
                <Text style={[styles.emptyCardSub, { color: c.textSecondary }]}>{translateCopy("Tidak ada tugas yang tertunda hari ini.")}</Text>
                <TouchableOpacity
                  style={[styles.emptyActionBtn, { backgroundColor: '#193F30' }]}
                  onPress={() => router.push('/(app)/tasks' as any)}
                >
                  <MaterialIcons name="add" size={16} color="#ffffff" />
                  <Text style={styles.emptyActionBtnText}>{translateCopy("Tambah Tugas")}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Kebiasaan Hari Ini (matching Mockup Image 4) */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>{translateCopy("Kebiasaan")}</Text>
                <View style={[styles.streakBannerPill, { backgroundColor: '#FDF6E9' }]}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#B45309' }}>
                    {stats.streak || 0} {translateCopy("Hari Beruntun 🔥")}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => router.push('/(app)/habits' as any)}>
                <Text style={{ fontSize: 13, color: '#193F30', fontWeight: '700' }}>{translateCopy("Lihat semua")}</Text>
              </TouchableOpacity>
            </View>

            {habitsList.length > 0 ? (
              <View style={[styles.whenyaCard, { backgroundColor: c.bgCard, borderColor: c.border, paddingVertical: 8 }]}>
                {habitsList.slice(0, 5).map((habit: any) => {
                  const isDoneToday = habit.completedDates?.includes(today);
                  return (
                    <TouchableOpacity
                      key={habit.id}
                      style={styles.habitRowItem}
                      onPress={() => toggleHabitToday(habit.id)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.habitCheckCircle,
                          {
                            backgroundColor: isDoneToday ? '#193F30' : 'transparent',
                            borderColor: isDoneToday ? '#193F30' : c.border,
                          },
                        ]}
                      >
                        {isDoneToday && <MaterialIcons name="check" size={14} color="#ffffff" />}
                      </View>
                      <Text
                        style={[
                          styles.habitRowTitle,
                          {
                            color: isDoneToday ? c.textMuted : c.textPrimary,
                            textDecorationLine: isDoneToday ? 'line-through' : 'none',
                          },
                        ]}
                      >
                        {habit.title || habit.name}
                      </Text>
                      {habit.streak > 0 && (
                        <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: '600' }}>
                          {habit.streak} {translateCopy("hari")}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={[styles.emptyCardBox, { backgroundColor: c.bgCard, borderColor: c.border }]}>
                <MaterialIcons name="local-fire-department" size={32} color="#397353" style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyCardTitle, { color: c.textPrimary }]}>{translateCopy("Belum ada kebiasaan")}</Text>
                <Text style={[styles.emptyCardSub, { color: c.textSecondary }]}>{translateCopy("Mulai bangun rutinitas positif harianmu.")}</Text>
                <TouchableOpacity
                  style={[styles.emptyActionBtn, { backgroundColor: '#193F30' }]}
                  onPress={() => router.push('/(app)/habits' as any)}
                >
                  <MaterialIcons name="add" size={16} color="#ffffff" />
                  <Text style={styles.emptyActionBtnText}>{translateCopy("Buat Kebiasaan")}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Ringkasan Keuangan (matching Mockup Image 3 & 4) */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>{translateCopy("Keuangan")}</Text>
              <TouchableOpacity onPress={() => router.push('/(app)/finance' as any)}>
                <Text style={{ fontSize: 13, color: '#193F30', fontWeight: '700' }}>{translateCopy("Lihat Detail")}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.whenyaCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={[styles.financeCardEyebrow, { color: c.textMuted }]}>{translateCopy("Total Pengeluaran Bulan Ini")}</Text>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    updateSetting('hideFinanceBalance', !settings.hideFinanceBalance);
                  }}
                >
                  <MaterialIcons
                    name={settings.hideFinanceBalance ? 'visibility-off' : 'visibility'}
                    size={18}
                    color={c.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <Text style={[styles.financeAmountText, { color: c.textPrimary }]}>
                {settings.hideFinanceBalance ? '••••••••' : formatCurrency(stats.totalExpense || 0, uiLanguage)}
              </Text>

              <View style={styles.financeSplitRow}>
                <View style={[styles.financePill, { backgroundColor: '#EFF7ED' }]}>
                  <View style={[styles.financeDot, { backgroundColor: '#193F30' }]} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#193F30' }}>
                    {translateCopy("Pemasukan:")} {settings.hideFinanceBalance ? '••••' : formatCurrency(stats.totalIncome || 0, uiLanguage)}
                  </Text>
                </View>
                <View style={[styles.financePill, { backgroundColor: '#F9EFEF' }]}>
                  <View style={[styles.financeDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#EF4444' }}>
                    {translateCopy("Pengeluaran:")} {settings.hideFinanceBalance ? '••••' : formatCurrency(stats.totalExpense || 0, uiLanguage)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Smart Insights & Life DNA */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>{translateCopy("Insight Personal")}</Text>
              <TouchableOpacity onPress={() => setShowDNAModal(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialIcons name="radar" size={16} color="#193F30" />
                <Text style={{ fontSize: 13, color: '#193F30', fontWeight: '700' }}>{translateCopy("Life DNA")}</Text>
              </TouchableOpacity>
            </View>
            <CrossModuleInsights isDark={isDark} />
          </View>
        </View>

      {/* Reset Modal (Supportive Whenya Tone) */}
      <Modal visible={showEmergencyModal} animationType="fade" transparent>
        <View style={styles.emergencyOverlay}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[styles.emergencyContent, { backgroundColor: c.bgSecondary + 'EE' }]}>
            <View style={styles.emergencyHeader}>
              <Text style={[styles.emergencyTitle, { color: c.textPrimary }]}>
                {emergencyStep === 'menu' ? translateCopy("Apa yang membuatmu terhenti?") : selectedEmergency?.title}
              </Text>
              <TouchableOpacity onPress={() => setShowEmergencyModal(false)}>
                <MaterialIcons name="close" size={24} color={c.textSecondary} />
              </TouchableOpacity>
            </View>

            {emergencyStep === 'menu' ? (
              <View style={styles.emergencyMenu}>
                {[
                  {
                    id: 'move', label: translateCopy("Kurang Energi"), icon: 'fitness-center', color: '#f87171',
                    title: translateCopy("RESET FISIK"),
                    steps: [translateCopy("Berdiri & regangkan badan"), translateCopy("Tarik napas dalam 3 kali"), translateCopy("Minum segelas air putih")]
                  },
                  {
                    id: 'scroll', label: translateCopy("Terdistraksi Layar"), icon: 'phonelink-erase', color: '#60a5fa',
                    title: translateCopy("DETOKS SEJENAK"),
                    steps: [translateCopy("Letakkan ponsel sejenak"), translateCopy("Basuh wajah dengan air segar"), translateCopy("Lihat pemandangan luar jendela")]
                  },
                  {
                    id: 'overwhelmed', label: translateCopy("Pikiran Penuh (Overwhelmed)"), icon: 'blur-on', color: '#fbbf24',
                    title: translateCopy("FOKUS SATU HAL"),
                    steps: [translateCopy("Pilih satu hal paling kecil"), translateCopy("Tarik napas perlahan 4 detik"), translateCopy("Mulai 2 menit pertama")]
                  },
                  {
                    id: 'lost', label: translateCopy("Bingung Mulai dari Mana"), icon: 'explore', color: '#c084fc',
                    title: translateCopy("LANGKAH AWAL"),
                    steps: [translateCopy("Rapikan meja kerjamu 1 menit"), translateCopy("Buka daftar tugas teratas"), translateCopy("Kerjakan satu langkah mudah")]
                  },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.emergencyItem, { backgroundColor: c.bgInput }]}
                    onPress={() => {
                      setSelectedEmergency(item);
                      setEmergencyStep('mission');
                      setCurrentStepIndex(0);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={[styles.smallIcon, { backgroundColor: item.color + '22' }]}>
                        <MaterialIcons name={item.icon as any} size={20} color={item.color} />
                      </View>
                      <Text style={[styles.emergencyItemText, { color: c.textPrimary }]}>{item.label}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color={c.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.missionBox}>
                <View style={styles.stepIndicator}>
                  {selectedEmergency?.steps.map((_: any, i: number) => (
                    <View
                      key={i}
                      style={[
                        styles.indicatorDot,
                        { backgroundColor: i <= currentStepIndex ? selectedEmergency.color : c.border }
                      ]}
                    />
                  ))}
                </View>

                <View style={styles.missionContent}>
                  <Text style={[styles.stepNumber, { color: selectedEmergency?.color }]}>
                    {t('dashboard.step_count')
                      .replace('{current}', String(currentStepIndex + 1))
                      .replace('{total}', String(selectedEmergency?.steps.length))}
                  </Text>
                  <Text style={[styles.missionAction, { color: c.textPrimary }]}>
                    {selectedEmergency?.steps[currentStepIndex]}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.nextBtn, { backgroundColor: selectedEmergency?.color }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (currentStepIndex < selectedEmergency.steps.length - 1) {
                      setCurrentStepIndex(currentStepIndex + 1);
                    } else {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      setShowEmergencyModal(false);
                      handleAddXP('TASK_COMPLETE');
                    }
                  }}
                >
                  <Text style={styles.nextBtnText}>
                    {currentStepIndex < selectedEmergency?.steps.length - 1 ? 'Lanjutkan' : translateCopy("Selesai, Mulai Kembali")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* DNA Detail Modal */}
      <Modal visible={showDNAModal} animationType="slide" transparent>
        <View style={styles.emergencyOverlay}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[styles.dnaDetailContent, { backgroundColor: c.bgSecondary + 'EE' }]}>
            <View style={styles.emergencyHeader}>
              <View>
                <Text style={[styles.emergencyTitle, { color: c.textPrimary }]}>{translateCopy("LIFE SCORE DNA")}</Text>
                <Text style={[styles.dnaDetailSubtitle, { color: c.textSecondary }]}>{translateCopy("Analisis perkembangan diri")}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDNAModal(false)}>
                <MaterialIcons name="close" size={24} color={c.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.dnaChartLarge}>
                <RadarChart data={dnaData} size={280} />
              </View>

              <View style={styles.dnaStatsList}>
                {dnaData.map((d, i) => (
                  <View key={i} style={styles.dnaStatItem}>
                    <View style={styles.dnaStatHeader}>
                      <Text style={[styles.dnaStatLabel, { color: c.textPrimary }]}>{translateCopy(d.label)}</Text>
                      <Text style={[styles.dnaStatValue, { color: c.purple }]}>{Math.round(d.value)}%</Text>
                    </View>
                    <View style={[styles.dnaStatBarTrack, { backgroundColor: c.border + '44' }]}>
                      <View
                        style={[
                          styles.dnaStatBarFill,
                          { width: `${d.value}%`, backgroundColor: d.value > 70 ? c.green : d.value > 40 ? c.purple : c.red }
                        ]}
                      />
                    </View>
                    <Text style={[styles.dnaStatDesc, { color: c.textSecondary }]}>
                      {d.label === 'MIND' ? translateCopy("Fokus & konsentrasi belajar.") :
                       d.label === 'BODY' ? translateCopy("Kesehatan fisik & kebugaran.") :
                       d.label === 'MONEY' ? translateCopy("Kontrol finansial & tabungan.") :
                       d.label === 'SOUL' ? translateCopy("Kesehatan mental & refleksi diri.") :
                       d.label === 'GROWTH' ? translateCopy("Progres target & kebiasaan baru.") :
                       translateCopy("Kualitas hubungan sosial.")}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.dnaCloseBtn, { backgroundColor: '#193F30' }]}
                onPress={() => setShowDNAModal(false)}
              >
                <Text style={styles.dnaCloseBtnText}>{translateCopy("TUTUP")}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* AI Insight Detail Modal */}
      <Modal visible={showInsightModal} transparent animationType="fade">
        <View style={styles.emergencyOverlay}>
          <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[styles.insightDetailContent, { backgroundColor: c.bgSecondary + 'EE' }]}>
            <View style={[styles.insightDetailIcon, { backgroundColor: selectedInsight?.color + '22' }]}>
              <MaterialIcons name={selectedInsight?.icon as any} size={32} color={selectedInsight?.color} />
            </View>
            <Text style={[styles.insightDetailTitle, { color: c.textPrimary }]}>{selectedInsight?.title}</Text>
            <Text style={[styles.insightDetailMsg, { color: c.textSecondary }]}>{selectedInsight?.msg}</Text>

            <View style={styles.insightActionRow}>
              <TouchableOpacity
                style={[styles.insightCloseBtn, { backgroundColor: c.bgInput }]}
                onPress={() => setShowInsightModal(false)}
              >
                <Text style={[styles.insightCloseBtnText, { color: c.textPrimary }]}>{translateCopy("TUTUP")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.insightGoBtn, { backgroundColor: '#193F30' }]}
                onPress={() => {
                  setShowInsightModal(false);
                  const routeMap: any = {
                    'HABIT': translateCopy("habits"),
                    'TASK': translateCopy("tasks"),
                    'FINANCE': 'finance',
                    'FOCUS': 'pomodoro'
                  };
                  const target = routeMap[selectedInsight?.type as any];
                  if (target) {
                    router.push(target as any);
                  }
                }}
              >
                <Text style={styles.insightGoBtnText}>{translateCopy("Mulai Sekarang")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>

      {/* Notifications Modal Bottom Sheet */}
      <Modal visible={showNotificationsModal} animationType="slide" transparent>
        <View style={styles.emergencyOverlay}>
          <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[styles.notifSheetContent, { backgroundColor: isDark ? c.bgSecondary : '#FFFFFF' }]}>
            <View style={styles.notifSheetHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialIcons name="notifications" size={22} color="#193F30" />
                <Text style={[styles.notifSheetTitle, { color: c.textPrimary }]}>{translateCopy("Notifikasi")}</Text>
                <View style={styles.notifCountPill}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#193F30' }}>{translateCopy("2 baru")}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowNotificationsModal(false)}>
                <MaterialIcons name="close" size={24} color={c.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 24 }}>
              {[
                {
                  id: '1',
                  title: translateCopy("Konsistensi Terjaga! 🔥"),
                  desc: translateCopy("Hebat, kamu telah mempertahankan streak kebiasaanmu 12 hari beruntun."),
                  time: translateCopy("15 menit yang lalu"),
                  unread: true,
                  route: '/(app)/habits',
                  icon: 'local-fire-department',
                  color: '#F97316',
                  bg: '#FFF7ED',
                },
                {
                  id: '2',
                  title: translateCopy("Progres Target Hidup 🎯"),
                  desc: translateCopy("Target \"Bangun versi terbaik diri\" sudah mencapai 70%. Teruskan!"),
                  time: translateCopy("1 jam yang lalu"),
                  unread: true,
                  route: '/(app)/goals',
                  icon: 'flag',
                  color: '#EAB308',
                  bg: '#FEFCE8',
                },
                {
                  id: '3',
                  title: translateCopy("Afirmasi Whenya AI ✨"),
                  desc: translateCopy("Langkah kecil hari ini membawa perubahan besar nanti. Semangat!"),
                  time: translateCopy("Hari ini, 08:00"),
                  unread: false,
                  icon: 'auto-awesome',
                  color: '#193F30',
                  bg: '#EFF7ED',
                },
                {
                  id: '4',
                  title: translateCopy("Arus Kas Harian 💰"),
                  desc: translateCopy("Catat pengeluaranmu hari ini agar target keuangan tetap terarah."),
                  time: translateCopy("Kemarin, 19:30"),
                  unread: false,
                  route: '/(app)/finance',
                  icon: 'account-balance-wallet',
                  color: '#10B981',
                  bg: '#ECFDF5',
                },
              ].map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.notifItemCard,
                    {
                      backgroundColor: isDark ? c.bgCard : '#FBF9F4',
                      borderColor: item.unread ? '#193F30' : c.border,
                      borderLeftWidth: item.unread ? 3.5 : 1,
                    },
                  ]}
                  onPress={() => {
                    setShowNotificationsModal(false);
                    if (item.route) router.push(item.route as any);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.notifIconCircle, { backgroundColor: isDark ? c.bgInput : item.bg }]}>
                    <MaterialIcons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <Text style={[styles.notifItemTitle, { color: c.textPrimary, fontWeight: item.unread ? '800' : '600' }]}>
                        {item.title}
                      </Text>
                      {item.unread && <View style={[styles.unreadDot, { position: 'relative', top: 0, right: 0 }]} />}
                    </View>
                    <Text style={[styles.notifItemDesc, { color: c.textSecondary }]}>{item.desc}</Text>
                    <Text style={[styles.notifItemTime, { color: c.textMuted }]}>{item.time}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <QuickCaptureModal
        visible={showQuickCapture}
        onClose={() => setShowQuickCapture(false)}
        isDark={isDark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: MOBILE_SPACING.screen },
  header: { marginBottom: 18 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  greeting: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  headerSubtitle: { fontSize: 13, marginTop: 3, lineHeight: 18 },
  dateText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  headerIconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  unreadDot: { position: 'absolute', top: 9, right: 9, width: 7, height: 7, borderRadius: 3.5 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  searchPill: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 24, borderWidth: 1, marginBottom: 18 },
  searchPlaceholder: { fontSize: 13, fontWeight: '500' },

  quickShortcutsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  shortcutItem: { alignItems: 'center', gap: 6, flex: 1 },
  shortcutIconBox: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  shortcutLabel: { fontSize: 11, fontWeight: '700' },

  whenyaCard: { borderRadius: 20, padding: 18, borderWidth: 1, marginBottom: 16 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardHeaderTitle: { fontSize: 15, fontWeight: '800' },

  weekProgressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  progressRingWrapper: { position: 'relative', width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  progressRingCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  progressRingText: { fontSize: 16, fontWeight: '900' },
  weekProgressMotivation: { fontSize: 13.5, fontWeight: '800', marginBottom: 3 },
  weekProgressSub: { fontSize: 11.5, lineHeight: 16 },

  weekBarsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 60, paddingTop: 4 },
  dayBarCol: { alignItems: 'center', gap: 4, flex: 1 },
  dayBarTrack: { width: 14, height: 40, borderRadius: 7, justifyContent: 'flex-end', overflow: 'hidden' },
  dayBarFill: { width: '100%', borderRadius: 7 },
  dayBarLabel: { fontSize: 10 },

  goalThumbBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  goalTitle: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  goalSub: { fontSize: 11.5 },
  goalTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 14 },
  goalFill: { height: '100%', borderRadius: 3 },
  focusActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, borderRadius: 12 },
  focusActionBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

  taskCardRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 8, gap: 12 },
  taskRowTitle: { fontSize: 13.5, fontWeight: '700', marginBottom: 2 },
  taskRowTime: { fontSize: 11, fontWeight: '500' },
  categoryTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryTagText: { fontSize: 10.5, fontWeight: '800' },

  streakBannerPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  habitRowItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, gap: 12, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.05)' },
  habitCheckCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  habitRowTitle: { flex: 1, fontSize: 13.5, fontWeight: '600' },

  financeCardEyebrow: { fontSize: 12, fontWeight: '600' },
  financeAmountText: { fontSize: 24, fontWeight: '900', marginVertical: 8 },
  financeSplitRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  financePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, flex: 1 },
  financeDot: { width: 6, height: 6, borderRadius: 3 },

  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  focusCard: { borderRadius: 20, padding: 18, borderWidth: 1, marginBottom: 16 },
  focusTitle: { fontSize: 19, fontWeight: '800', marginBottom: 6, letterSpacing: -0.3 },
  focusSubtitle: { fontSize: 13.5, lineHeight: 19, marginBottom: 16 },
  focusBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12 },
  focusBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },

  progressStrip: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  progressItem: { flex: 1, padding: 12, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  progressIconBox: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  progressValue: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  progressLabel: { fontSize: 10.5, fontWeight: '600' },

  taskItemRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8, gap: 12 },
  taskCheckCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  taskItemTitle: { flex: 1, fontSize: 14, fontWeight: '600' },
  priorityPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },

  calmEmptyCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 14 },
  calmEmptyTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  calmEmptySub: { fontSize: 12, lineHeight: 16 },

  summaryCard: { borderRadius: 18, borderWidth: 1, padding: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 4 },
  summaryItemLabel: { fontSize: 11, fontWeight: '600' },
  summaryItemVal: { fontSize: 13, fontWeight: '800' },
  summaryDivider: { width: 1, height: 28 },
  summaryFootnote: { fontSize: 11.5, textAlign: 'center', marginTop: 10, lineHeight: 16 },

  card: { borderRadius: 28, padding: 20, marginBottom: 20, borderWidth: 1 },
  xpHeader: { marginBottom: 12 },
  xpTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  xpTitle: { fontSize: 18, fontWeight: '900' },
  levelBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  levelBadgeText: { fontSize: 11, fontWeight: '900' },
  xpTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  boostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
    gap: 2,
  },
  boostBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  xpFill: { height: '100%', borderRadius: 4 },
  xpText: { fontSize: 12, fontWeight: '700' },

  dnaContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 130,
    marginLeft: 8,
  },
  radialLabel: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.6 },

  sectionHeader: { marginBottom: 16, paddingLeft: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  insightsScroll: { gap: 12, paddingBottom: 24, paddingLeft: 4 },

  insightCard: {
    width: 240,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginRight: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  skeletonCard: {
    width: 240,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginRight: 12,
    gap: 12,
    opacity: 0.5,
  },
  skeletonCircle: { width: 44, height: 44, borderRadius: 22 },
  skeletonLineShort: { width: '40%', height: 12, borderRadius: 6 },
  skeletonLineLong: { width: '80%', height: 10, borderRadius: 5 },
  insightIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  insightTitle: { fontSize: 13, fontWeight: '900', marginBottom: 2 },
  insightMsg: { fontSize: 11, fontWeight: '600', lineHeight: 16 },

  insightDetailContent: {
    width: '85%',
    padding: 24,
    borderRadius: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: Dimensions.get('window').height * 0.2, // Centerish
  },
  insightDetailIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  insightDetailTitle: { fontSize: 18, fontWeight: '900', marginBottom: 12, textAlign: 'center' },
  insightDetailMsg: { fontSize: 14, fontWeight: '600', lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  insightActionRow: { flexDirection: 'row', gap: 12, width: '100%' },
  insightCloseBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  insightCloseBtnText: { fontWeight: '900', fontSize: 14 },
  insightGoBtn: { flex: 1.5, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  insightGoBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: MOBILE_SPACING.gap, marginBottom: 24 },
  phase3Stat: { borderRadius: 24, padding: 20, borderWidth: 1, justifyContent: 'center' },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  statLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  statValue: { fontSize: 24, fontWeight: '900', marginBottom: 12 },
  statLine: { height: 4, borderRadius: 2, overflow: 'hidden' },
  statFill: { height: '100%', borderRadius: 2 },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: MOBILE_SPACING.gap, marginBottom: 24 },
  actionCard: { borderRadius: 24, paddingVertical: 24, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1 },
  actionIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  actionLabel: { fontSize: 14, fontWeight: '800' },

  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 12,
    marginBottom: 24,
    elevation: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  emergencyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  emergencySubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  emergencyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  emergencyContent: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    padding: 28,
    paddingBottom: 50,
  },
  emergencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  emergencyTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  emergencyMenu: { gap: 12 },
  emergencyItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 22 },
  smallIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emergencyItemText: { fontSize: 16, fontWeight: '800' },

  missionBox: { alignItems: 'center', paddingVertical: 10 },
  stepIndicator: { flexDirection: 'row', gap: 8, marginBottom: 40 },
  indicatorDot: { width: 40, height: 6, borderRadius: 3 },
  missionContent: { height: 160, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  stepNumber: { fontSize: 12, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
  missionAction: { fontSize: 24, fontWeight: '900', textAlign: 'center', lineHeight: 36, paddingHorizontal: 20 },
  nextBtn: { width: '100%', paddingVertical: 22, borderRadius: 24, alignItems: 'center', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  dnaDetailContent: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 28, height: '90%' },
  dnaDetailSubtitle: { fontSize: 13, fontWeight: '600', marginTop: 4, opacity: 0.6 },
  dnaChartLarge: { alignItems: 'center', marginVertical: 32 },
  dnaStatsList: { gap: 24, marginBottom: 40 },
  dnaStatItem: {},
  dnaStatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dnaStatLabel: { fontSize: 14, fontWeight: '900' },
  dnaStatValue: { fontSize: 14, fontWeight: '900' },
  dnaStatBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  dnaStatBarFill: { height: '100%', borderRadius: 3 },
  dnaStatDesc: { fontSize: 12, fontWeight: '600', opacity: 0.7, lineHeight: 18 },
  dnaCloseBtn: { width: '100%', paddingVertical: 20, borderRadius: 24, alignItems: 'center', marginBottom: 40 },
  dnaCloseBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  notifSheetContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '80%' },
  notifSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  notifSheetTitle: { fontSize: 18, fontWeight: '900' },
  notifCountPill: { backgroundColor: '#EFF7ED', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  notifItemCard: { flexDirection: 'row', padding: 14, borderRadius: 16, borderWidth: 1, gap: 12, alignItems: 'flex-start' },
  notifIconCircle: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notifItemTitle: { fontSize: 13.5 },
  notifItemDesc: { fontSize: 12, lineHeight: 17, marginBottom: 4 },
  notifItemTime: { fontSize: 10.5 },

  emptyCardBox: {
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyCardSub: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 14,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  emptyActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
