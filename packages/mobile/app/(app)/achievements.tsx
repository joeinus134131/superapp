import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../../lib/theme';
import { useTheme } from '../../context/themeContext';
import { MOBILE_SPACING, useMobileLayout } from '../../lib/layout';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../../context/languageContext';

const { width } = Dimensions.get('window');

const BADGES = [
  { id: '1', titleKey: 'achievements.badge_first_step', descKey: 'achievements.badge_first_step_desc', icon: 'stars', color: '#8b5cf6', unlocked: true },
  { id: '2', titleKey: 'achievements.badge_consistent', descKey: 'achievements.badge_consistent_desc', icon: 'local-fire-department', color: '#f59e0b', unlocked: true },
  { id: '3', titleKey: 'achievements.badge_focused', descKey: 'achievements.badge_focused_desc', icon: 'timer', color: '#10b981', unlocked: false },
  { id: '4', titleKey: 'achievements.badge_budget_master', descKey: 'achievements.badge_budget_master_desc', icon: 'account-balance-wallet', color: '#3b82f6', unlocked: true },
  { id: '5', titleKey: 'achievements.badge_bookworm', descKey: 'achievements.badge_bookworm_desc', icon: 'menu-book', color: '#ec4899', unlocked: false },
  { id: '6', titleKey: 'achievements.badge_early_bird', descKey: 'achievements.badge_early_bird_desc', icon: 'wb-sunny', color: '#ef4444', unlocked: false },
];

export default function AchievementsScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();
  const { t } = useLanguage();

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <View style={[styles.pageHeader, { borderBottomColor: c.border, paddingTop: layout.topPadding, paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.headerIconBox, { backgroundColor: c.yellow + '15', width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }]}>
            <MaterialIcons name="emoji-events" size={24} color={c.yellow} />
          </View>
          <View>
            <Text style={[styles.pageTitle, { color: c.textPrimary, fontSize: 28, fontWeight: '900' }]}>{t('achievements.title')}</Text>
            <Text style={[styles.pageSubtitle, { color: c.textSecondary, fontSize: 14, marginTop: 2 }]}>{t('achievements.subtitle')}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 20, paddingBottom: layout.bottomPadding + 40 }}
      >
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <Text style={[styles.statVal, { color: c.purple }]}>3</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>{t('achievements.badges_label')}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <Text style={[styles.statVal, { color: c.green }]}>850</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>{t('achievements.xp_label')}</Text>
          </View>
        </View>

        <View style={styles.grid}>
          {BADGES.map((badge) => (
            <TouchableOpacity 
              key={badge.id}
              style={[
                styles.badgeCard, 
                { 
                  width: (width - 48 - 16) / 2, 
                  backgroundColor: c.bgCard, 
                  borderColor: badge.unlocked ? badge.color : c.border,
                  opacity: badge.unlocked ? 1 : 0.5
                }
              ]}
              onPress={() => {
                if (badge.unlocked) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View style={[styles.iconContainer, { backgroundColor: badge.unlocked ? badge.color + '22' : c.bgInput }]}>
                <MaterialIcons 
                  name={badge.icon as any} 
                  size={32} 
                  color={badge.unlocked ? badge.color : c.textMuted} 
                />
              </View>
              <Text style={[styles.badgeTitle, { color: c.textPrimary }]}>{t(badge.titleKey)}</Text>
              <Text style={[styles.badgeDesc, { color: c.textSecondary }]}>{t(badge.descKey)}</Text>
              {!badge.unlocked && (
                <View style={styles.lockOverlay}>
                  <MaterialIcons name="lock" size={16} color={c.textMuted} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
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
