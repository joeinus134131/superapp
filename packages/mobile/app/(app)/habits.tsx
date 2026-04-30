import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, StyleSheet, Dimensions, RefreshControl,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { MOBILE_SPACING, useMobileLayout } from '../../lib/layout';
import { getData, setData, STORAGE_KEYS } from '../../lib/storage';
import { generateId, getToday } from '../../lib/helpers';
import { addXP } from '../../lib/gamification';
import * as Haptics from 'expo-haptics';

interface Habit {
  id: string;
  name: string;
  emoji: string;
  completedDates: string[];
  streak: number;
  bestStreak: number;
  createdAt: string;
}

const HABIT_EMOJIS = ['⭐', '💪', '📚', '🧘', '🏃', '💧', '🥗', '😴', '✍️', '🎯', '🧹', '💊'];

export default function HabitsScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const today = getToday();
  const layout = useMobileLayout();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabit, setNewHabit] = useState('');
  const [newEmoji, setNewEmoji] = useState('⭐');
  const [refreshing, setRefreshing] = useState(false);
  const [xpToast, setXpToast] = useState<string | null>(null);
  const [levelUpData, setLevelUpData] = useState<{level: number, title: string} | null>(null);
  
  const [listPage, setListPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const load = useCallback(async () => {
    const saved = await getData(STORAGE_KEYS.HABITS);
    if (saved && Array.isArray(saved)) setHabits(saved);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (h: Habit[]) => {
    setHabits(h);
    await setData(STORAGE_KEYS.HABITS, h);
  };

  const addHabit = async () => {
    if (!newHabit.trim()) return;
    await save([...habits, {
      id: generateId(),
      name: newHabit.trim(),
      emoji: newEmoji,
      completedDates: [],
      streak: 0,
      bestStreak: 0,
      createdAt: new Date().toISOString(),
    }]);
    setNewHabit('');
  };

  const toggleHabit = async (id: string) => {
    const updated = habits.map(h => {
      if (h.id !== id) return h;
      const dates = h.completedDates || [];
      const isCompleted = dates.includes(today);
      const newDates = isCompleted
        ? dates.filter(d => d !== today)
        : [...dates, today];

      // Calculate streak
      let streak = 0;
      const sorted = [...newDates].sort().reverse();
      const todayDate = new Date(today);
      for (let i = 0; i < sorted.length; i++) {
        const check = new Date(today);
        check.setDate(todayDate.getDate() - i);
        const y = check.getFullYear();
        const m = String(check.getMonth() + 1).padStart(2, '0');
        const d = String(check.getDate()).padStart(2, '0');
        const checkStr = `${y}-${m}-${d}`;
        if (sorted.includes(checkStr)) streak++;
        else break;
      }

      const bestStreak = Math.max(h.bestStreak || 0, streak);

      if (!isCompleted) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        addXP('HABIT_DONE').then(result => {
          if (result.levelUp) setLevelUpData(result.newLevel);
          setXpToast(`+${result.xpGained} XP`);
          setTimeout(() => setXpToast(null), 2000);
        });

        if (streak === 7) {
          addXP('STREAK_7');
          setXpToast('+50 XP 🔥 7 Day Streak!');
        }
        if (streak === 30) {
          addXP('STREAK_30');
          setXpToast('+200 XP 🏔️ 30 Day Streak!');
        }
      } else {
        // Un-checking
        if (streak < h.streak && h.streak >= 3) {
          // Streak broke!
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }

      return { ...h, completedDates: newDates, streak, bestStreak };
    });
    await save(updated);
  };

  const deleteHabit = (id: string) => {
    Alert.alert('Hapus Habit', 'Yakin ingin menghapus habit ini?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => save(habits.filter(h => h.id !== id)) },
    ]);
  };

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const todayCompleted = habits.filter(h => h.completedDates?.includes(today)).length;
  const completionRate = habits.length > 0 ? Math.round((todayCompleted / habits.length) * 100) : 0;
  const maxStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);

  // Get visible 7-day range
  const getVisibleDays = () => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      days.push(`${y}-${m}-${day}`);
    }
    return days;
  };
  const visibleDays = getVisibleDays();

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      {xpToast && (
        <View style={[styles.xpToast, { top: layout.insets.top + 12 }]}>
          <Text style={styles.xpToastText}>⚡ {xpToast}</Text>
        </View>
      )}

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.purple} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: MOBILE_SPACING.screen, paddingTop: layout.topPadding, paddingBottom: layout.bottomPadding }}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <View style={[styles.statIcon, { backgroundColor: c.green + '22' }]}>
              <MaterialIcons name="check-box" size={22} color={c.green} />
            </View>
            <Text style={[styles.statValue, { color: c.textPrimary }]}>{todayCompleted}/{habits.length}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Hari Ini</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <View style={[styles.statIcon, { backgroundColor: c.purple + '22' }]}>
              <MaterialIcons name="trending-up" size={22} color={c.purple} />
            </View>
            <Text style={[styles.statValue, { color: c.textPrimary }]}>{completionRate}%</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Selesai</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <View style={[styles.statIcon, { backgroundColor: c.red + '22' }]}>
              <MaterialIcons name="local-fire-department" size={22} color={c.red} />
            </View>
            <Text style={[styles.statValue, { color: c.textPrimary }]}>{maxStreak}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Streak</Text>
          </View>
        </View>

        {/* Add Habit */}
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="add-circle-outline" size={18} color={c.purple} />
            <Text style={[styles.cardTitle, { color: c.textPrimary }]}>Tambah Habit</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            <View style={styles.emojiRow}>
              {HABIT_EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiBtn, newEmoji === e && { backgroundColor: c.purple + '22', borderColor: c.purple }]}
                  onPress={() => setNewEmoji(e)}
                >
                  <Text style={{ fontSize: 18 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
              value={newHabit}
              onChangeText={setNewHabit}
              placeholder="Nama habit baru..."
              placeholderTextColor={c.textMuted}
              onSubmitEditing={addHabit}
            />
            <TouchableOpacity style={[styles.addBtnSmall, { backgroundColor: c.purple }]} onPress={addHabit}>
              <MaterialIcons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 7-Day Calendar */}
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="calendar-month" size={18} color={c.cyan} />
            <Text style={[styles.cardTitle, { color: c.textPrimary }]}>Riwayat 7 Hari</Text>
          </View>

          {/* Day headers */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ paddingBottom: 8 }}>
              <View style={styles.calendarHeader}>
                <View style={{ width: 120 }} />
                {visibleDays.map(d => {
                  const date = new Date(d);
                  const isToday = d === today;
                  return (
                    <View key={d} style={[styles.dayCol, { width: 46 }]}>
                      <Text style={[styles.dayName, { color: isToday ? c.purple : c.textMuted }]}>
                        {date.toLocaleDateString('id-ID', { weekday: 'short' }).slice(0, 3)}
                      </Text>
                      <Text style={[styles.dayNum, { color: isToday ? c.purple : c.textSecondary, fontWeight: isToday ? '800' : '500' }]}>
                        {date.getDate()}
                      </Text>
                    </View>
                  );
                })}
                <View style={[styles.dayCol, { width: 46 }]}>
                  <MaterialIcons name="local-fire-department" size={14} color={c.red} />
                </View>
              </View>

              {/* Habit rows */}
              {habits.length === 0 ? (
                <View style={[styles.emptyState, { width: w - 80 }]}>
                  <MaterialIcons name="local-fire-department" size={40} color={c.textMuted} />
                  <Text style={[styles.emptyText, { color: c.textMuted }]}>Belum ada habit</Text>
                  <Text style={[styles.emptySubtext, { color: c.textMuted }]}>Mulai tambah kebiasaan baru</Text>
                </View>
              ) : habits.map(h => {
                const todayDone = h.completedDates?.includes(today);
                return (
                  <View key={h.id} style={[styles.habitRow, { borderTopColor: c.border }]}>
                    <View style={[styles.habitName, { width: 120 }]}>
                      <Text style={{ fontSize: 16 }}>{h.emoji}</Text>
                      <Text style={[styles.habitNameText, { color: c.textPrimary }]} numberOfLines={1}>
                        {h.name}
                      </Text>
                    </View>
                    {visibleDays.map(d => {
                      const done = h.completedDates?.includes(d);
                      const isToday = d === today;
                      return (
                        <TouchableOpacity
                          key={d}
                          style={[styles.dayCol, { width: 46 }]}
                          onPress={() => isToday && toggleHabit(h.id)}
                          disabled={!isToday}
                        >
                          <View style={[styles.heatCell, done && { backgroundColor: c.green }, isToday && !done && { borderColor: c.purple, borderWidth: 1.5 }]}>
                            {done && <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓</Text>}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    <View style={[styles.dayCol, { width: 46 }]}>
                      <Text style={[styles.streakNum, { color: c.yellow }]}>{h.streak || 0}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Habit List with details */}
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="format-list-bulleted" size={18} color={c.purple} />
            <Text style={[styles.cardTitle, { color: c.textPrimary }]}>Daftar Habit</Text>
          </View>
          {habits.slice((listPage - 1) * ITEMS_PER_PAGE, listPage * ITEMS_PER_PAGE).map(h => {
            const todayDone = h.completedDates?.includes(today);
            return (
              <View key={h.id} style={[styles.habitListItem, { borderBottomColor: c.border }]}>
                <TouchableOpacity style={[styles.checkbox, todayDone && { backgroundColor: c.green, borderColor: c.green }]} onPress={() => toggleHabit(h.id)}>
                  {todayDone && <MaterialIcons name="check" size={14} color="#fff" />}
                </TouchableOpacity>
                <Text style={{ fontSize: 18 }}>{h.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.habitItemName, { color: c.textPrimary, textDecorationLine: todayDone ? 'line-through' : 'none', opacity: todayDone ? 0.5 : 1 }]}>
                    {h.name}
                  </Text>
                  <Text style={[styles.habitItemMeta, { color: c.textMuted }]}>
                    🔥 Streak: {h.streak || 0} hari • Best: {h.bestStreak || 0} • Total: {h.completedDates?.length || 0}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => deleteHabit(h.id)}>
                  <MaterialIcons name="delete-outline" size={20} color={c.red} />
                </TouchableOpacity>
              </View>
            );
          })}
          
          {habits.length > ITEMS_PER_PAGE && (
            <View style={styles.paginationRow}>
              <Text style={{ color: c.textSecondary, fontSize: 13 }}>
                Halaman {listPage} dari {Math.ceil(habits.length / ITEMS_PER_PAGE)}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity 
                  style={[styles.pageBtn, { borderColor: c.border }]} 
                  disabled={listPage === 1} 
                  onPress={() => setListPage(p => Math.max(1, p - 1))}
                >
                  <Text style={{ color: listPage === 1 ? c.textMuted : c.textPrimary }}>Prev</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.pageBtn, { borderColor: c.border }]} 
                  disabled={listPage * ITEMS_PER_PAGE >= habits.length} 
                  onPress={() => setListPage(p => p + 1)}
                >
                  <Text style={{ color: listPage * ITEMS_PER_PAGE >= habits.length ? c.textMuted : c.textPrimary }}>Next</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Level Up Modal */}
      {levelUpData && (
        <View style={styles.levelUpOverlay}>
          <View style={[styles.levelUpModal, { backgroundColor: c.bgPrimary, borderColor: c.purple }]}>
            <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>🎉</Text>
            <Text style={[styles.levelUpTitle, { color: c.purple }]}>LEVEL UP!</Text>
            <Text style={[styles.levelUpDesc, { color: c.textPrimary }]}>
              Anda telah mencapai <Text style={{ fontWeight: '800' }}>Level {levelUpData.level}</Text>
            </Text>
            <Text style={[styles.levelUpRank, { color: c.textSecondary }]}>{levelUpData.title}</Text>
            <TouchableOpacity
              style={[styles.levelUpBtn, { backgroundColor: c.purple }]}
              onPress={() => setLevelUpData(null)}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Lanjutkan!</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const w = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderRadius: 20, padding: 18, marginBottom: 18, borderWidth: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  cardTitle: { fontSize: 18, fontWeight: '800' },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  statCard: { flex: 1, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 10, alignItems: 'center', borderWidth: 1, minHeight: 128, justifyContent: 'center' },
  statIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  emojiRow: { flexDirection: 'row', gap: 8 },
  emojiBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  addRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  input: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, borderWidth: 1 },
  addBtnSmall: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  calendarHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dayCol: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dayName: { fontSize: 10, fontWeight: '600' },
  dayNum: { fontSize: 12 },

  habitRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1 },
  habitName: { width: 104, flexDirection: 'row', alignItems: 'center', gap: 6 },
  habitNameText: { fontSize: 13, fontWeight: '700', flex: 1 },
  heatCell: { width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  streakNum: { fontSize: 13, fontWeight: '800' },

  habitListItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
  checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: '#555', alignItems: 'center', justifyContent: 'center' },
  habitItemName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  habitItemMeta: { fontSize: 12, lineHeight: 18 },

  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  emptySubtext: { fontSize: 13, marginTop: 4 },

  pageBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  paginationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.2)' },

  xpToast: { position: 'absolute', top: 50, right: 16, zIndex: 999, backgroundColor: '#8b5cf6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  xpToastText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  levelUpOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  levelUpModal: { width: '80%', padding: 24, borderRadius: 24, borderWidth: 2, alignItems: 'center' },
  levelUpTitle: { fontSize: 24, fontWeight: '900', marginBottom: 8, letterSpacing: 2 },
  levelUpDesc: { fontSize: 16, marginBottom: 4, textAlign: 'center' },
  levelUpRank: { fontSize: 14, marginBottom: 24, textAlign: 'center', fontWeight: '600' },
  levelUpBtn: { width: '100%', paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
});
