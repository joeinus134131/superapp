import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch,
  Alert, StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { getXP, getCurrentLevel, getXPProgress } from '../../lib/gamification';
import { clearAll } from '../../lib/storage';
import { useAuth } from '../../hooks/useAuth';
import { MOBILE_SPACING, useMobileLayout } from '../../lib/layout';

export default function ProfileScreen() {
  const { isDark, toggleTheme } = useTheme();
  const c = useColors(isDark);
  const { user, logout } = useAuth();
  const router = useRouter();
  const layout = useMobileLayout();

  const [gamData, setGamData] = useState({ totalXP: 0 });

  const loadGamData = useCallback(async () => {
    const xp = await getXP();
    setGamData(xp);
  }, []);

  useEffect(() => { loadGamData(); }, [loadGamData]);

  const level = getCurrentLevel(gamData.totalXP);
  const progress = getXPProgress(gamData.totalXP);

  const handleLogout = () => {
    Alert.alert('Keluar', 'Yakin ingin keluar dari akun?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar', style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        }
      },
    ]);
  };

  const handleClearData = () => {
    Alert.alert(
      '⚠️ Hapus Semua Data',
      'Semua data lokal (tasks, habits, pomodoro, dll) akan dihapus permanen. Tidak bisa dikembalikan!',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus Semua', style: 'destructive', onPress: async () => {
            await clearAll();
            Alert.alert('✅ Selesai', 'Semua data telah dihapus.');
          }
        },
      ]
    );
  };

  const settingItems = [
    {
      icon: isDark ? 'dark-mode' : 'light-mode',
      label: 'Mode Gelap',
      type: 'toggle' as const,
      value: isDark,
      onToggle: toggleTheme,
    },
  ];

  const dataItems = [
    { icon: 'delete-sweep', label: 'Hapus Semua Data', color: c.red, onPress: handleClearData },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bgPrimary }]}
      contentContainerStyle={{ paddingHorizontal: MOBILE_SPACING.screen, paddingTop: layout.topPadding, paddingBottom: layout.bottomPadding }}
      showsVerticalScrollIndicator={false}
    >
      {/* User Card */}
      <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        <View style={styles.userRow}>
          <View style={[styles.avatar, { backgroundColor: c.purple + '22' }]}>
            <MaterialIcons name="person" size={32} color={c.purple} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, { color: c.textPrimary }]}>
              {user?.name || user?.email || 'Pengguna'}
            </Text>
            <Text style={[styles.userEmail, { color: c.textSecondary }]}>
              {user?.email || 'user@superapp.com'}
            </Text>
          </View>
        </View>
      </View>

      {/* XP / Level Card */}
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
            {progress.current}/{progress.needed} XP → Lv. {level.level + 1}
          </Text>
        </View>
      </View>

      {/* Settings */}
      <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        <View style={styles.sectionTitleRow}>
          <MaterialIcons name="settings" size={18} color={c.purple} />
          <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Pengaturan</Text>
        </View>

        {settingItems.map((item, i) => (
          <View key={i} style={[styles.settingRow, { borderBottomColor: c.border }]}>
            <View style={styles.settingLeft}>
              <MaterialIcons name={item.icon as any} size={20} color={c.textSecondary} />
              <Text style={[styles.settingLabel, { color: c.textPrimary }]}>{item.label}</Text>
            </View>
            {item.type === 'toggle' && (
              <Switch
                value={item.value}
                onValueChange={item.onToggle}
                trackColor={{ false: c.border, true: c.purple + '66' }}
                thumbColor={item.value ? c.purple : '#ccc'}
              />
            )}
          </View>
        ))}
      </View>

      {/* Data Management */}
      <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        <View style={styles.sectionTitleRow}>
          <MaterialIcons name="storage" size={18} color={c.orange} />
          <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Data</Text>
        </View>

        {dataItems.map((item, i) => (
          <TouchableOpacity key={i} style={[styles.settingRow, { borderBottomColor: c.border }]} onPress={item.onPress}>
            <View style={styles.settingLeft}>
              <MaterialIcons name={item.icon as any} size={20} color={item.color} />
              <Text style={[styles.settingLabel, { color: item.color }]}>{item.label}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={c.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: c.red + '15', borderColor: c.red + '44' }]}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <MaterialIcons name="logout" size={20} color={c.red} />
        <Text style={[styles.logoutText, { color: c.red }]}>Keluar</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={[styles.version, { color: c.textMuted }]}>SuperApp Mobile v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderRadius: 20, padding: 18, marginBottom: 18, borderWidth: 1 },

  userRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: 20, fontWeight: '900' },
  userEmail: { fontSize: 14, marginTop: 4 },

  xpHeader: { marginBottom: 14 },
  xpTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  xpTitle: { fontSize: 18, fontWeight: '800' },
  levelBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  levelBadgeText: { fontSize: 12, fontWeight: '800' },
  xpTrack: { height: 10, borderRadius: 999, overflow: 'hidden', marginBottom: 10 },
  xpFill: { height: '100%', borderRadius: 8 },
  xpFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  xpText: { fontSize: 13, fontWeight: '600' },

  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800' },

  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingLabel: { fontSize: 15, fontWeight: '600' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 17, borderRadius: 18, borderWidth: 1, marginBottom: 18 },
  logoutText: { fontSize: 16, fontWeight: '700' },

  version: { textAlign: 'center', fontSize: 12, marginBottom: 20 },
});
