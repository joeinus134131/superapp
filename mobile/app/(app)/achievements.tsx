import { HeaderText } from '../../components/HeaderText';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { WhenyaHeader } from '../../components/WhenyaHeader';
import { useColors } from '../../lib/theme';
import { useTheme } from '../../context/themeContext';
import { MOBILE_SPACING, useMobileLayout } from '../../lib/layout';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../../context/languageContext';
import { useRouter } from 'expo-router';

import { getData, STORAGE_KEYS } from '../../lib/storage';



interface BadgeDef {
  id: string;
  titleKey: string;
  descKey: string;
  icon: string;
  color: string;
  check: (stats: {
    tasksCompleted: number;
    habitsCount: number;
    pomodoroSessions: number;
    hasPositiveBalance: boolean;
    readingCount: number;
    hasEarlyActivity: boolean;
    totalXP: number;
  }) => boolean;
}

const BADGE_DEFINITIONS: BadgeDef[] = [
  {
    id: '1',
    titleKey: 'achievements.badge_first_step',
    descKey: 'achievements.badge_first_step_desc',
    icon: 'stars',
    color: '#52745a',
    check: (s) => s.tasksCompleted >= 1 || s.totalXP >= 15,
  },
  {
    id: '2',
    titleKey: 'achievements.badge_consistent',
    descKey: 'achievements.badge_consistent_desc',
    icon: 'local-fire-department',
    color: '#f59e0b',
    check: (s) => s.habitsCount >= 1 || s.totalXP >= 50,
  },
  {
    id: '3',
    titleKey: 'achievements.badge_focused',
    descKey: 'achievements.badge_focused_desc',
    icon: 'timer',
    color: '#10b981',
    check: (s) => s.pomodoroSessions >= 1 || s.totalXP >= 100,
  },
  {
    id: '4',
    titleKey: 'achievements.badge_budget_master',
    descKey: 'achievements.badge_budget_master_desc',
    icon: 'account-balance-wallet',
    color: '#3b82f6',
    check: (s) => s.hasPositiveBalance,
  },
  {
    id: '5',
    titleKey: 'achievements.badge_bookworm',
    descKey: 'achievements.badge_bookworm_desc',
    icon: 'menu-book',
    color: '#ec4899',
    check: (s) => s.readingCount >= 1,
  },
  {
    id: '6',
    titleKey: 'achievements.badge_early_bird',
    descKey: 'achievements.badge_early_bird_desc',
    icon: 'wb-sunny',
    color: '#ef4444',
    check: (s) => s.hasEarlyActivity || s.tasksCompleted >= 5,
  },
];

export default function AchievementsScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();
  const { width } = useWindowDimensions();
  const { t } = useLanguage();
  const router = useRouter();

  const [totalXP, setTotalXP] = useState(0);
  const [unlockedBadges, setUnlockedBadges] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadRealStats();
  }, []);

  const loadRealStats = async () => {
    try {
      const [gamData, tasksData, habitsData, pomodoroData, txData, readingData] = await Promise.all([
        getData(STORAGE_KEYS.GAMIFICATION),
        getData(STORAGE_KEYS.TASKS),
        getData(STORAGE_KEYS.HABITS),
        getData(STORAGE_KEYS.POMODORO),
        getData(STORAGE_KEYS.TRANSACTIONS),
        getData(STORAGE_KEYS.READING),
      ]);

      const xp = (gamData?.totalXP as number) || 0;
      setTotalXP(xp);

      const tasks = Array.isArray(tasksData) ? tasksData : [];
      const habits = Array.isArray(habitsData) ? habitsData : [];
      const pomodoro = (pomodoroData && typeof pomodoroData === 'object') ? pomodoroData : { sessions: [] };
      const transactions = Array.isArray(txData) ? txData : [];
      const reading = Array.isArray(readingData) ? readingData : [];

      const tasksCompleted = tasks.filter((task: any) => task.status === 'done' || task.completed).length;
      const habitsCount = habits.length;
      const pomodoroSessions = Array.isArray(pomodoro.sessions) ? pomodoro.sessions.length : 0;
      const balance = transactions.reduce((acc: number, curr: any) => {
        return curr.type === 'income' ? acc + (Number(curr.amount) || 0) : acc - (Number(curr.amount) || 0);
      }, 0);
      const readingCount = reading.length;
      const hasEarlyActivity = tasks.some((t: any) => {
        if (!t.createdAt) return false;
        const h = new Date(t.createdAt).getHours();
        return h >= 5 && h < 8;
      });

      const stats = {
        tasksCompleted,
        habitsCount,
        pomodoroSessions,
        hasPositiveBalance: balance > 0,
        readingCount,
        hasEarlyActivity,
        totalXP: xp,
      };

      const unlockedMap: Record<string, boolean> = {};
      for (const badge of BADGE_DEFINITIONS) {
        unlockedMap[badge.id] = badge.check(stats);
      }
      setUnlockedBadges(unlockedMap);
    } catch (e) {
      console.error('Failed to load achievement stats:', e);
    }
  };

  const unlockedCount = Object.values(unlockedBadges).filter(Boolean).length;

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <WhenyaHeader
        title={t('achievements.title')}
        subtitle={t('achievements.subtitle')}
        showBack={router.canGoBack()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 20, paddingBottom: layout.bottomPadding + 40 }}
      >
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <Text style={[styles.statVal, { color: c.purple }]}>{unlockedCount}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>{t('achievements.badges_label')}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <Text style={[styles.statVal, { color: c.green }]}>{totalXP}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>{t('achievements.xp_label')}</Text>
          </View>
        </View>

        <View style={styles.grid}>
          {BADGE_DEFINITIONS.map((badge) => {
            const isUnlocked = !!unlockedBadges[badge.id];
            return (
              <TouchableOpacity 
                key={badge.id}
                style={[
                  styles.badgeCard, 
                  { 
                    width: (width - 48 - 16) / 2, 
                    backgroundColor: c.bgCard, 
                    borderColor: isUnlocked ? badge.color : c.border,
                    opacity: isUnlocked ? 1 : 0.5
                  }
                ]}
                onPress={() => {
                  if (isUnlocked) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View style={[styles.iconContainer, { backgroundColor: isUnlocked ? badge.color + '22' : c.bgInput }]}>
                  <MaterialIcons 
                    name={badge.icon as any} 
                    size={32} 
                    color={isUnlocked ? badge.color : c.textMuted} 
                  />
                </View>
                <Text style={[styles.badgeTitle, { color: c.textPrimary }]}>{t(badge.titleKey)}</Text>
                <Text style={[styles.badgeDesc, { color: c.textSecondary }]}>{t(badge.descKey)}</Text>
                {!isUnlocked && (
                  <View style={styles.lockOverlay}>
                    <MaterialIcons name="lock" size={16} color={c.textMuted} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
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
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statBox: { flex: 1, padding: 16, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  statVal: { fontSize: 24, fontWeight: '900' },
  statLabel: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  badgeCard: { padding: 16, borderRadius: 24, borderWidth: 1, alignItems: 'center', position: 'relative' },
  iconContainer: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  badgeTitle: { fontSize: 15, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  badgeDesc: { fontSize: 11, textAlign: 'center', opacity: 0.8 },
  lockOverlay: { position: 'absolute', top: 12, right: 12 },
});
