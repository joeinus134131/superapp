import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, Dimensions, Image, Animated as RNAnimated, Easing
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Svg, { Circle, G, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { useLanguage } from '../../context/languageContext';
import { MOBILE_SPACING, getTwoColumnCardWidth, useMobileLayout } from '../../lib/layout';
import { getData, STORAGE_KEYS } from '../../lib/storage';
import { EncryptedStorage } from '../../lib/secureStorage';
import { greetingTime, getToday, formatCurrency } from '../../lib/helpers';
import { getXP, getCurrentLevel, getXPProgress, checkDailyLogin } from '../../lib/gamification';
import { generateSmartInsights, Insight } from '../../lib/insights';
import { BrandLogo } from '../../components/BrandLogo';

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
  const [insights, setInsights] = useState<Insight[]>([]);
  const [stats, setStats] = useState({
    tasksCompleted: 0, tasksTotal: 0,
    habitsToday: 0, habitsTotal: 0,
    streak: 0, totalIncome: 0, totalExpense: 0,
    focusSessions: 0, goalsActive: 0,
    booksReading: 0, journalEntries: 0,
    workoutsThisWeek: 0,
  });

  const fadeAnim = useRef(new RNAnimated.Value(0)).current;

  const loadData = useCallback(async () => {
    const [tasks, habits, transactions, pomodoro, goals, books, journal, health, xp, smartInsights] = await Promise.all([
      getData(STORAGE_KEYS.TASKS),
      getData(STORAGE_KEYS.HABITS),
      EncryptedStorage.getItem(STORAGE_KEYS.TRANSACTIONS),
      getData(STORAGE_KEYS.POMODORO),
      getData(STORAGE_KEYS.GOALS),
      getData(STORAGE_KEYS.READING),
      getData(STORAGE_KEYS.JOURNAL),
      getData(STORAGE_KEYS.HEALTH),
      getXP(),
      generateSmartInsights()
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
    setInsights(smartInsights);
    RNAnimated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, [today]);

  useEffect(() => {
    loadData();
    checkDailyLogin();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const level = getCurrentLevel(gamData.totalXP);
  const progress = getXPProgress(gamData.totalXP);

  // Productivity Score Logic
  const habitRate = stats.habitsTotal > 0 ? stats.habitsToday / stats.habitsTotal : 1;
  const taskRate = stats.tasksTotal > 0 ? stats.tasksCompleted / stats.tasksTotal : 1;
  const focusRate = Math.min(stats.focusSessions / 4, 1);
  const productivityScore = Math.round(((habitRate + taskRate + focusRate) / 3) * 100);

  // Radial Chart Constants
  const radius = 60;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (productivityScore / 100) * circumference;

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
        {/* Header with Logo */}
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

        {/* Productivity Score & XP Card */}
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
          
          <View style={styles.radialContainer}>
            <Svg height={radius * 2} width={radius * 2}>
              <Defs>
                <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={c.purple} />
                  <Stop offset="100%" stopColor={c.cyan} />
                </LinearGradient>
              </Defs>
              <Circle
                stroke={c.border}
                fill="transparent"
                strokeWidth={stroke}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <Circle
                stroke="url(#grad)"
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                transform={`rotate(-90 ${radius} ${radius})`}
              />
              <SvgText
                x="50%"
                y="50%"
                dy=".3em"
                textAnchor="middle"
                fontSize="18"
                fontWeight="900"
                fill={c.textPrimary}
              >
                {productivityScore}%
              </SvgText>
            </Svg>
            <Text style={[styles.radialLabel, { color: c.textMuted }]}>{t('insights.productivity_index')}</Text>
          </View>
        </View>

        {/* Smart Insights Carousel */}
        <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Smart Insights</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.insightsScroll}>
          {insights.map((insight) => (
            <TouchableOpacity
              key={insight.id}
              style={[styles.insightCard, { backgroundColor: insight.color + '15', borderColor: insight.color + '44' }]}
              onPress={() => insight.actionRoute && router.push(insight.actionRoute as any)}
            >
              <View style={[styles.insightIcon, { backgroundColor: insight.color }]}>
                <MaterialIcons name={insight.icon as any} size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.insightTitle, { color: insight.color }]}>{t(insight.titleKey)}</Text>
                <Text style={[styles.insightMsg, { color: c.textPrimary }]} numberOfLines={2}>
                  {insight.messageArgs 
                    ? t(insight.messageKey).replace('{count}', insight.messageArgs.count.toString()) 
                    : t(insight.messageKey)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
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

  radialContainer: { alignItems: 'center', marginLeft: 20 },
  radialLabel: { fontSize: 10, fontWeight: '800', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },

  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 16, marginLeft: 4 },
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
});
