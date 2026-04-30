import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { getData, STORAGE_KEYS, clearAll } from '../../lib/storage';
import { getCurrentLevel, getXPProgress } from '../../lib/gamification';
import { useAuth } from '../../hooks/useAuth';
import { MOBILE_SPACING, useMobileLayout } from '../../lib/layout';

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

interface MenuItem {
  label: string;
  icon: string;
  color: string;
  route?: string;
  onPress?: () => void;
  badge?: string;
}

export default function MoreScreen() {
  const { isDark, toggleTheme } = useTheme();
  const c = useColors(isDark);
  const { user, logout: signOut } = useAuth();
  const layout = useMobileLayout();
  const [xp, setXp] = useState(0);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    (async () => {
      const gamData = await getData(STORAGE_KEYS.GAMIFICATION);
      setXp(gamData?.totalXP || 0);
      const profileData = await getData(STORAGE_KEYS.USER_PROFILE);
      setDisplayName(profileData?.displayName || user?.email?.split('@')[0] || 'User');
    })();
  }, [user]);

  const level = getCurrentLevel(xp);
  const nextLevel = getXPProgress(xp);

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar dari akun?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleClearData = () => {
    Alert.alert(
      'Hapus Semua Data',
      'Ini akan menghapus SEMUA data lokal termasuk tasks, habits, jurnal, dll. Data tidak bisa dipulihkan!',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus', style: 'destructive', onPress: async () => { await clearAll(); Alert.alert('Data dihapus'); } },
      ]
    );
  };

  const menuGroups: MenuGroup[] = [
    {
      title: 'Produktivitas',
      items: [
        { label: 'Finance', icon: 'account-balance-wallet', color: '#10b981', route: '/(app)/finance' },
        { label: 'Goals', icon: 'flag', color: '#f59e0b', route: '/(app)/goals' },
        { label: 'Reading', icon: 'menu-book', color: '#8b5cf6', route: '/(app)/reading' },
        { label: 'Kalender', icon: 'event', color: '#3b82f6', route: '/(app)/calendar' },
      ],
    },
    {
      title: 'Kesehatan & Jurnal',
      items: [
        { label: 'Health Tracker', icon: 'fitness-center', color: '#ef4444', route: '/(app)/health' },
        { label: 'Journal', icon: 'create', color: '#ec4899', route: '/(app)/journal' },
        { label: 'Pencapaian', icon: 'emoji-events', color: '#eab308', route: '/(app)/achievements' },
      ],
    },
    {
      title: 'Pengaturan',
      items: [
        { label: isDark ? 'Mode Terang' : 'Mode Gelap', icon: isDark ? 'light-mode' : 'dark-mode', color: c.purple, onPress: toggleTheme },
        { label: 'Profil', icon: 'person', color: '#6b7280', route: '/(app)/profile' },
      ],
    },
    {
      title: 'Akun',
      items: [
        { label: 'Keluar', icon: 'logout', color: '#ef4444', onPress: handleLogout },
        { label: 'Hapus Semua Data', icon: 'delete-forever', color: '#ef4444', onPress: handleClearData },
      ],
    },
  ];

  const s = styles(c, isDark);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={[s.content, { paddingTop: layout.topPadding, paddingBottom: layout.bottomPadding }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Card */}
      <View style={s.profileCard}>
        <View style={[s.avatar, { backgroundColor: level.color + '20' }]}>
          <Text style={[s.avatarText, { color: level.color }]}>
            {displayName.slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={s.profileInfo}>
          <Text style={s.profileName}>{displayName}</Text>
          <Text style={s.profileEmail} numberOfLines={1}>{user?.email}</Text>
          <View style={s.levelRow}>
            <View style={[s.levelBadge, { backgroundColor: level.color + '20' }]}>
              <MaterialIcons name="military-tech" size={14} color={level.color} />
              <Text style={[s.levelText, { color: level.color }]}>Lv.{level.level} {level.title}</Text>
            </View>
            <Text style={s.xpText}>{xp} XP</Text>
          </View>
          {nextLevel.needed > 0 && (
            <View style={s.xpBarWrap}>
              <View style={s.xpBar}>
                <View style={[s.xpFill, { width: `${nextLevel.percent}%` as any, backgroundColor: level.color }]} />
              </View>
              <Text style={s.xpBarText}>{nextLevel.current}/{nextLevel.needed}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Menu Groups */}
      {menuGroups.map((group) => (
        <View key={group.title} style={s.group}>
          <Text style={s.groupTitle}>{group.title}</Text>
          <View style={s.groupCard}>
            {group.items.map((item, idx) => (
              <TouchableOpacity
                key={item.label}
                style={[s.menuItem, idx < group.items.length - 1 && s.menuItemBorder]}
                onPress={() => {
                  if (item.onPress) item.onPress();
                  else if (item.route) router.push(item.route as any);
                }}
                activeOpacity={0.7}
              >
                <View style={[s.menuIcon, { backgroundColor: item.color + '18' }]}>
                  <MaterialIcons name={item.icon as any} size={20} color={item.color} />
                </View>
                <Text style={s.menuLabel}>{item.label}</Text>
                {item.badge && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{item.badge}</Text>
                  </View>
                )}
                {item.route && <MaterialIcons name="chevron-right" size={20} color={c.textMuted} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <Text style={s.version}>SuperApp v1.0.0</Text>
    </ScrollView>
  );
}

const styles = (c: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgPrimary },
  content: { paddingHorizontal: MOBILE_SPACING.screen },
  profileCard: { backgroundColor: c.bgCard, borderRadius: 24, padding: 22, flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: c.border },
  avatar: { width: 72, height: 72, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, fontWeight: '900' },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: 20, fontWeight: '900', color: c.textPrimary },
  profileEmail: { fontSize: 13, color: c.textMuted },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  levelText: { fontSize: 12, fontWeight: '700' },
  xpText: { fontSize: 12, color: c.textMuted, fontWeight: '700' },
  xpBarWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  xpBar: { flex: 1, height: 6, backgroundColor: c.border, borderRadius: 999, overflow: 'hidden' },
  xpFill: { height: '100%', borderRadius: 2 },
  xpBarText: { fontSize: 10, color: c.textMuted },
  group: { marginBottom: 20 },
  groupTitle: { fontSize: 13, fontWeight: '700', color: c.textMuted, marginBottom: 10, paddingLeft: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  groupCard: { backgroundColor: c.bgCard, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: c.border },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
  menuIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: c.textPrimary },
  badge: { backgroundColor: c.purple, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  version: { textAlign: 'center', color: c.textMuted, fontSize: 12, marginTop: 8 },
});
