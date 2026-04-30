import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, RefreshControl,
  StyleSheet, Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { MOBILE_SPACING, getTwoColumnCardWidth, useMobileLayout } from '../../lib/layout';
import { getData, STORAGE_KEYS } from '../../lib/storage';
import { greetingTime, getToday, formatCurrency } from '../../lib/helpers';
import { getXP, getCurrentLevel, getXPProgress, checkDailyLogin } from '../../lib/gamification';

export default function DashboardScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
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

  const loadData = useCallback(async () => {
    const [tasks, habits, transactions, pomodoro, goals, books, journal, health, xp] = await Promise.all([
      getData(STORAGE_KEYS.TASKS),
      getData(STORAGE_KEYS.HABITS),
      getData(STORAGE_KEYS.TRANSACTIONS),
      getData(STORAGE_KEYS.POMODORO),
      getData(STORAGE_KEYS.GOALS),
      getData(STORAGE_KEYS.READING),
      getData(STORAGE_KEYS.JOURNAL),
      getData(STORAGE_KEYS.HEALTH),
      getXP(),
    ]);

    const t = tasks || [];
    const h = habits || [];
    const tx = transactions || [];
    const p = pomodoro || { sessions: [] };
    const g = goals || [];
    const b = books || [];
    const j = journal || [];
    const hl = health || { workouts: [] };

    const completedTasks = t.filter((x: any) => x.status === 'done').length;
    const todayHabits = h.filter((x: any) => x.completedDates?.includes(today)).length;
    let maxStreak = 0;
    h.forEach((x: any) => { if (x.streak && x.streak > maxStreak) maxStreak = x.streak; });
    const income = tx.filter((x: any) => x.type === 'income').reduce((s: number, x: any) => s + x.amount, 0);
    const expense = tx.filter((x: any) => x.type === 'expense').reduce((s: number, x: any) => s + x.amount, 0);
    const todaySessions = p.sessions?.filter((s: any) => s.date === today).length || 0;
    const activeGoals = g.filter((x: any) => !x.completed).length;
    const readingBooks = b.filter((x: any) => x.status === 'reading').length;
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const workoutsWeek = hl.workouts?.filter((w: any) => new Date(w.date) >= weekAgo).length || 0;

    setStats({
      tasksCompleted: completedTasks, tasksTotal: t.length,
      habitsToday: todayHabits, habitsTotal: h.length,
      streak: maxStreak, totalIncome: income, totalExpense: expense,
      focusSessions: todaySessions, goalsActive: activeGoals,
      booksReading: readingBooks, journalEntries: j.length,
      workoutsThisWeek: workoutsWeek,
    });
    setGamData(xp);
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

  const statCards = [
    { label: 'Tasks Selesai', value: `${stats.tasksCompleted}/${stats.tasksTotal}`, icon: 'check-box' as const, color: c.purple, bg: c.purple + '22' },
    { label: 'Streak Terlama', value: `${stats.streak}`, icon: 'local-fire-department' as const, color: c.red, bg: c.red + '22' },
    { label: 'Saldo Bersih', value: formatCurrency(stats.totalIncome - stats.totalExpense), icon: 'account-balance-wallet' as const, color: c.green, bg: c.green + '22' },
    { label: 'Sesi Fokus', value: `${stats.focusSessions}`, icon: 'timer' as const, color: c.cyan, bg: c.cyan + '22' },
  ];

  const quickActions = [
    { label: 'Tasks', icon: 'checklist' as const, route: '/tasks', color: c.purple },
    { label: 'Habits', icon: 'local-fire-department' as const, route: '/habits', color: c.green },
    { label: 'Pomodoro', icon: 'timer' as const, route: '/pomodoro', color: c.cyan },
    { label: 'Finance', icon: 'account-balance-wallet' as const, route: '/finance', color: '#10b981' },
    { label: 'Goals', icon: 'flag' as const, route: '/goals', color: '#f59e0b' },
    { label: 'Reading', icon: 'menu-book' as const, route: '/reading', color: '#8b5cf6' },
    { label: 'Health', icon: 'fitness-center' as const, route: '/health', color: '#ef4444' },
    { label: 'Journal', icon: 'create' as const, route: '/journal', color: '#ec4899' },
  ];

  const quickStats = [
    { label: 'Goal Aktif', value: stats.goalsActive, icon: 'flag' as const },
    { label: 'Buku Dibaca', value: stats.booksReading, icon: 'menu-book' as const },
    { label: 'Total Jurnal', value: stats.journalEntries, icon: 'edit-note' as const },
    { label: 'Workout Minggu Ini', value: stats.workoutsThisWeek, icon: 'fitness-center' as const },
  ];

  const habitPercent = stats.habitsTotal > 0 ? Math.round((stats.habitsToday / stats.habitsTotal) * 100) : 0;
  const taskPercent = stats.tasksTotal > 0 ? Math.round((stats.tasksCompleted / stats.tasksTotal) * 100) : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bgPrimary }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.purple} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.content, { paddingTop: layout.topPadding, paddingBottom: layout.bottomPadding }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: c.textPrimary }]}>
            {greetingTime()} 👋
          </Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            Berikut ringkasan produktivitasmu hari ini.
          </Text>
        </View>

        {/* XP Progress */}
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          <View style={styles.xpHeader}>
            <View style={styles.xpTitleRow}>
              <Text style={{ fontSize: 22 }}>🏆</Text>
              <Text style={[styles.xpTitle, { color: c.textPrimary }]}>{level.title}</Text>
              <View style={[styles.levelBadge, { backgroundColor: level.color + '22' }]}>
                <Text style={[styles.levelBadgeText, { color: level.color }]}>Lv. {level.level}</Text>
              </View>
            </View>
          </View>
          <View style={[styles.xpTrack, { backgroundColor: c.border }]}>
            <View style={[styles.xpFill, { width: `${progress.percent}%`, backgroundColor: level.color }]} />
          </View>
          <View style={styles.xpFooter}>
            <Text style={[styles.xpText, { color: c.textSecondary }]}>{gamData.totalXP} XP Total</Text>
            <Text style={[styles.xpText, { color: c.textSecondary }]}>
              {progress.percent}% → Lv. {level.level + 1}
            </Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statCards.map((s, i) => (
            <View key={i} style={[styles.statCard, { width: columnWidth, backgroundColor: c.bgCard, borderColor: c.border }]}>
              <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                <MaterialIcons name={s.icon} size={24} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: c.textPrimary }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: c.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Today's Progress */}
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="trending-up" size={18} color={c.purple} />
            <Text style={[styles.cardTitle, { color: c.textPrimary }]}>Progress Hari Ini</Text>
          </View>

          <View style={styles.progressItem}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: c.textSecondary }]}>Habits Selesai</Text>
              <Text style={[styles.progressValue, { color: c.textPrimary }]}>{stats.habitsToday}/{stats.habitsTotal}</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
              <View style={[styles.progressFill, { width: `${habitPercent}%`, backgroundColor: c.green }]} />
            </View>
          </View>

          <View style={styles.progressItem}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: c.textSecondary }]}>Tasks Selesai</Text>
              <Text style={[styles.progressValue, { color: c.textPrimary }]}>{stats.tasksCompleted}/{stats.tasksTotal}</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
              <View style={[styles.progressFill, { width: `${taskPercent}%`, backgroundColor: c.purple }]} />
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="emoji-events" size={18} color={c.yellow} />
            <Text style={[styles.cardTitle, { color: c.textPrimary }]}>Statistik</Text>
          </View>
          {quickStats.map((qs, i) => (
            <View key={i} style={[styles.quickStatRow, i < quickStats.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border }]}>
              <View style={styles.quickStatLeft}>
                <MaterialIcons name={qs.icon} size={16} color={c.textSecondary} />
                <Text style={[styles.quickStatLabel, { color: c.textSecondary }]}>{qs.label}</Text>
              </View>
              <Text style={[styles.quickStatValue, { color: c.textPrimary }]}>{qs.value}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Aksi Cepat</Text>
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
  greeting: { fontSize: 34, fontWeight: '900', marginBottom: 8, lineHeight: 40 },
  subtitle: { fontSize: 16, lineHeight: 24 },

  card: { borderRadius: MOBILE_SPACING.cardRadius, padding: MOBILE_SPACING.cardPadding, marginBottom: 18, borderWidth: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardTitle: { fontSize: 20, fontWeight: '800' },

  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  xpTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  xpTitle: { fontSize: 18, fontWeight: '800' },
  levelBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  levelBadgeText: { fontSize: 12, fontWeight: '800' },
  xpTrack: { height: 10, borderRadius: 999, overflow: 'hidden', marginBottom: 10 },
  xpFill: { height: '100%', borderRadius: 8 },
  xpFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  xpText: { fontSize: 13, fontWeight: '600' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: MOBILE_SPACING.gap, marginBottom: 18 },
  statCard: { borderRadius: 20, paddingVertical: 22, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1, minHeight: 148, justifyContent: 'center' },
  statIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  statValue: { fontSize: 22, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  statLabel: { fontSize: 13, fontWeight: '500', textAlign: 'center', lineHeight: 18 },

  progressItem: { marginBottom: 16 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 15, fontWeight: '500' },
  progressValue: { fontSize: 15, fontWeight: '700' },
  progressTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6 },

  quickStatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  quickStatLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quickStatLabel: { fontSize: 15 },
  quickStatValue: { fontSize: 17, fontWeight: '800' },

  sectionTitle: { fontSize: 22, fontWeight: '800', marginBottom: 14 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: MOBILE_SPACING.gap, marginBottom: 24 },
  actionCard: { borderRadius: 20, paddingVertical: 20, paddingHorizontal: 16, alignItems: 'center', borderWidth: 1, minHeight: 128, justifyContent: 'center' },
  actionIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionLabel: { fontSize: 14, fontWeight: '700' },
});
