import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet, DeviceEventEmitter, Image, ActivityIndicator, Alert, AppState, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { useLanguage } from '../../context/languageContext';
import { useSettings } from '../../context/settingsContext';
import { useAuth } from '../../hooks/useAuth';
import { useTasks, Task } from '../../hooks/useTasks';
import { useHabits } from '../../hooks/useHabits';
import { useNotificationHistory } from '../../hooks/useNotificationHistory';
import { useMobileLayout } from '../../lib/layout';
import { getToday, formatCurrency } from '../../lib/helpers';
import { dashboardSummary, dueDay } from '../../lib/dashboardSummary';
import { readDashboardSources } from '../../lib/dashboardSources';
import { financeReport } from '../../lib/financeReports';
import { lifeDnaMetrics } from '../../lib/lifeDna';
import { checkDailyLogin } from '../../lib/gamification';
import { registerForPushNotificationsAsync } from '../../lib/notifications';
import { BrandLogo } from '../../components/BrandLogo';
import { CrossModuleInsights } from '../../components/CrossModuleInsights';
import { DashboardSearch } from '../../components/DashboardSearch';
import { SyncStatusNotice } from '../../components/SyncStatusNotice';
import { NotificationSheet } from '../../components/NotificationSheet';
import { LifeDnaSheet } from '../../components/LifeDnaSheet';
import { LevelUpModal } from '../../components/LevelUpModal';
import { DashboardSection, DashboardEmptyState } from '../../components/ui/DashboardSection';
import { DashboardShortcuts } from '../../components/DashboardShortcuts';

export default function DashboardScreen() {
  const { language, t, tx: translateCopy } = useLanguage();
  const copy = (id: string, en: string) => language === 'id' ? id : en;
  const { isDark } = useTheme(); const c = useColors(isDark); const layout = useMobileLayout();
  const { fontScale } = useWindowDimensions(); const { user } = useAuth(); const router = useRouter();
  const { settings, updateSetting } = useSettings();
  const { tasks, loading: tasksLoading, error: taskError, moveTask, refreshTasks, levelUpData: taskLevel, setLevelUpData: setTaskLevel } = useTasks();
  const { habits, loading: habitsLoading, error: habitError, pendingId, rewardError, retryHabitReward, toggleHabit, refreshHabits, levelUpData: habitLevel, setLevelUpData: setHabitLevel } = useHabits();
  const history = useNotificationHistory();
  const [today, setToday] = useState(getToday);
  const [sources, setSources] = useState<any>({ goals: [], journal: [], transactions: [], profile: null, pomodoro: { sessions: [] }, health: { workouts: [] } });
  const [sourceErrors, setSourceErrors] = useState<string[]>([]); const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false); const [showDna, setShowDna] = useState(false);
  const [avatarError, setAvatarError] = useState(false); const [pendingTask, setPendingTask] = useState<string | null>(null);
  const [completedTask, setCompletedTask] = useState<Task | null>(null); const taskLock = useRef(false);
  const refreshSources = useCallback(async () => {
    setLoading(true);
    try { const result = await readDashboardSources(); setSources((prior: any) => ({ ...prior, ...result.values })); setSourceErrors(result.errors); }
    catch { setSourceErrors(['all']); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    setToday(getToday()); refreshSources(); refreshTasks(); refreshHabits(); history.refresh();
  }, [refreshSources, refreshTasks, refreshHabits, history.refresh]));
  useEffect(() => {
    const subscriptions = ['whenya:data-synced', 'whenya:journal-updated', 'whenya:goals-updated', 'whenya:finance-updated', 'whenya:profile-updated'].map(event => DeviceEventEmitter.addListener(event, refreshSources));
    return () => subscriptions.forEach(subscription => subscription.remove());
  }, [refreshSources]);
  useEffect(() => {
    const update = () => setToday(getToday()); const timer = setInterval(update, 60000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    checkDailyLogin().catch(() => {}); registerForPushNotificationsAsync();
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  useEffect(() => { setAvatarError(false); }, [sources.profile?.avatarUri]);
  const now = new Date(`${today}T12:00:00`); const summary = dashboardSummary(tasks, now);
  const month = financeReport(sources.transactions || [], now, 'month');
  const doneHabits = habits.filter(habit => habit.completedDates?.includes(today)).length;
  const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 6);
  const dna = lifeDnaMetrics({ tasks, habits, goals: sources.goals || [], today, journalCount: sources.journal?.length || 0,
    focusSessions: sources.pomodoro?.sessions?.filter((session: any) => session.date === today).length || 0,
    workouts: sources.health?.workouts?.filter((workout: any) => { const day = dueDay(workout.date); return day && day >= getToday(weekStart) && day <= today; }).length || 0,
    monthlyIncome: month.income, monthlyExpense: month.expense });
  const primaryGoal = (sources.goals || []).find((goal: any) => !goal.archived && !goal.completed);
  const nextStep = primaryGoal?.journey?.find((step: any) => !step.completed);
  const goalTask = primaryGoal ? tasks.find(task => task.goalId === primaryGoal.id && task.status !== 'done') : undefined;
  const goalProgress = Math.max(0, Math.min(100, Number(primaryGoal?.progress) || 0));
  const rawName = sources.profile?.displayName || sources.profile?.name || user?.name;
  const name = rawName?.trim().split(/\s+/)[0] || copy('Sahabat', 'Friend');
  const avatar = sources.profile?.avatarUri || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const all = copy('Lihat semua', 'View all'); const locale = language === 'id' ? 'id-ID' : 'en-US';
  const open = (route: string) => router.push(`/(app)/${route}` as any);
  const create = (route: string) => router.push({ pathname: `/(app)/${route}`, params: { create: String(Date.now()) } } as any);
  const saveFailed = () => Alert.alert(copy('Perubahan belum tersimpan', 'Changes were not saved'), copy('Data sebelumnya tetap tersedia. Silakan coba lagi.', 'Previous data is still available. Please retry.'));
  const finish = async (task: Task, undo = false) => {
    if (taskLock.current) return; taskLock.current = true; setPendingTask(task.id);
    try { await moveTask(task.id, undo ? task.status : 'done'); setCompletedTask(undo ? null : task); }
    catch { saveFailed(); } finally { taskLock.current = false; setPendingTask(null); }
  };
  const changeHabit = async (id: string) => { try { await toggleHabit(id); } catch { saveFailed(); } };
  const refresh = async () => {
    setRefreshing(true); setToday(getToday());
    try { await Promise.all([refreshSources(), refreshTasks(), refreshHabits(), history.refresh()]); }
    finally { setRefreshing(false); }
  };
  const titleCategory = (category: string) => { const key = `tasks.cat_${category.toLowerCase()}`; const label = t(key); return label === key || label.startsWith('cat_') ? category : label; };
  const card = [styles.card, { backgroundColor: c.bgCard, borderColor: c.border }];
  const text = { color: c.textPrimary }; const secondary = { color: c.textSecondary, fontSize: 14, lineHeight: 21 };
  return <View style={{ flex: 1, backgroundColor: c.bgPrimary }}>
    <DashboardSearch visible={showSearch} onClose={() => setShowSearch(false)} tasks={tasks} goals={sources.goals || []} />
    <NotificationSheet visible={showNotifications} onClose={() => setShowNotifications(false)} history={history} />
    <LifeDnaSheet visible={showDna} onClose={() => setShowDna(false)} data={dna} unavailable={sourceErrors.length > 0 || taskError || habitError} loading={loading || tasksLoading || habitsLoading} onRetry={refresh} />
    {(taskLevel || habitLevel) && <LevelUpModal visible level={taskLevel || habitLevel} onClose={() => { setTaskLevel(null); setHabitLevel(null); }} />}
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.textPrimary} />} contentContainerStyle={{ paddingHorizontal: layout.screenPadding, paddingTop: layout.topPadding, paddingBottom: layout.bottomPadding }}>
      <SyncStatusNotice />
      {sourceErrors.length > 0 && <TouchableOpacity accessibilityRole="button" onPress={refresh} style={styles.notice}><Text style={text}>{copy('Sebagian data belum tersedia. Ketuk untuk memuat ulang.', 'Some data is unavailable. Tap to reload.')}</Text></TouchableOpacity>}
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}><BrandLogo size={22} showText textSize={17} style={{ justifyContent: 'flex-start' }} /><Text style={[styles.greeting, text]}>{copy('Halo,', 'Hello,')} {name} 👋</Text></View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={copy('Notifikasi', 'Notifications') + (history.unread ? ` (${history.unread})` : '')} onPress={() => { history.refresh(); setShowNotifications(true); }} style={[styles.iconButton, { backgroundColor: c.bgCard, borderColor: c.border }]}><MaterialIcons name="notifications-none" size={24} color={c.textPrimary} />{history.unread > 0 && <View style={styles.badge}><Text style={{ color: '#FFFFFF', fontSize: 11 }}>{Math.min(history.unread, 99)}</Text></View>}</TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={copy('Profil', 'Profile')} onPress={() => open('profile')} style={[styles.iconButton, { backgroundColor: '#193F30' }]}>{avatar && !avatarError ? <Image source={{ uri: avatar }} onError={() => setAvatarError(true)} style={{ width: 48, height: 48, borderRadius: 24 }} /> : <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{name[0]?.toUpperCase()}</Text>}</TouchableOpacity>
      </View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={copy('Cari tugas, jurnal, atau tujuan', 'Search tasks, journal, or goals')} onPress={() => setShowSearch(true)} style={[styles.search, { backgroundColor: c.bgCard, borderColor: c.border }]}><MaterialIcons name="search" size={24} color={c.textSecondary} /><Text style={[secondary, { flex: 1 }]}>{copy('Cari tugas, jurnal, atau tujuan…', 'Search tasks, journal, or goals…')}</Text></TouchableOpacity>
      <DashboardShortcuts
        routes={settings.dashboardShortcuts}
        onChangeRoutes={nextRoutes => updateSetting('dashboardShortcuts', nextRoutes)}
        onOpenRoute={open}
        language={language}
        isDark={isDark}
        c={c}
        fontScale={fontScale}
        bottomInset={layout.insets?.bottom || 24}
      />
      <DashboardSection title={copy('Tugas hari ini', 'Today’s tasks')} action={all} onAction={() => open('tasks')}>
        <Text style={[secondary, { marginBottom: 12 }]}>{summary.todayDone}/{summary.todayTotal} {copy('tugas selesai', 'tasks done')}</Text>
        {completedTask && <View style={styles.row}><Text accessibilityLiveRegion="polite" style={[secondary, { flex: 1 }]}>{copy('Tugas selesai.', 'Task completed.')}</Text><TouchableOpacity disabled={!!pendingTask} accessibilityRole="button" onPress={() => finish(completedTask, true)} style={styles.iconButton}><Text style={text}>{copy('Urungkan', 'Undo')}</Text></TouchableOpacity></View>}
        {summary.overdue > 0 && <TouchableOpacity accessibilityRole="button" onPress={() => open('tasks')} style={styles.notice}><Text style={text}>{summary.overdue} {copy('tugas terlambat • lihat tugas', 'overdue tasks • view tasks')}</Text></TouchableOpacity>}
        {taskError ? <DashboardEmptyState title={copy('Tugas gagal dimuat', 'Could not load tasks')} action={copy('Coba lagi', 'Retry')} onAction={refreshTasks} /> : tasksLoading ? <ActivityIndicator color={c.textPrimary} /> : !summary.todayOpen.length ? <DashboardEmptyState title={summary.todayTotal ? copy('Semua tugas hari ini selesai!', 'All today’s tasks are done!') : copy('Belum ada tugas hari ini', 'No tasks today')} action={copy('Tambah tugas', 'Add task')} onAction={() => create('tasks')} /> : summary.todayOpen.slice(0, 3).map(task => <View key={task.id} style={[...card, styles.row, { marginBottom: 10 }]}>
          <TouchableOpacity accessibilityRole="checkbox" accessibilityLabel={task.title} accessibilityState={{ checked: false, disabled: !!pendingTask }} disabled={!!pendingTask} onPress={() => finish(task)} style={styles.iconButton}><MaterialIcons name="radio-button-unchecked" size={24} color={c.textSecondary} /></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push({ pathname: '/(app)/tasks', params: { item: task.id } } as any)} style={{ flex: 1, minWidth: 0, minHeight: 48, justifyContent: 'center' }}><Text style={[text, { fontSize: 15, fontWeight: '700' }]} numberOfLines={2}>{task.title}</Text><Text style={secondary}>{task.deadline?.includes('T') ? new Date(task.deadline).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : copy('Hari ini', 'Today')}</Text>{!!task.category && <Text style={secondary} numberOfLines={1}>{titleCategory(task.category)}</Text>}</TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${copy('Fokus pada', 'Focus on')} ${task.title}`} onPress={() => router.push({ pathname: '/(app)/pomodoro', params: { taskId: task.id } } as any)} style={styles.iconButton}><MaterialIcons name="play-circle-outline" size={28} color={c.textPrimary} /></TouchableOpacity>
        </View>)}
      </DashboardSection>
      <DashboardSection title={copy('Keuangan bulan ini', 'Finance this month')} action={copy('Lihat detail', 'View details')} onAction={() => open('finance')}>
        {sourceErrors.includes('transactions') ? <DashboardEmptyState title={copy('Keuangan belum tersedia', 'Finance unavailable')} action={copy('Coba lagi', 'Retry')} onAction={refreshSources} /> : loading ? <ActivityIndicator color={c.textPrimary} /> : <View style={card}>
          <View style={styles.row}><Text style={[secondary, { flex: 1 }]}>{copy('Total pengeluaran bulan ini', 'Total expenses this month')}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel={settings.hideFinanceBalance ? copy('Tampilkan nominal', 'Show amounts') : copy('Sembunyikan nominal', 'Hide amounts')} onPress={() => updateSetting('hideFinanceBalance', !settings.hideFinanceBalance)} style={styles.iconButton}><MaterialIcons name={settings.hideFinanceBalance ? 'visibility-off' : 'visibility'} color={c.textPrimary} size={24} /></TouchableOpacity></View>
          <Text style={[text, { fontSize: 26, fontWeight: '800', marginVertical: 12 }]}>{settings.hideFinanceBalance ? '••••••' : formatCurrency(month.expense, language)}</Text><Text style={secondary}>{copy('Pemasukan', 'Income')}: {settings.hideFinanceBalance ? '••••' : formatCurrency(month.income, language)}</Text>
        </View>}
      </DashboardSection>
      <DashboardSection title={copy('Kebiasaan hari ini', 'Today’s habits')} action={all} onAction={() => open('habits')}>
        <Text style={[secondary, { marginBottom: 12 }]}>{doneHabits}/{habits.length} {copy('kebiasaan selesai', 'habits done')}</Text>
        {habitError ? <DashboardEmptyState title={copy('Kebiasaan gagal dimuat', 'Could not load habits')} action={copy('Coba lagi', 'Retry')} onAction={refreshHabits} /> : habitsLoading && !habits.length ? <ActivityIndicator color={c.textPrimary} /> : !habits.length ? <DashboardEmptyState title={copy('Belum ada kebiasaan', 'No habits yet')} action={copy('Tambah kebiasaan', 'Add habit')} onAction={() => create('habits')} /> : <View style={card}>{habits.slice(0, 3).map(habit => {
          const done = habit.completedDates?.includes(today);
          return <TouchableOpacity key={habit.id} accessibilityRole="checkbox" accessibilityLabel={habit.name} accessibilityState={{ checked: done, disabled: !!pendingId }} disabled={!!pendingId} onPress={() => changeHabit(habit.id)} style={[styles.row, { minHeight: 56, paddingVertical: 8 }]}><MaterialIcons name={done ? 'check-circle' : 'radio-button-unchecked'} size={24} color={c.textPrimary} /><Text style={[text, { flex: 1, fontSize: 15, textDecorationLine: done ? 'line-through' : 'none' }]}>{habit.name}</Text><Text style={secondary}>{habit.streak || 0} {copy('hari', 'days')}</Text></TouchableOpacity>;
        })}</View>}
        {rewardError && <TouchableOpacity accessibilityRole="button" onPress={() => retryHabitReward(rewardError).catch(saveFailed)} style={styles.notice}><Text style={text}>{copy('Kebiasaan tersimpan. XP belum tersimpan; ketuk untuk coba lagi.', 'Habit saved. XP could not save; tap to retry.')}</Text></TouchableOpacity>}
      </DashboardSection>
      <DashboardSection title={copy('Tujuan aktif', 'Active goal')} action={all} onAction={() => open('goals')}>
        {sourceErrors.includes('goals') ? <DashboardEmptyState title={copy('Tujuan belum tersedia', 'Goals unavailable')} action={copy('Coba lagi', 'Retry')} onAction={refreshSources} /> : primaryGoal ? <View style={card}>
          <TouchableOpacity accessibilityRole="button" onPress={() => router.push({ pathname: '/(app)/goals', params: { item: primaryGoal.id } } as any)} style={{ minHeight: 48 }}><Text style={[text, { fontSize: 18, fontWeight: '800' }]}>{translateCopy(primaryGoal.title)}</Text><Text style={secondary}>{copy('Progres dicatat pada halaman tujuan', 'Progress recorded on the goals page')}: {Math.round(goalProgress)}%</Text></TouchableOpacity>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: c.border, marginVertical: 12 }}><View style={{ height: 6, borderRadius: 3, width: `${goalProgress}%`, backgroundColor: isDark ? '#88C9A0' : '#193F30' }} /></View>
          <Text style={secondary}>{nextStep ? `${copy('Berikutnya', 'Next')}: ${translateCopy(nextStep.text)}` : copy('Tambahkan langkah berikutnya di detail tujuan.', 'Add the next step in goal details.')}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={() => goalTask ? router.push({ pathname: '/(app)/pomodoro', params: { taskId: goalTask.id } } as any) : router.push({ pathname: '/(app)/tasks', params: { goalId: primaryGoal.id, goalTitle: translateCopy(primaryGoal.title), nextStep: nextStep ? translateCopy(nextStep.text) : undefined, create: String(Date.now()) } } as any)} style={styles.primaryButton}><Text style={styles.primaryLabel}>{goalTask ? `${copy('Fokus', 'Focus')}: ${goalTask.title}` : copy('Buat tugas untuk tujuan ini', 'Create a task for this goal')}</Text></TouchableOpacity>
        </View> : loading ? <ActivityIndicator color={c.textPrimary} /> : <DashboardEmptyState title={copy('Belum ada tujuan aktif', 'No active goal')} action={copy('Buat tujuan', 'Create goal')} onAction={() => open('goals')} />}
      </DashboardSection>
      <DashboardSection title={copy('Tugas minggu ini', 'Tasks this week')} action={copy('Detail', 'Details')} onAction={() => open('insights')}>
        <View style={card}><Text style={secondary}>{summary.days[0].date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} – {summary.days[6].date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}</Text>
          {taskError ? <Text style={secondary}>{copy('Data tugas belum tersedia.', 'Task data is unavailable.')}</Text> : !summary.total ? <><Text style={[text, { marginTop: 12 }]}>{copy('Belum ada tugas terjadwal', 'No scheduled tasks yet')}</Text><TouchableOpacity accessibilityRole="button" onPress={() => create('tasks')} style={styles.primaryButton}><Text style={styles.primaryLabel}>{copy('Buat tugas pertama', 'Create your first task')}</Text></TouchableOpacity></> : <><Text style={[text, { fontSize: 18, fontWeight: '800', marginVertical: 12 }]}>{summary.percent}% · {summary.done}/{summary.total} {copy('tugas selesai', 'tasks done')}</Text><Text style={secondary}>{copy('Dihitung dari tenggat pada minggu ini, termasuk jadwal mendatang.', 'Based on due dates this week, including upcoming tasks.')}</Text>
          {summary.done > 0 ? <View style={{ flexDirection: 'row', marginTop: 16 }}>{summary.days.map(day => <View key={getToday(day.date)} accessible accessibilityLabel={`${day.date.toLocaleDateString(locale)}, ${day.done}/${day.total}${day.future ? copy(' mendatang', ' upcoming') : ''}`} style={{ flex: 1, alignItems: 'center', gap: 6, opacity: day.future ? 0.6 : 1 }}><View style={{ height: 48, width: 14, backgroundColor: c.border, justifyContent: 'flex-end', borderRadius: 7 }}><View style={{ height: `${day.pct}%`, width: 14, backgroundColor: isDark ? '#88C9A0' : '#397353', borderRadius: 7 }} /></View><Text style={{ color: c.textSecondary, fontSize: 11 }}>{day.date.toLocaleDateString(locale, { weekday: 'short' })}</Text>{day.future && <Text style={{ color: c.textSecondary, fontSize: 10 }}>{copy('Nanti', 'Later')}</Text>}</View>)}</View> : <TouchableOpacity accessibilityRole="button" onPress={() => open('tasks')} style={styles.primaryButton}><Text style={styles.primaryLabel}>{copy('Lihat tugas terjadwal', 'View scheduled tasks')}</Text></TouchableOpacity>}</>}
        </View>
      </DashboardSection>
      <DashboardSection title={copy('Insight personal', 'Personal insights')} action="Life DNA" onAction={() => setShowDna(true)}><CrossModuleInsights isDark={isDark} /></DashboardSection>
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: 18, borderRadius: 20, borderWidth: 1 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notice: { minHeight: 48, justifyContent: 'center', paddingVertical: 12, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 }, greeting: { fontSize: 24, fontWeight: '800', marginTop: 8 },
  iconButton: { minWidth: 48, minHeight: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' }, badge: { position: 'absolute', right: 0, top: 0, minWidth: 20, minHeight: 20, borderRadius: 10, backgroundColor: '#193F30', justifyContent: 'center', alignItems: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
  shortcuts: { flexDirection: 'row', gap: 4, marginBottom: 24 }, shortcut: { minWidth: 48, minHeight: 72, alignItems: 'center', gap: 8 }, shortcutIcon: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  primaryButton: { minHeight: 48, borderRadius: 12, backgroundColor: '#193F30', padding: 12, marginTop: 16, alignItems: 'center', justifyContent: 'center' }, primaryLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
