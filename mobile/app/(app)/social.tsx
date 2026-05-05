import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, RefreshControl, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../../lib/theme';
import { useTheme } from '../../context/themeContext';
import { MOBILE_SPACING, useMobileLayout } from '../../lib/layout';
import { getXP, getCurrentLevel } from '../../lib/gamification';
import { getData, STORAGE_KEYS } from '../../lib/storage';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../../context/languageContext';

const MOCK_LEADERS = [
  { id: '1', name: 'Budi Santoso', xp: 12500, streak: 45, level: 24, icon: 'person' },
  { id: '2', name: 'Siti Aminah', xp: 11200, streak: 32, level: 21, icon: 'face' },
  { id: '3', name: 'Andi Wijaya', xp: 9800, streak: 28, level: 19, icon: 'person-outline' },
  { id: '5', name: 'Rina Putri', xp: 8500, streak: 15, level: 17, icon: 'face-retouching-natural' },
  { id: '6', name: 'Agus Pratama', xp: 7200, streak: 12, level: 15, icon: 'account-circle' },
];

export default function SocialScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();
  const { t } = useLanguage();
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState({ xp: 0, level: 1, name: 'Explorer', avatarUri: null as string | null });
  const [leaderboard, setLeaderboard] = useState(MOCK_LEADERS);

  const loadData = useCallback(async () => {
    const [xpData, profile, habits] = await Promise.all([
      getXP(),
      getData(STORAGE_KEYS.USER_PROFILE),
      getData(STORAGE_KEYS.HABITS)
    ]);
    
    const level = getCurrentLevel(xpData.totalXP);
    const maxHabitStreak = habits ? Math.max(0, ...habits.map((h: any) => h.streak || 0)) : 0;
    
    const myData = {
      id: 'me',
      name: profile?.name || 'Explorer',
      xp: xpData.totalXP,
      streak: maxHabitStreak,
      level: level.level,
      isMe: true,
      icon: 'auto-awesome',
      avatarUri: profile?.avatarUri
    };

    setUserData({
      xp: xpData.totalXP,
      level: level.level,
      name: profile?.name || 'Explorer',
      avatarUri: profile?.avatarUri
    });

    // Merge me into leaderboard
    const merged = [...MOCK_LEADERS, myData].sort((a, b) => b.xp - a.xp);
    setLeaderboard(merged as any);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleJoinChallenge = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(t('social.success_join'), t('social.success_join_desc'));
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <View style={[styles.pageHeader, { borderBottomColor: c.border, paddingTop: layout.topPadding, paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.headerIconBox, { backgroundColor: c.purple + '15', width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }]}>
            <MaterialIcons name="people" size={24} color={c.purple} />
          </View>
          <View>
            <Text style={[styles.pageTitle, { color: c.textPrimary, fontSize: 28, fontWeight: '900' }]}>Social Hub</Text>
            <Text style={[styles.pageSubtitle, { color: c.textSecondary, fontSize: 14, marginTop: 2 }]}>{t('social.subtitle')}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.purple} />}
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 20, paddingBottom: layout.bottomPadding + 40 }}
      >
        {/* Active Challenge */}
        <View style={[styles.card, { backgroundColor: c.purple, borderColor: c.purple }]}>
          <View style={styles.challengeHeader}>
            <MaterialIcons name="event" size={24} color="#fff" />
            <Text style={styles.challengeTitle}>{t('social.weekly_challenge')}</Text>
          </View>
          <Text style={styles.challengeName}>{t('social.challenge_focus')}</Text>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
              <View style={[styles.progressFill, { width: '48%', backgroundColor: '#fff' }]} />
            </View>
            <Text style={styles.progressText}>{t('social.community_progress').replace('{pct}', '48')}</Text>
          </View>
          <TouchableOpacity style={styles.joinBtn} onPress={handleJoinChallenge}>
            <Text style={[styles.joinBtnText, { color: c.purple }]}>{t('social.join_now')}</Text>
          </TouchableOpacity>
        </View>

        {/* Global Leaderboard */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>{t('social.leaderboard')}</Text>
          <TouchableOpacity><Text style={{ color: c.purple, fontWeight: '700' }}>{t('social.view_all')}</Text></TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border, padding: 0 }]}>
          {leaderboard.map((leader: any, index) => (
            <View 
              key={leader.id} 
              style={[
                styles.leaderRow, 
                { borderBottomColor: c.border },
                leader.isMe && { backgroundColor: c.purple + '15' }
              ]}
            >
              <Text style={[styles.rank, { color: index < 3 ? c.purple : c.textMuted }]}>{index + 1}</Text>
              <View style={[styles.avatar, { backgroundColor: c.bgInput }]}>
                {leader.avatarUri ? (
                  <Image source={{ uri: leader.avatarUri }} style={styles.avatarImg} />
                ) : (
                  <MaterialIcons name={leader.icon || 'person'} size={24} color={leader.isMe ? c.purple : c.textMuted} />
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.leaderName, { color: c.textPrimary }, leader.isMe && { fontWeight: '900' }]} numberOfLines={1}>
                  {leader.name} {leader.isMe ? `(${t('social.you')})` : ''}
                </Text>
                <Text style={[styles.leaderMeta, { color: c.textSecondary }]}>Level {leader.level} • {t('social.streak_days').replace('{count}', leader.streak.toString())}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.xpText, { color: c.purple }]}>{leader.xp} XP</Text>
                <MaterialIcons name="trending-up" size={16} color={c.green} />
              </View>
            </View>
          ))}
        </View>

        {/* Community Activity */}
        <Text style={[styles.sectionTitle, { color: c.textPrimary, marginTop: 24, marginBottom: 16 }]}>{t('social.activity')}</Text>
        {[
          { user: 'Siti Aminah', actionKey: 'social.action_habit', textKey: 'social.mock_activity_1', icon: 'water-drop', time: '5m' },
          { user: 'Budi Santoso', actionKey: 'social.action_goal', textKey: 'social.mock_activity_2', icon: 'code', time: '12m' }
        ].map((activity, i) => (
          <View key={i} style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border, marginBottom: 12 }]}>
            <View style={styles.activityHeader}>
              <View style={[styles.smallAvatar, { backgroundColor: c.bgInput }]}>
                <MaterialIcons name="person" size={18} color={c.textMuted} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ color: c.textPrimary, fontWeight: '800', fontSize: 13 }}>{activity.user}</Text>
                <Text style={{ color: c.textSecondary, fontSize: 11 }}>{t(activity.actionKey)} • {t('social.time_ago').replace('{time}', activity.time)}</Text>
              </View>
            </View>
            <Text style={{ color: c.textPrimary, fontSize: 14, marginTop: 10 }}>
              "{t(activity.textKey)}"
            </Text>
            <View style={styles.activityFooter}>
              <TouchableOpacity style={styles.activityAction} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
                <MaterialIcons name="thumb-up-off-alt" size={16} color={c.textMuted} />
                <Text style={{ color: c.textMuted, fontSize: 12 }}>{t('social.like')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.activityAction}>
                <MaterialIcons name="chat-bubble-outline" size={16} color={c.textMuted} />
                <Text style={{ color: c.textMuted, fontSize: 12 }}>{t('social.comment')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1 },
  headerIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 28, fontWeight: '900' },
  pageSubtitle: { fontSize: 14, marginTop: 4 },
  card: { borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1 },
  challengeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  challengeTitle: { color: '#fff', fontSize: 14, fontWeight: '700', opacity: 0.9 },
  challengeName: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 16 },
  progressContainer: { marginBottom: 20 },
  progressBar: { height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 5 },
  progressText: { color: '#fff', fontSize: 12, fontWeight: '700', opacity: 0.8 },
  joinBtn: { backgroundColor: '#fff', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  joinBtnText: { fontWeight: '900', fontSize: 15 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  leaderRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  rank: { fontSize: 18, fontWeight: '900', width: 28 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  leaderName: { fontSize: 15, fontWeight: '700' },
  leaderMeta: { fontSize: 12, marginTop: 2 },
  xpText: { fontSize: 15, fontWeight: '900', marginBottom: 2 },
  activityHeader: { flexDirection: 'row', alignItems: 'center' },
  smallAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  activityFooter: { flexDirection: 'row', gap: 20, marginTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 10 },
  activityAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
