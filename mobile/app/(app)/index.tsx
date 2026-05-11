import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, Dimensions, Image, Animated as RNAnimated, Easing, Modal
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
import { getData, STORAGE_KEYS } from '../../lib/storage';
import { EncryptedStorage } from '../../lib/secureStorage';
import { greetingTime, getToday, formatCurrency } from '../../lib/helpers';
import { getXP, getCurrentLevel, getXPProgress, checkDailyLogin, addXP } from '../../lib/gamification';
import { BrandLogo } from '../../components/BrandLogo';
import { RadarChart } from '../../components/RadarChart';
import { DailyQuestCard } from '../../components/DailyQuestCard';
import * as Haptics from 'expo-haptics';

export default function DashboardScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const { t, language } = useLanguage();
  const router = useRouter();
  const today = getToday();
  const layout = useMobileLayout();
  const columnWidth = getTwoColumnCardWidth(Dimensions.get('window').width);

  const [refreshing, setRefreshing] = useState(false);
  const [gamData, setGamData] = useState({ totalXP: 0 });
  const [stats, setStats] = useState({
    tasksCompleted: 0, tasksTotal: 0,
    habitsToday: 0, habitsTotal: 0,
    streak: 0, totalIncome: 0, totalExpense: 0,
    focusSessions: 0, goalsActive: 0,
    booksReading: 0, journalEntries: 0,
    workoutsThisWeek: 0,
  });
  const { tasks, loading, xpToast, addTask, updateTask, deleteTask, moveTask, refreshTasks } = useTasks();
  const { insights, loading: aiLoading, refreshInsights } = useAIInsights();
  
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyStep, setEmergencyStep] = useState<'menu' | 'mission'>('menu');
  const [selectedEmergency, setSelectedEmergency] = useState<any>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showDNAModal, setShowDNAModal] = useState(false);

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
    const tx = Array.isArray(transactions) ? transactions : [];
    const p = pomodoro || { sessions: [] };
    const g = goals || [];
    const b = books || [];
    const j = journal || [];
    const hl = health || { workouts: [] };

    const completedTasks = taskList.filter((x: any) => x.status === 'done').length;
    const todayHabits = habitList.filter((x: any) => x.completedDates?.includes(today)).length;
    let maxStreak = 0;
    habitList.forEach((x: any) => { if (x.streak && x.streak > maxStreak) maxStreak = x.streak; });
    const income = tx.filter((x: any) => x.type === 'income').reduce((s: number, x: any) => s + x.amount, 0);
    const expense = tx.filter((x: any) => x.type === 'expense').reduce((s: number, x: any) => s + x.amount, 0);
    const todaySessions = p.sessions?.filter((s: any) => s.date === today).length || 0;
    const activeGoals = g.filter((x: any) => !x.completed).length;
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

  useEffect(() => {
    loadData();
    checkDailyLogin();
    registerForPushNotificationsAsync();
  }, [loadData]);

  // Proactive Notification Trigger when AI detects Predictive Anti-Mager
  useEffect(() => {
    if (insights && insights.length > 0) {
      const antiMager = insights.find(i => i.xpMultiplier && i.xpMultiplier > 1);
      if (antiMager) {
        sendImmediateNotification(`⚠️ AI ALERT: ${antiMager.title}`, antiMager.msg);
      }
    }
  }, [insights]);

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
    { label: t('sidebar.reading'), icon: 'menu-book' as const, route: '/reading', color: '#8b5cf6' },
    { label: t('sidebar.health'), icon: 'fitness-center' as const, route: '/health', color: '#ef4444' },
    { label: t('sidebar.journal'), icon: 'create' as const, route: '/journal', color: '#ec4899' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bgPrimary }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.purple} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.content, { paddingTop: layout.topPadding, paddingBottom: layout.bottomPadding + 40 }]}>
        <RNAnimated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={styles.headerTop}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={[styles.greeting, { color: c.textPrimary }]}>{t(greetingTime())}</Text>
                <MaterialIcons name="waving-hand" size={28} color={c.yellow} />
              </View>
              <Text style={[styles.headerSubtitle, { color: c.textSecondary }]}>
                {t('dashboard.summary')}
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/profile')}>
              <BrandLogo size={40} showText={false} />
            </TouchableOpacity>
          </View>
        </RNAnimated.View>

        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border, flexDirection: 'row', alignItems: 'center' }]}>
          <View style={{ flex: 1 }}>
            <View style={styles.xpHeader}>
              <View style={styles.xpTitleRow}>
                <Text style={[styles.xpTitle, { color: c.textPrimary }]}>{t(level.key)}</Text>
                <View style={[styles.levelBadge, { backgroundColor: level.color + '22' }]}>
                  <Text style={[styles.levelBadgeText, { color: level.color }]}>Lv. {level.level}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.xpTrack, { backgroundColor: c.border }]}>
              <View style={[styles.xpFill, { width: `${progress.percent}%`, backgroundColor: level.color }]} />
            </View>
            <Text style={[styles.xpText, { color: c.textSecondary, marginTop: 8 }]}>
              {gamData.totalXP} XP • {progress.percent}% {t('gamification.to_next')} Lv. {level.level + 1}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.dnaContainer} 
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowDNAModal(true);
            }}
            activeOpacity={0.8}
          >
            <RadarChart data={dnaData} size={110} />
            <Text style={[styles.radialLabel, { color: c.textMuted, marginTop: 2 }]}>LIFE DNA</Text>
          </TouchableOpacity>
        </View>

        <RNAnimated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity 
            style={[styles.emergencyBtn, { backgroundColor: c.red }]} 
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              setShowEmergencyModal(true);
              setEmergencyStep('menu');
            }}
            activeOpacity={0.9}
          >
            <View style={styles.emergencyIconBox}>
              <MaterialIcons name="offline-bolt" size={24} color="#fff" />
            </View>
            <Text style={styles.emergencyBtnText}>DARURAT MAGER</Text>
            <MaterialIcons name="arrow-forward-ios" size={16} color="#fff" style={{ marginLeft: 'auto', opacity: 0.7 }} />
          </TouchableOpacity>
        </RNAnimated.View>

        <DailyQuestCard />

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary, marginBottom: 0 }]}>Smart Insights</Text>
          <TouchableOpacity onPress={() => refreshInsights(true)} disabled={aiLoading}>
            <MaterialIcons name="refresh" size={18} color={c.purple} style={{ opacity: aiLoading ? 0.3 : 1 }} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.insightsScroll}>
          {aiLoading ? (
            [1, 2].map((i) => (
              <View key={i} style={[styles.insightCard, { backgroundColor: c.bgCard, borderColor: c.border, opacity: 0.5 }]}>
                <View style={[styles.insightIcon, { backgroundColor: c.border }]} />
                <View style={{ flex: 1, gap: 8 }}>
                  <View style={{ height: 12, backgroundColor: c.border, borderRadius: 6, width: '60%' }} />
                  <View style={{ height: 10, backgroundColor: c.border, borderRadius: 5, width: '90%' }} />
                </View>
              </View>
            ))
          ) : (
            insights.map((insight) => (
              <TouchableOpacity
                key={insight.id}
                style={[styles.insightCard, { backgroundColor: c.bgCard, borderColor: c.border }]}
                activeOpacity={0.7}
              >
                <View style={[styles.insightIcon, { backgroundColor: insight.color + '15' }]}>
                  <MaterialIcons name={insight.icon as any} size={20} color={insight.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.insightTitle, { color: c.textPrimary }]}>{insight.title}</Text>
                  <Text style={[styles.insightMsg, { color: c.textSecondary }]} numberOfLines={2}>{insight.msg}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Stats Grid - Phase 3 Design */}
        <View style={styles.statsGrid}>
          {[
            { label: t('dashboard.tasks_completed'), value: stats.tasksCompleted, total: stats.tasksTotal, icon: 'checklist' as const, color: c.purple },
            { label: t('dashboard.habits_completed'), value: stats.habitsToday, total: stats.habitsTotal, icon: 'local-fire-department' as const, color: c.green },
            { label: t('dashboard.focus_sessions'), value: stats.focusSessions, icon: 'timer' as const, color: c.cyan },
            { label: t('dashboard.longest_streak'), value: stats.streak, icon: 'auto-awesome' as const, color: c.red },
          ].map((s, i) => (
            <View key={i} style={[styles.phase3Stat, { width: columnWidth, backgroundColor: c.bgCard, borderColor: c.border }]}>
              <View style={styles.statHeader}>
                <MaterialIcons name={s.icon} size={18} color={s.color} />
                <Text style={[styles.statLabel, { color: c.textSecondary }]}>{s.label}</Text>
              </View>
              <Text style={[styles.statValue, { color: c.textPrimary }]}>
                {s.value}{s.total !== undefined ? `/${s.total}` : ''}
              </Text>
              <View style={[styles.statLine, { backgroundColor: s.color + '33' }]}>
                <View style={[styles.statFill, { backgroundColor: s.color, width: s.total ? `${(s.value / s.total) * 100}%` : '60%' }]} />
              </View>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: c.textPrimary, marginTop: 10 }]}>{t('dashboard.quick_actions')}</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((a, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.actionCard, { width: columnWidth, backgroundColor: c.bgCard, borderColor: c.border }]}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: a.color + '22' }]}>
                <MaterialIcons name={a.icon} size={24} color={a.color} />
              </View>
              <Text style={[styles.actionLabel, { color: c.textPrimary }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Emergency Modal */}
      <Modal visible={showEmergencyModal} animationType="slide" transparent>
        <View style={styles.emergencyOverlay}>
          <View style={[styles.emergencyContent, { backgroundColor: c.bgSecondary }]}>
            <View style={styles.emergencyHeader}>
              <Text style={[styles.emergencyTitle, { color: c.textPrimary }]}>
                {emergencyStep === 'menu' ? 'Kenapa lo stuck, brok?' : selectedEmergency?.title}
              </Text>
              <TouchableOpacity onPress={() => setShowEmergencyModal(false)}>
                <MaterialIcons name="close" size={24} color={c.textSecondary} />
              </TouchableOpacity>
            </View>

            {emergencyStep === 'menu' ? (
              <View style={styles.emergencyMenu}>
                {[
                  { 
                    id: 'move', label: 'Males Gerak', icon: 'fitness-center', color: '#f87171',
                    title: 'BODY RESET', 
                    steps: ['Berdiri & loncat-loncat 10x', 'Regangkan tangan ke atas', 'Minum air putih segelas'] 
                  },
                  { 
                    id: 'scroll', label: 'Kena Doomscrolling', icon: 'phonelink-erase', color: '#60a5fa',
                    title: 'DIGITAL DETOX', 
                    steps: ['Taruh HP telungkup', 'Cuci muka air dingin', 'Ambil napas dalam 5x'] 
                  },
                  { 
                    id: 'overwhelmed', label: 'Overwhelmed', icon: 'blur-on', color: '#fbbf24',
                    title: 'BRAIN DUMP', 
                    steps: ['Tulis 1 hal paling penting', 'Bilang "Gua bisa" 3x', 'Tarik napas tahan 4 detik'] 
                  },
                  { 
                    id: 'lost', label: 'Gatau Mau Ngapain', icon: 'explore', color: '#c084fc',
                    title: 'QUICK START', 
                    steps: ['Rapikan meja lo 1 menit', 'Buka task list paling atas', 'Mulai 2 menit Micro Mode'] 
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
                    STEP {currentStepIndex + 1}/{selectedEmergency?.steps.length}
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
                      addXP('TASK_COMPLETE');
                    }
                  }}
                >
                  <Text style={styles.nextBtnText}>
                    {currentStepIndex < selectedEmergency?.steps.length - 1 ? 'LANJUT BROK!' : 'BERES, GUA BALIK! '}
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
          <View style={[styles.dnaDetailContent, { backgroundColor: c.bgSecondary }]}>
            <View style={styles.emergencyHeader}>
              <View>
                <Text style={[styles.emergencyTitle, { color: c.textPrimary }]}>LIFE SCORE DNA</Text>
                <Text style={[styles.dnaDetailSubtitle, { color: c.textSecondary }]}>Analisia perkembangan diri lo</Text>
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
                      <Text style={[styles.dnaStatLabel, { color: c.textPrimary }]}>{d.label}</Text>
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
                      {d.label === 'MIND' ? 'Fokus & konsentrasi belajar lo.' : 
                       d.label === 'BODY' ? 'Kesehatan fisik & kebugaran.' : 
                       d.label === 'MONEY' ? 'Kontrol finansial & tabungan.' : 
                       d.label === 'SOUL' ? 'Kesehatan mental & refleksi diri.' : 
                       d.label === 'GROWTH' ? 'Progres goals & habit baru.' : 
                       'Kualitas hubungan sosial lo.'}
                    </Text>
                  </View>
                ))}
              </View>
              
              <TouchableOpacity 
                style={[styles.dnaCloseBtn, { backgroundColor: c.purple }]}
                onPress={() => setShowDNAModal(false)}
              >
                <Text style={styles.dnaCloseBtnText}>SIAP, LANJUTKAN!</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: MOBILE_SPACING.screen },
  header: { marginBottom: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerSubtitle: { fontSize: 15, marginTop: 4 },
  greeting: { fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },

  card: { borderRadius: 28, padding: 20, marginBottom: 20, borderWidth: 1 },
  xpHeader: { marginBottom: 12 },
  xpTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  xpTitle: { fontSize: 18, fontWeight: '900' },
  levelBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  levelBadgeText: { fontSize: 11, fontWeight: '900' },
  xpTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 4 },
  xpText: { fontSize: 12, fontWeight: '700' },

  dnaContainer: { 
    alignItems: 'center', 
    justifyContent: 'center',
    width: 130, // Fixed width to ensure labels have space
    marginLeft: 8,
  },
  radialLabel: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.6 },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingRight: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginLeft: 4 },
  insightsScroll: { gap: 12, paddingBottom: 24, paddingLeft: 4 },
  insightCard: { width: 280, padding: 16, borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 12, alignItems: 'center' },
  insightIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  insightTitle: { fontSize: 14, fontWeight: '900', marginBottom: 2 },
  insightMsg: { fontSize: 12, fontWeight: '600', lineHeight: 18 },

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
});
