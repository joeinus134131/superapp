import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { MOBILE_SPACING, useMobileLayout } from '../../lib/layout';
import { getData, STORAGE_KEYS } from '../../lib/storage';
import { getCurrentLevel, getXPProgress, getNextLevel } from '../../lib/gamification';
import { PageHeader } from '../../components/PageHeader';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  xpRequired?: number;
  condition: string;
  unlockedAt?: string;
}

const ALL_ACHIEVEMENTS: Achievement[] = [
  // XP Milestones
  { id: 'xp_100', title: 'Starter', description: 'Kumpulkan 100 XP', icon: 'star', color: '#10b981', xpRequired: 100, condition: 'xp' },
  { id: 'xp_300', title: 'Learner', description: 'Kumpulkan 300 XP', icon: 'school', color: '#3b82f6', xpRequired: 300, condition: 'xp' },
  { id: 'xp_600', title: 'Achiever', description: 'Kumpulkan 600 XP', icon: 'emoji-events', color: '#8b5cf6', xpRequired: 600, condition: 'xp' },
  { id: 'xp_1000', title: 'Warrior', description: 'Kumpulkan 1000 XP', icon: 'shield', color: '#f59e0b', xpRequired: 1000, condition: 'xp' },
  { id: 'xp_2200', title: 'Grandmaster', description: 'Kumpulkan 2200 XP', icon: 'military-tech', color: '#ec4899', xpRequired: 2200, condition: 'xp' },
  { id: 'xp_5500', title: 'Champion', description: 'Kumpulkan 5500 XP', icon: 'workspace-premium', color: '#eab308', xpRequired: 5500, condition: 'xp' },
  // Tasks
  { id: 'task_1', title: 'Mulai Bergerak', description: 'Selesaikan 1 tugas', icon: 'check-circle', color: '#10b981', condition: 'tasks' },
  { id: 'task_10', title: 'Produktif', description: 'Selesaikan 10 tugas', icon: 'done-all', color: '#3b82f6', condition: 'tasks' },
  { id: 'task_50', title: 'Task Master', description: 'Selesaikan 50 tugas', icon: 'task-alt', color: '#8b5cf6', condition: 'tasks' },
  // Habits
  { id: 'habit_1', title: 'Pembentuk Kebiasaan', description: 'Buat 1 kebiasaan', icon: 'local-fire-department', color: '#f59e0b', condition: 'habits' },
  { id: 'habit_7', title: 'Streak Week', description: 'Capai streak 7 hari di satu kebiasaan', icon: 'whatshot', color: '#ef4444', condition: 'habit_streak' },
  // Journal
  { id: 'journal_1', title: 'Penulis Pertama', description: 'Tulis 1 jurnal', icon: 'create', color: '#10b981', condition: 'journal' },
  { id: 'journal_10', title: 'Journaler', description: 'Tulis 10 jurnal', icon: 'auto-stories', color: '#3b82f6', condition: 'journal' },
  // Books
  { id: 'book_1', title: 'Pembaca', description: 'Selesaikan 1 buku', icon: 'menu-book', color: '#8b5cf6', condition: 'books' },
  { id: 'book_5', title: 'Kutu Buku', description: 'Selesaikan 5 buku', icon: 'library-books', color: '#ec4899', condition: 'books' },
  // Goals
  { id: 'goal_1', title: 'Goal Setter', description: 'Capai 1 tujuan', icon: 'flag', color: '#10b981', condition: 'goals' },
  { id: 'goal_5', title: 'Goal Crusher', description: 'Capai 5 tujuan', icon: 'outlined-flag', color: '#f59e0b', condition: 'goals' },
  // Pomodoro
  { id: 'pomo_1', title: 'First Focus', description: 'Selesaikan 1 sesi pomodoro', icon: 'timer', color: '#ef4444', condition: 'pomodoro' },
  { id: 'pomo_25', title: 'Deep Work', description: 'Selesaikan 25 sesi pomodoro', icon: 'hourglass-full', color: '#8b5cf6', condition: 'pomodoro' },
  // Health
  { id: 'workout_1', title: 'Olahraga Pertama', description: 'Log 1 sesi workout', icon: 'fitness-center', color: '#10b981', condition: 'workouts' },
  { id: 'workout_20', title: 'Atlet', description: 'Log 20 sesi workout', icon: 'sports', color: '#3b82f6', condition: 'workouts' },
  // Finance
  { id: 'finance_1', title: 'Financial Aware', description: 'Catat 1 transaksi keuangan', icon: 'account-balance-wallet', color: '#10b981', condition: 'transactions' },
];

interface Stats {
  xp: number;
  tasks: number;
  habits: number;
  maxHabitStreak: number;
  journal: number;
  books: number;
  goals: number;
  pomodoro: number;
  workouts: number;
  transactions: number;
}

async function computeStats(): Promise<Stats> {
  const [gamData, tasksData, habitsData, journalData, readingData, goalsData, pomodoroData, healthData, financeData] = await Promise.all([
    getData(STORAGE_KEYS.GAMIFICATION),
    getData(STORAGE_KEYS.TASKS),
    getData(STORAGE_KEYS.HABITS),
    getData(STORAGE_KEYS.JOURNAL),
    getData(STORAGE_KEYS.READING),
    getData(STORAGE_KEYS.GOALS),
    getData(STORAGE_KEYS.POMODORO),
    getData(STORAGE_KEYS.HEALTH),
    getData(STORAGE_KEYS.TRANSACTIONS),
  ]);
  const tasks = (tasksData || []).filter((t: any) => t.completed).length;
  const habits = (habitsData || []).length;
  const maxHabitStreak = Math.max(0, ...(habitsData || []).map((h: any) => h.streak || 0));
  const journal = (journalData || []).length;
  const books = (readingData || []).filter((b: any) => b.status === 'completed').length;
  const goals = (goalsData || []).filter((g: any) => g.completed).length;
  const sessions = pomodoroData?.sessions || [];
  const pomodoro = sessions.length;
  const workouts = (healthData?.workouts || []).length;
  const transactions = (financeData || []).length;
  return { xp: gamData?.totalXP || 0, tasks, habits, maxHabitStreak, journal, books, goals, pomodoro, workouts, transactions };
}

function isUnlocked(achievement: Achievement, stats: Stats): boolean {
  switch (achievement.condition) {
    case 'xp': return stats.xp >= (achievement.xpRequired || 0);
    case 'tasks': {
      const req = parseInt(achievement.id.split('_')[1]);
      return stats.tasks >= req;
    }
    case 'habits': {
      const req = parseInt(achievement.id.split('_')[1]);
      return stats.habits >= req;
    }
    case 'habit_streak': return stats.maxHabitStreak >= 7;
    case 'journal': {
      const req = parseInt(achievement.id.split('_')[1]);
      return stats.journal >= req;
    }
    case 'books': {
      const req = parseInt(achievement.id.split('_')[1]);
      return stats.books >= req;
    }
    case 'goals': {
      const req = parseInt(achievement.id.split('_')[1]);
      return stats.goals >= req;
    }
    case 'pomodoro': {
      const req = parseInt(achievement.id.split('_')[1]);
      return stats.pomodoro >= req;
    }
    case 'workouts': {
      const req = parseInt(achievement.id.split('_')[1]);
      return stats.workouts >= req;
    }
    case 'transactions': return stats.transactions >= 1;
    default: return false;
  }
}

export default function AchievementsScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();
  const [stats, setStats] = useState<Stats>({ xp: 0, tasks: 0, habits: 0, maxHabitStreak: 0, journal: 0, books: 0, goals: 0, pomodoro: 0, workouts: 0, transactions: 0 });
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const s = await computeStats();
    setStats(s);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const enriched = ALL_ACHIEVEMENTS.map(a => ({ ...a, unlocked: isUnlocked(a, stats) }));
  const filtered = filter === 'all' ? enriched : filter === 'unlocked' ? enriched.filter(a => a.unlocked) : enriched.filter(a => !a.unlocked);
  const unlockedCount = enriched.filter(a => a.unlocked).length;

  const level = getCurrentLevel(stats.xp);
  const next = getNextLevel(stats.xp);
  const progress = getXPProgress(stats.xp);

  const s = styles(c, isDark);

  return (
    <View style={s.container}>
      <PageHeader
        title="Pencapaian"
        subtitle={`${unlockedCount}/${ALL_ACHIEVEMENTS.length} terbuka`}
        textColor={c.textPrimary}
        subtextColor={c.textSecondary}
        backgroundColor={c.bgPrimary}
      />

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.purple} />}
        contentContainerStyle={[s.listContent, { paddingBottom: layout.bottomPadding }]}
        numColumns={2}
        columnWrapperStyle={s.row}
        ListHeaderComponent={
          <ScrollView>
            {/* Level Card */}
            <View style={s.levelCard}>
              <View style={[s.levelBadge, { backgroundColor: level.color + '20' }]}>
                <MaterialIcons name="military-tech" size={36} color={level.color} />
              </View>
              <View style={s.levelInfo}>
                <Text style={s.levelTitle}>Level {level.level}: {level.title}</Text>
                <Text style={s.levelXP}>{stats.xp} XP total</Text>
                {next && (
                  <>
                    <View style={s.xpBar}>
                      <View style={[s.xpFill, { width: `${progress.percent}%` as any, backgroundColor: level.color }]} />
                    </View>
                    <Text style={s.xpText}>{progress.current}/{progress.needed} XP ke level {next.level}</Text>
                  </>
                )}
                {!next && <Text style={[s.xpText, { color: '#eab308' }]}>Level Maksimum!</Text>}
              </View>
            </View>

            {/* Stats Summary */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={s.statsRow}>
              {[
                { label: 'Tasks', value: stats.tasks, icon: 'check-circle', color: '#10b981' },
                { label: 'Jurnal', value: stats.journal, icon: 'create', color: '#3b82f6' },
                { label: 'Buku', value: stats.books, icon: 'menu-book', color: '#8b5cf6' },
                { label: 'Fokus', value: stats.pomodoro, icon: 'timer', color: '#ef4444' },
                { label: 'Workout', value: stats.workouts, icon: 'fitness-center', color: '#10b981' },
                { label: 'Goals', value: stats.goals, icon: 'flag', color: '#f59e0b' },
              ].map(stat => (
                <View key={stat.label} style={s.statChip}>
                  <MaterialIcons name={stat.icon as any} size={16} color={stat.color} />
                  <Text style={[s.statVal, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={s.statLbl}>{stat.label}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Filter */}
            <View style={s.filterRow}>
              {(['all', 'unlocked', 'locked'] as const).map(f => (
                <TouchableOpacity key={f} style={[s.filterChip, filter === f && s.filterChipActive]} onPress={() => setFilter(f)}>
                  <Text style={[s.filterText, filter === f && { color: '#fff' }]}>
                    {f === 'all' ? 'Semua' : f === 'unlocked' ? 'Terbuka' : 'Terkunci'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        }
        renderItem={({ item }) => (
          <View style={[s.achieveCard, !item.unlocked && s.achieveCardLocked]}>
            <View style={[s.achieveIcon, { backgroundColor: item.unlocked ? item.color + '20' : c.bgSecondary }]}>
              <MaterialIcons name={item.icon as any} size={28} color={item.unlocked ? item.color : c.textMuted} />
              {!item.unlocked && (
                <View style={s.lockOverlay}>
                  <MaterialIcons name="lock" size={14} color={c.textMuted} />
                </View>
              )}
            </View>
            <Text style={[s.achieveTitle, !item.unlocked && { color: c.textMuted }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[s.achieveDesc, { color: item.unlocked ? c.textSecondary : c.textMuted }]} numberOfLines={2}>{item.description}</Text>
            {item.unlocked && <View style={[s.unlockBadge, { backgroundColor: item.color }]}><Text style={s.unlockBadgeText}>Terbuka</Text></View>}
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <MaterialIcons name="emoji-events" size={48} color={c.textMuted} />
            <Text style={s.emptyText}>Tidak ada pencapaian di kategori ini</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = (c: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgPrimary },
  listContent: { paddingHorizontal: MOBILE_SPACING.screen, paddingTop: 14 },
  row: { gap: 12, marginBottom: 12 },
  levelCard: { backgroundColor: c.bgCard, borderRadius: 16, padding: 16, flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: c.border },
  levelBadge: { width: 64, height: 64, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  levelInfo: { flex: 1, gap: 4 },
  levelTitle: { fontSize: 16, fontWeight: '800', color: c.textPrimary },
  levelXP: { fontSize: 13, color: c.textSecondary },
  xpBar: { height: 6, backgroundColor: c.border, borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  xpFill: { height: '100%', borderRadius: 3 },
  xpText: { fontSize: 11, color: c.textMuted },
  statsRow: { gap: 8, paddingHorizontal: 2 },
  statChip: { backgroundColor: c.bgCard, borderRadius: 12, padding: 10, alignItems: 'center', gap: 2, minWidth: 68, borderWidth: 1, borderColor: c.border },
  statVal: { fontSize: 16, fontWeight: '800' },
  statLbl: { fontSize: 10, color: c.textMuted, fontWeight: '600' },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterChip: { flex: 1, minHeight: 42, paddingVertical: 8, borderRadius: 12, backgroundColor: c.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
  filterChipActive: { backgroundColor: c.purple, borderColor: c.purple },
  filterText: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
  achieveCard: { flex: 1, backgroundColor: c.bgCard, borderRadius: 16, padding: 14, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: c.border },
  achieveCardLocked: { opacity: 0.7 },
  achieveIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  lockOverlay: { position: 'absolute', bottom: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 2 },
  achieveTitle: { fontSize: 13, fontWeight: '800', color: c.textPrimary, textAlign: 'center' },
  achieveDesc: { fontSize: 11, textAlign: 'center', lineHeight: 15 },
  unlockBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  unlockBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 15, color: c.textMuted, textAlign: 'center' },
});
