import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, StyleSheet, Image, TextInput, Modal
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { getXP, getCurrentLevel, getXPProgress } from '../../lib/gamification';
import { getData, setData, STORAGE_KEYS } from '../../lib/storage';
import { useAuth } from '../../hooks/useAuth';
import { useMobileLayout } from '../../lib/layout';
import { useLanguage } from '../../context/languageContext';

export default function ProfileScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const { user, logout, updateProfile: updateAuthProfile } = useAuth();
  const router = useRouter();
  const layout = useMobileLayout();
  const { t } = useLanguage();

  const [gamData, setGamData] = useState({ totalXP: 0 });
  const [profile, setProfile] = useState<{ avatarUri?: string, bio?: string }>({});
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');

  const loadData = useCallback(async () => {
    const [xp, prof] = await Promise.all([
      getXP(),
      getData(STORAGE_KEYS.USER_PROFILE)
    ]);
    setGamData(xp);
    if (prof) setProfile(prof);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const level = getCurrentLevel(gamData.totalXP);
  const progress = getXPProgress(gamData.totalXP);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const newProfile = { ...profile, avatarUri: uri };
      setProfile(newProfile);
      await setData(STORAGE_KEYS.USER_PROFILE, newProfile);
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    try {
      if (updateAuthProfile) {
        await updateAuthProfile({ name: newName.trim() });
      }
      setIsEditing(false);
      Alert.alert(`✅ ${t('profile.update_success_title')}`, t('profile.update_success_desc'));
    } catch (e) {
      Alert.alert(`❌ ${t('profile.update_fail_title')}`, t('profile.update_fail_desc'));
    }
  };

  const handleLogout = () => {
    Alert.alert(t('profile.logout_title'), t('profile.logout_confirm'), [
      { text: t('tasks.cancel'), style: 'cancel' },
      {
        text: t('profile.logout_btn'), style: 'destructive', onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        }
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      {/* Premium Profile Header */}
      <View style={[styles.headerBg, { backgroundColor: c.purple + '08', paddingTop: layout.topPadding + 20 }]}>
        <View style={styles.headerTopActions}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.roundBtn, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <MaterialIcons name="arrow-back" size={20} color={c.textPrimary} />
          </TouchableOpacity>
          <View />
          <TouchableOpacity style={[styles.roundBtn, { backgroundColor: c.bgCard, borderColor: c.border }]} onPress={handleLogout}>
            <MaterialIcons name="logout" size={20} color={c.red} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickImage} activeOpacity={0.9}>
          <View style={[styles.avatarGlow, { backgroundColor: level.color + '30' }]} />
          <View style={[styles.avatar, { backgroundColor: c.bgCard, borderColor: level.color, borderWidth: 3 }]}>
            {profile.avatarUri ? (
              <Image source={{ uri: profile.avatarUri }} style={styles.avatarImg} />
            ) : (
              <Text style={[styles.avatarInitials, { color: level.color }]}>
                {(user?.name || 'S').charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={[styles.editIcon, { backgroundColor: level.color }]}>
            <MaterialIcons name="camera-alt" size={16} color="#fff" />
          </View>
        </TouchableOpacity>

        <View style={styles.nameContainer}>
          <Text style={[styles.userName, { color: c.textPrimary }]}>{user?.name || 'SelfOne Explorer'}</Text>
          <View style={[styles.premiumBadge, { backgroundColor: c.purple + '15' }]}>
            <MaterialIcons name="verified" size={14} color={c.purple} />
            <Text style={[styles.premiumText, { color: c.purple }]}>PREMIUM</Text>
          </View>
        </View>
        <Text style={[styles.userEmail, { color: c.textMuted }]}>{user?.email || 'explorer@selfone.app'}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: layout.bottomPadding + 40 }}
      >
        {/* Statistics & Progress Section */}
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border, elevation: 4 }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="insights" size={20} color={c.purple} />
            <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t('profile.progress_analysis')}</Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: level.color }]}>{level.level}</Text>
              <Text style={[styles.statLab, { color: c.textMuted }]}>{t('gamification.level')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: c.purple }]}>{gamData.totalXP}</Text>
              <Text style={[styles.statLab, { color: c.textMuted }]}>Total XP</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: c.green }]}>{Math.floor(gamData.totalXP / 100)}</Text>
              <Text style={[styles.statLab, { color: c.textMuted }]}>{t('gamification.points')}</Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={[styles.progressLabel, { color: c.textSecondary }]}>{t(level.key)}</Text>
              <Text style={[styles.progressPercent, { color: level.color }]}>{Math.round(progress.percent)}%</Text>
            </View>
            <View style={[styles.track, { backgroundColor: c.bgInput }]}>
              <View style={[styles.fill, { width: `${progress.percent}%`, backgroundColor: level.color }]} />
            </View>
            <Text style={[styles.neededText, { color: c.textMuted }]}>
              {t('gamification.needed_xp').replace('{xp}', (progress.needed - progress.current).toString()).replace('{level}', (level.level + 1).toString())}
            </Text>
          </View>
        </View>

        {/* Identity & Personal Section */}
        <Text style={[styles.sectionTitle, { color: c.textMuted }]}>{t('profile.public_identity').toUpperCase()}</Text>
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          <TouchableOpacity style={styles.settingRow} onPress={() => { setNewName(user?.name || ''); setIsEditing(true); }}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: c.blue + '15' }]}>
                <MaterialIcons name="person-outline" size={20} color={c.blue} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: c.textPrimary }]}>{t('profile.full_name')}</Text>
                <Text style={[styles.settingVal, { color: c.textMuted }]}>{user?.name || 'SelfOne Explorer'}</Text>
              </View>
            </View>
            <MaterialIcons name="edit" size={18} color={c.purple} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: c.green + '15' }]}>
                <MaterialIcons name="mail-outline" size={20} color={c.green} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: c.textPrimary }]}>{t('profile.email_verified')}</Text>
                <Text style={[styles.settingVal, { color: c.textMuted }]}>{user?.email}</Text>
              </View>
            </View>
            <MaterialIcons name="verified-user" size={18} color={c.green} />
          </View>
        </View>

        <Text style={[styles.footerText, { color: c.textMuted }]}>
          {t('profile.footer_text')}
        </Text>
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal visible={isEditing} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.bgCard }]}>
            <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{t('profile.edit_name_title')}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
              value={newName}
              onChangeText={setNewName}
              placeholder={t('profile.edit_name_placeholder')}
              placeholderTextColor={c.textMuted}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: c.border, borderWidth: 1 }]} onPress={() => setIsEditing(false)}>
                <Text style={{ color: c.textSecondary, fontWeight: '700' }}>{t('tasks.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: c.purple }]} onPress={handleUpdateName}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>{t('tasks.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBg: { alignItems: 'center', paddingBottom: 40, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  headerTopActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 24, marginBottom: 20 },
  roundBtn: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  
  avatarWrapper: { marginBottom: 16, position: 'relative' },
  avatarGlow: { position: 'absolute', top: -8, left: -8, right: -8, bottom: -8, borderRadius: 44, opacity: 0.3 },
  avatar: { width: 100, height: 100, borderRadius: 36, alignItems: 'center', justifyContent: 'center', elevation: 10, shadowOpacity: 0.15, shadowRadius: 12, overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitials: { fontSize: 40, fontWeight: '900' },
  editIcon: { position: 'absolute', bottom: -4, right: -4, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  
  nameContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  userName: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  premiumBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  premiumText: { fontSize: 9, fontWeight: '900' },
  userEmail: { fontSize: 13, fontWeight: '600', marginTop: 2 },

  card: { borderRadius: 28, padding: 20, marginBottom: 20, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '900' },
  statLab: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  statDivider: { width: 1, height: 24, opacity: 0.5 },

  progressSection: { gap: 10 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  progressLabel: { fontSize: 14, fontWeight: '800' },
  progressPercent: { fontSize: 16, fontWeight: '900' },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  neededText: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 4 },

  sectionTitle: { fontSize: 11, fontWeight: '900', marginLeft: 20, marginBottom: 12, letterSpacing: 1.2 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 12, fontWeight: '800', marginBottom: 2 },
  settingVal: { fontSize: 14, fontWeight: '700' },
  divider: { height: 1, marginVertical: 4, opacity: 0.3 },
  footerText: { textAlign: 'center', fontSize: 11, fontWeight: '600', opacity: 0.6, marginTop: 10, marginBottom: 40 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', borderRadius: 24, padding: 24, elevation: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', marginBottom: 20 },
  input: { borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
});
