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
import { LevelUpModal } from '../../components/LevelUpModal';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { QuickCaptureModal } from '../../components/QuickCaptureModal';
import { CrossModuleInsights } from '../../components/CrossModuleInsights';

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
  const { insights, loading: loadingInsights, refreshInsights } = useAIInsights();
  
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<any>(null);
  const [newLevelData, setNewLevelData] = useState<any>(null);
  const [isMager, setIsMager] = useState(false);
  const [emergencyStep, setEmergencyStep] = useState<'menu' | 'mission'>('menu');
  const [selectedEmergency, setSelectedEmergency] = useState<any>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showDNAModal, setShowDNAModal] = useState(false);
  const [showQuickCapture, setShowQuickCapture] = useState(false);

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
    const checkMager = () => {
      const hour = new Date().getHours();
      // Logic: After 9 AM, if no tasks and no habits done, you are MAGER
      const isActuallyMager = hour >= 9 && stats.tasksCompleted === 0 && stats.habitsToday === 0;
      
      if (isActuallyMager && !isMager) {
        setIsMager(true);
        sendImmediateNotification("🚨 DARURAT MAGER!", "Sistem ngeliat lo belum gerak nih. Mau bantuan?");
      } else if (!isActuallyMager && isMager) {
        setIsMager(false);
      }
    };
    checkMager();
  }, [stats.tasksCompleted, stats.habitsToday]);

  useEffect(() => {
    loadData();
    checkDailyLogin();
    registerForPushNotificationsAsync();
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
    { label: t('sidebar.reading'), icon: 'menu-book' as const, route: '/reading', color: '#8b5cf6' },
    { label: t('sidebar.health'), icon: 'fitness-center' as const, route: '/health', color: '#ef4444' },
    { label: t('sidebar.journal'), icon: 'create' as const, route: '/journal', color: '#ec4899' },
  ];

  return (
    <View style={{ flex: 1 }}>
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
                <Text style={{ fontSize: 18 }}>📖</Text>
                <Text style={[styles.xpTitle, { color: c.textPrimary }]}>{level.title}</Text>
                {insights.some(i => i.xpMultiplier && i.xpMultiplier > 1) && (
                  <View style={[styles.boostBadge, { backgroundColor: c.purple }]}>
                    <MaterialIcons name="bolt" size={12} color="#fff" />
                    <Text style={styles.boostBadgeText}>{t('dashboard.xp_boost')}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={[styles.xpTrack, { backgroundColor: c.border }]}>
              <View style={[styles.xpFill, { width: `${progress.percent}%`, backgroundColor: level.color }]} />
            </View>
            <Text style={[styles.xpText, { color: c.textSecondary, marginTop: 8 }]}>
              {gamData.totalXP} XP • {progress.percent}% {t('gamification.to_next')} Chapter {level.level + 1}
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

        {isMager && (
          <RNAnimated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity 
              style={[styles.emergencyBtn, { backgroundColor: c.red, marginBottom: 24 }]} 
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
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.emergencyBtnText}>DARURAT MAGER</Text>
                <Text style={styles.emergencySubtitle}>AI deteksi hambatan produktivitas lo!</Text>
              </View>
              <MaterialIcons name="arrow-forward-ios" size={16} color="#fff" style={{ opacity: 0.7 }} />
            </TouchableOpacity>
          </RNAnimated.View>
        )}

        <DailyQuestCard />

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>{t('insights.title')}</Text>
        </View>

        <CrossModuleInsights isDark={isDark} />

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
      <Modal visible={showEmergencyModal} animationType="fade" transparent>
        <View style={styles.emergencyOverlay}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[styles.emergencyContent, { backgroundColor: c.bgSecondary + 'EE' }]}>
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
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[styles.dnaDetailContent, { backgroundColor: c.bgSecondary + 'EE' }]}>
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
                <Text style={[styles.insightCloseBtnText, { color: c.textPrimary }]}>TUTUP</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.insightGoBtn, { backgroundColor: c.purple }]} 
                onPress={() => {
                  setShowInsightModal(false);
                  const routeMap: any = { 
                    'HABIT': 'habits', 
                    'TASK': 'tasks', 
                    'FINANCE': 'finance', 
                    'FOCUS': 'pomodoro' 
                  };
                  const target = routeMap[selectedInsight?.type as any];
                  if (target) {
                    router.push(target as any);
                  }
                }}
              >
                <Text style={styles.insightGoBtnText}>GAS SEKARANG</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
      
      <TouchableOpacity 
        style={{
          position: 'absolute',
          bottom: layout.bottomPadding + 20,
          right: 20,
          backgroundColor: c.purple,
          width: 56,
          height: 56,
          borderRadius: 28,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 5,
          elevation: 5,
        }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowQuickCapture(true);
        }}
      >
        <Text style={{ fontSize: 24, color: '#fff' }}>🔮</Text>
      </TouchableOpacity>

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
});
