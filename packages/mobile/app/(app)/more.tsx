import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Switch, Modal, TextInput
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { getData, STORAGE_KEYS, clearAll } from '../../lib/storage';
import { getCurrentLevel, getXPProgress } from '../../lib/gamification';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/languageContext';
import { useSecurity } from '../../context/securityContext';
import { useSettings } from '../../context/settingsContext';
import { useMobileLayout } from '../../lib/layout';
import * as Haptics from 'expo-haptics';

export default function MoreScreen() {
  const { isDark, toggleTheme } = useTheme();
  const c = useColors(isDark);
  const { user, logout: signOut } = useAuth();
  const layout = useMobileLayout();
  const { hasPIN, clearPIN, setPIN, isBiometricsEnabled, toggleBiometrics, isSupported } = useSecurity();
  const { language, setLanguage, t } = useLanguage();
  const { settings, updateSetting } = useSettings();
  
  const [xp, setXp] = useState(0);
  const [profile, setProfile] = useState<{ displayName?: string, avatarUri?: string }>({});
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');

  const loadData = useCallback(async () => {
    const [gamData, profileData] = await Promise.all([
      getData(STORAGE_KEYS.GAMIFICATION),
      getData(STORAGE_KEYS.USER_PROFILE)
    ]);
    setXp(gamData?.totalXP || 0);
    if (profileData) setProfile(profileData);
  }, []);

  useEffect(() => {
    loadData();
  }, [user, loadData]);

  const level = getCurrentLevel(xp);
  const nextLevel = getXPProgress(xp);
  const displayName = profile.displayName || user?.name || user?.email?.split('@')[0] || 'Explorer';

  const handleLogout = () => {
    Alert.alert(t('sidebar.menu_logout'), t('login.subtitle'), [
      { text: t('tasks.cancel'), style: 'cancel' },
      { 
        text: t('sidebar.menu_logout'), 
        style: 'destructive', 
        onPress: async () => {
          try {
            await signOut();
            router.replace('/(auth)/login');
          } catch (e) {
            console.error('Logout failed', e);
          }
        } 
      },
    ]);
  };

  const handleClearData = () => {
    Alert.alert(
      '⚠️ Hapus Semua Data',
      'Ini akan menghapus SEMUA data lokal termasuk tasks, habits, jurnal, dll. Data tidak bisa dipulihkan!',
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus', style: 'destructive', onPress: async () => { await clearAll(); Alert.alert('Data dihapus'); loadData(); } },
      ]
    );
  };

  const handleSavePin = async () => {
    if (newPin.length !== 4) {
      Alert.alert('Format Salah', 'PIN harus terdiri dari 4 digit angka.');
      return;
    }
    await setPIN(newPin);
    setShowPinModal(false);
    setNewPin('');
    Alert.alert('✅ Berhasil', 'Kunci PIN telah diaktifkan.');
  };

  const s = styles(c, isDark);

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={[s.content, { paddingTop: layout.topPadding, paddingBottom: layout.bottomPadding + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <TouchableOpacity 
          style={s.profileCard} 
          onPress={() => router.push('/(app)/profile')}
          activeOpacity={0.9}
        >
          <View style={[s.avatar, { backgroundColor: c.bgInput }]}>
            {profile.avatarUri ? (
              <Image source={{ uri: profile.avatarUri }} style={s.avatarImg} />
            ) : (
              <Text style={[s.avatarText, { color: level.color }]}>
                {displayName.slice(0, 1).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{displayName}</Text>
            <Text style={s.profileEmail} numberOfLines={1}>{user?.email}</Text>
            
            <View style={s.levelRow}>
              <View style={[s.levelBadge, { backgroundColor: level.color + '15' }]}>
                <MaterialIcons name="military-tech" size={14} color={level.color} />
                <Text style={[s.levelText, { color: level.color }]}>Level {level.level}</Text>
              </View>
              <Text style={s.xpText}>{xp} XP Total</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={c.textMuted} />
        </TouchableOpacity>

        {/* Section: Productivity */}
        <Text style={s.groupTitle}>{t('sidebar.productivity')}</Text>
        <View style={s.groupCard}>
          <MenuItem icon="people" color={c.blue} label={t('social.title')} onPress={() => router.push('/(app)/social')} showArrow c={c} />
          <MenuItem icon="flag" color={c.orange} label={t('sidebar.goals')} onPress={() => router.push('/(app)/goals')} showArrow c={c} />
          <MenuItem icon="menu-book" color={c.purple} label={t('sidebar.reading')} onPress={() => router.push('/(app)/reading')} showArrow c={c} />
          <MenuItem icon="event" color={c.blue} label={t('sidebar.calendar')} onPress={() => router.push('/(app)/calendar')} showArrow c={c} isLast />
        </View>

        {/* Section: Health */}
        <Text style={s.groupTitle}>{t('sidebar.life')}</Text>
        <View style={s.groupCard}>
          <MenuItem icon="fitness-center" color={c.red} label={t('sidebar.health')} onPress={() => router.push('/(app)/health')} showArrow c={c} />
          <MenuItem icon="create" color={c.pink} label={t('sidebar.journal')} onPress={() => router.push('/(app)/journal')} showArrow c={c} />
          <MenuItem icon="emoji-events" color={c.yellow} label={t('sidebar.achievements')} onPress={() => router.push('/(app)/achievements')} showArrow c={c} isLast />
        </View>

        {/* Section: Settings (With Switch Buttons) */}
        <Text style={s.groupTitle}>{t('sidebar.settings')}</Text>
        <View style={s.groupCard}>
          <View style={s.menuItem}>
            <View style={[s.menuIcon, { backgroundColor: c.purple + '12' }]}>
              <MaterialIcons name={isDark ? "light-mode" : "dark-mode"} size={20} color={c.purple} />
            </View>
            <Text style={s.menuLabel}>{isDark ? t('login.light_mode') || 'Mode Terang' : t('login.dark_mode') || 'Mode Gelap'}</Text>
            <Switch 
              value={Boolean(isDark)} 
              onValueChange={toggleTheme} 
              trackColor={{ false: c.border, true: c.purple + '80' }} 
              thumbColor={isDark ? c.purple : '#f4f3f4'}
            />
          </View>
          <View style={s.menuItemDivider} />
          
          <View style={s.menuItem}>
            <View style={[s.menuIcon, { backgroundColor: c.blue + '12' }]}>
              <MaterialIcons name="language" size={20} color={c.blue} />
            </View>
            <Text style={s.menuLabel}>{language === 'en' ? 'English' : 'Bahasa Indonesia'}</Text>
            <Switch 
              value={Boolean(language === 'en')} 
              onValueChange={(v) => setLanguage(v ? 'en' : 'id')} 
              trackColor={{ false: c.border, true: c.blue + '80' }} 
              thumbColor={language === 'en' ? c.blue : '#f4f3f4'}
            />
          </View>
          <View style={s.menuItemDivider} />

          <View style={s.menuItem}>
            <View style={[s.menuIcon, { backgroundColor: c.purple + '12' }]}>
              <MaterialIcons name="visibility-off" size={20} color={c.purple} />
            </View>
            <Text style={s.menuLabel}>{t('settings.hide_balance')}</Text>
            <Switch 
              value={Boolean(settings.hideFinanceBalance)} 
              onValueChange={(v) => updateSetting('hideFinanceBalance', v)} 
              trackColor={{ false: c.border, true: c.purple + '80' }} 
              thumbColor={settings.hideFinanceBalance ? c.purple : '#f4f3f4'}
            />
          </View>
          <View style={s.menuItemDivider} />

          <MenuItem 
            icon="lock" 
            color={hasPIN ? c.green : c.textSecondary} 
            label={hasPIN ? t('security.pin_lock') + " (Active)" : t('security.setup_pin')} 
            onPress={() => {
              if (hasPIN) {
                Alert.alert(t('security.pin_lock'), t('profile.logout_confirm'), [
                  { text: t('security.clear_pin'), onPress: () => setShowPinModal(true) },
                  { text: t('security.clear_pin'), style: 'destructive', onPress: clearPIN },
                  { text: t('tasks.cancel'), style: 'cancel' }
                ]);
              } else {
                setShowPinModal(true);
              }
            }} 
            showArrow 
            c={c} 
            isLast={!isSupported || !hasPIN} 
          />

          {isSupported && hasPIN && (
            <>
              <View style={s.menuItemDivider} />
              <View style={s.menuItem}>
                <View style={[s.menuIcon, { backgroundColor: c.blue + '12' }]}>
                  <MaterialIcons name="face" size={20} color={c.blue} />
                </View>
                <Text style={s.menuLabel}>Biometric Unlock</Text>
                <Switch 
                  value={Boolean(isBiometricsEnabled)} 
                  onValueChange={toggleBiometrics} 
                  trackColor={{ false: c.border, true: c.blue + '80' }} 
                  thumbColor={isBiometricsEnabled ? c.blue : '#f4f3f4'}
                />
              </View>
            </>
          )}
        </View>

        {/* Section: Account & Info */}
        <Text style={s.groupTitle}>{t('sidebar.system')}</Text>
        <View style={s.groupCard}>
        <MenuItem icon="info" color={c.textSecondary} label={t('sidebar.menu_guide')} onPress={() => Alert.alert('SelfOne', 'Asisten Pengembangan Diri All-in-One.\nVersi 1.0.0 Stable')} showArrow c={c} />
          <MenuItem icon="logout" color={c.red} label={t('sidebar.menu_logout')} onPress={handleLogout} c={c} />
          <MenuItem icon="delete-forever" color={c.red} label={t('sidebar.menu_restore')} onPress={handleClearData} c={c} isLast />
        </View>

        <Text style={s.version}>SelfOne Mobile Version 1.0.0 (Stable)</Text>
      </ScrollView>

      {/* PIN Modal */}
      <Modal visible={showPinModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: c.bgCard }]}>
            <Text style={[s.modalTitle, { color: c.textPrimary }]}>Setup PIN Baru</Text>
            <Text style={{ color: c.textSecondary, marginBottom: 20 }}>Masukkan 4 digit angka untuk mengunci aplikasi.</Text>
            <TextInput
              style={[s.pinInput, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
              value={newPin}
              onChangeText={setNewPin}
              placeholder="0000"
              placeholderTextColor={c.textMuted}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              autoFocus
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={[s.modalBtn, { borderColor: c.border, borderWidth: 1 }]} onPress={() => { setShowPinModal(false); setNewPin(''); }}>
                <Text style={{ color: c.textSecondary, fontWeight: '700' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: c.purple }]} onPress={handleSavePin}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>Simpan PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const MenuItem = ({ icon, color, label, onPress, showArrow, isLast, c }: any) => {
  return (
    <>
      <TouchableOpacity 
        style={stylesMenuItem.item} 
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        activeOpacity={0.7}
      >
        <View style={[stylesMenuItem.icon, { backgroundColor: color + '12' }]}>
          <MaterialIcons name={icon} size={20} color={color} />
        </View>
        <Text style={[stylesMenuItem.label, { color: c.textPrimary }]}>{label}</Text>
        {showArrow && <MaterialIcons name="chevron-right" size={20} color={c.textMuted} />}
      </TouchableOpacity>
      {!isLast && <View style={[stylesMenuItem.divider, { backgroundColor: c.border }]} />}
    </>
  );
};

const stylesMenuItem = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  icon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  label: { flex: 1, fontSize: 16, fontWeight: '700' },
  divider: { height: 1, marginHorizontal: 18, opacity: 0.1 },
});

const styles = (c: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgPrimary },
  content: { paddingHorizontal: 24 },
  profileCard: { 
    backgroundColor: c.bgCard, 
    borderRadius: 28, 
    padding: 24, 
    flexDirection: 'row', 
    gap: 16, 
    alignItems: 'center', 
    marginBottom: 28, 
    borderWidth: 1, 
    borderColor: c.border,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  avatar: { width: 80, height: 80, borderRadius: 28, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { fontSize: 28, fontWeight: '900' },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: 22, fontWeight: '900', color: c.textPrimary, letterSpacing: -0.5 },
  profileEmail: { fontSize: 13, color: c.textMuted, fontWeight: '600' },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  levelText: { fontSize: 12, fontWeight: '800' },
  xpText: { fontSize: 12, color: c.textMuted, fontWeight: '700' },
  
  groupTitle: { fontSize: 11, fontWeight: '900', color: c.textMuted, marginBottom: 12, paddingLeft: 4, textTransform: 'uppercase', letterSpacing: 1.5 },
  groupCard: { backgroundColor: c.bgCard, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: c.border, marginBottom: 24 },
  
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  menuIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '700', color: c.textPrimary },
  menuItemDivider: { height: 1, marginHorizontal: 18, backgroundColor: c.border, opacity: 0.1 },

  version: { textAlign: 'center', color: c.textMuted, fontSize: 11, fontWeight: '700', marginTop: 10 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', borderRadius: 28, padding: 28, elevation: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  pinInput: { borderRadius: 16, padding: 18, fontSize: 24, borderWidth: 1, marginBottom: 24, textAlign: 'center', letterSpacing: 10, fontWeight: '900' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
});
