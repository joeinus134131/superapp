import { SyncConflictSheet, SyncConflict } from '../../components/SyncConflictSheet';
import { EncryptedStorage } from '../../lib/secureStorage';
import { shareTextFile } from '../../lib/shareTextFile';
import { useSettings } from '../../context/settingsContext';
import { getSyncStatus, syncDatabase } from '../../lib/databaseSync';
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, StyleSheet, Image, TextInput, Modal, DeviceEventEmitter,
  KeyboardAvoidingView, Platform, Keyboard
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { WhenyaHeader } from '../../components/WhenyaHeader';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { getXP, getCurrentLevel, getXPProgress } from '../../lib/gamification';
import { getData, setData, STORAGE_KEYS } from '../../lib/storage';
import { useAuth } from '../../hooks/useAuth';
import { useMobileLayout } from '../../lib/layout';
import { useLanguage } from '../../context/languageContext';
import { statusAlert } from '../../lib/statusAlert';

import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen() {
  const { tx: translateCopy } = useLanguage();
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const { user, logout, updateProfile: updateAuthProfile } = useAuth();
  const router = useRouter();
  const layout = useMobileLayout();
  const { t, language } = useLanguage();
  const copy = (id: string, en: string) => language === 'id' ? id : en;
  const { settings } = useSettings();
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [syncState, setSyncState] = useState('');
  const [hasBackup, setHasBackup] = useState(false);

  const [gamData, setGamData] = useState({ totalXP: 0 });
  const [profile, setProfile] = useState<{ avatarUri?: string, bio?: string }>({});
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [lastSyncError, setLastSyncError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncPassword, setSyncPassword] = useState('');

  const loadData = useCallback(async () => {
    const status = await getSyncStatus();
    setLastSyncError(status?.error || '');
    setSyncState(status?.state || '');
    try { const backups = await EncryptedStorage.getItem('whenya_sync_conflict_backups_v1'); setHasBackup(Array.isArray(backups) && backups.length > 0); } catch { setHasBackup(false); }
    const [xp, prof, savedPwd] = await Promise.all([
      getXP(),
      getData(STORAGE_KEYS.USER_PROFILE),
      AsyncStorage.getItem('SYNC_PASSWORD')
    ]);
    setGamData(xp);
    if (prof) setProfile(prof);
    if (savedPwd) setSyncPassword(savedPwd);
  }, []);

  useFocusEffect(useCallback(() => {
    loadData();
    const subscription = DeviceEventEmitter.addListener('whenya:sync-status', status => { setLastSyncError(status.error || ''); setSyncState(status.state); });
    return () => subscription.remove();
  }, [loadData]));
  useEffect(() => { setConflicts([]); setLastSyncError(''); setSyncState(''); setHasBackup(false); }, [user?.id]);

  const handleSync = async (resolutions: Record<string, any> = {}) => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await syncDatabase({ resolutions, expectedOwner: user?.id });
      setConflicts([]);
      await loadData();
      statusAlert.success(
        translateCopy("Sinkronisasi Berhasil!"),
        translateCopy("{0} data diunggah, {1} data diunduh. Akun cloud terhubung.", [result.uploaded, result.downloaded])
      );
    } catch (error) {
      if (error && typeof error === 'object' && 'conflicts' in error && Array.isArray(error.conflicts)) {
        setConflicts(error.conflicts as SyncConflict[]);
        statusAlert.warning(
          copy("Konflik Sinkronisasi", "Sync Conflict"),
          copy("Ditemukan konflik data. Silakan pilih versi yang akan disimpan.", "Data conflict detected. Please select which version to keep.")
        );
        return;
      }
      statusAlert.error(
        translateCopy("Sinkronisasi Gagal"),
        translateCopy(error instanceof Error ? error.message : String(error))
      );
    } finally { setSyncing(false); loadData().catch(() => {}); }
  };

  const exportConflictBackup = async () => {
    if (settings.hideFinanceBalance) {
      Alert.alert(copy('Nominal sedang disembunyikan', 'Amounts are hidden'), copy('Cadangan dapat berisi data keuangan. Tampilkan nominal melalui pengaturan sebelum mengekspor.', 'Backups may contain financial data. Turn off amount hiding in settings before exporting.'));
      return;
    }
    try {
      const backups = await EncryptedStorage.getItem('whenya_sync_conflict_backups_v1');
      if (!Array.isArray(backups) || !backups.length) { Alert.alert(copy('Belum ada cadangan konflik', 'No conflict backups yet')); return; }
      await shareTextFile(JSON.stringify({ version: 1, kind: 'whenya-sync-conflict-backup', backups }, null, 2), `whenya-conflict-backup-${Date.now()}.json`, 'application/json', 'public.json');
    } catch { Alert.alert(copy('Cadangan gagal dibagikan. Coba lagi.', 'Could not share backup. Please retry.')); }
  };

  const handleSaveSyncPassword = async () => {
    try {
      await AsyncStorage.setItem('SYNC_PASSWORD', syncPassword);
      statusAlert.success(
        translateCopy("Password Disimpan"),
        translateCopy("Password enkripsi backup lama berhasil disimpan.")
      );
    } catch (e) {
      console.error(e);
      statusAlert.error(translateCopy("Gagal Menyimpan"), translateCopy("Terjadi kesalahan saat menyimpan password."));
    }
  };

  const level = getCurrentLevel(gamData.totalXP);
  const progress = getXPProgress(gamData.totalXP);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.35,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const dataUri = asset.base64
        ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
        : asset.uri;

      const newProfile = { ...profile, avatarUri: dataUri };
      setProfile(newProfile);
      await setData(STORAGE_KEYS.USER_PROFILE, newProfile);
      DeviceEventEmitter.emit('whenya:profile-updated', newProfile);

      // Sync to cloud metadata if user is logged in
      if (updateAuthProfile) {
        try {
          await updateAuthProfile({ metadata: { avatar_url: dataUri } });
        } catch (e) {
          console.warn('Gagal sync avatar ke cloud auth:', e);
        }
      }

      statusAlert.success(
        translateCopy("Foto Profil Diperbarui"),
        translateCopy("Avatar baru berhasil disimpan dan disinkronkan ke cloud.")
      );
    }
  };

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    try {
      if (updateAuthProfile) {
        await updateAuthProfile({ name: newName.trim() });
      }
      const updatedProfile = { ...profile, displayName: newName.trim() };
      setProfile(updatedProfile);
      await setData(STORAGE_KEYS.USER_PROFILE, updatedProfile);
      DeviceEventEmitter.emit('whenya:profile-updated', updatedProfile);
      setIsEditing(false);
      statusAlert.success(
        t('profile.update_success_title'),
        t('profile.update_success_desc')
      );
    } catch (e) {
      statusAlert.error(
        t('profile.update_fail_title'),
        t('profile.update_fail_desc')
      );
    }
  };

  const handleLogout = () => {
    Alert.alert(t('profile.logout_title'), t('profile.logout_confirm'), [
      { text: t('tasks.cancel'), style: 'cancel' },
      {
        text: t('profile.logout_btn'), style: 'destructive', onPress: async () => {
          try {
            await logout();
            router.replace('/(auth)/login');
          } catch { Alert.alert('Logout belum selesai', 'Periksa koneksi dan coba lagi.'); }
        }
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <SyncConflictSheet conflicts={conflicts} busy={syncing} onClose={() => setConflicts([])} onApply={handleSync} />
      <WhenyaHeader
        title={translateCopy("Profil Pengguna")}
        subtitle={translateCopy("Pengaturan akun & sinkronisasi data")}
        showBack={router.canGoBack()}
        rightAction={{
          materialIcon: 'logout',
          variant: 'secondary',
          onPress: handleLogout,
          accessibilityLabel: translateCopy("Keluar"),
        }}
      />
      <View style={[styles.headerBg, { backgroundColor: c.purple + '08', paddingTop: 16 }]}>

        <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickImage} activeOpacity={0.9}>
          <View style={[styles.avatarGlow, { backgroundColor: level.color + '30' }]} />
          <View style={[styles.avatar, { backgroundColor: c.bgCard, borderColor: level.color, borderWidth: 3 }]}>
            {(profile.avatarUri || user?.user_metadata?.avatar_url || user?.user_metadata?.picture) ? (
              <Image source={{ uri: profile.avatarUri || user?.user_metadata?.avatar_url || user?.user_metadata?.picture }} style={styles.avatarImg} />
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
          <Text style={[styles.userName, { color: c.textPrimary }]}>{user?.name || 'Whenya Explorer'}</Text>
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
        {/* Cloud Sync Card */}
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border, marginBottom: 20 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.iconBox, { backgroundColor: syncing ? c.purple + '20' : (syncState === 'success' ? '#10B98120' : c.purple + '15') }]}>
                <MaterialIcons
                  name={syncState === 'success' ? 'cloud-done' : (syncState === 'conflict' ? 'sync-problem' : 'cloud-sync')}
                  size={22}
                  color={syncState === 'success' ? '#10B981' : (syncState === 'conflict' ? '#F59E0B' : c.purple)}
                />
              </View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: c.textPrimary }}>{translateCopy("Sinkronisasi Cloud")}</Text>
                <Text style={{ fontSize: 11, color: c.textMuted }}>{user?.email || 'Akun Whenya'}</Text>
              </View>
            </View>

            {/* Status Pill Badge */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: syncState === 'success' ? '#10B98118' : (syncState === 'conflict' ? '#F59E0B18' : (lastSyncError ? '#EF444418' : c.purple + '12'))
            }}>
              <MaterialIcons
                name={syncState === 'success' ? 'check-circle' : (syncState === 'conflict' ? 'warning' : (lastSyncError ? 'error' : 'cloud'))}
                size={12}
                color={syncState === 'success' ? '#10B981' : (syncState === 'conflict' ? '#F59E0B' : (lastSyncError ? '#EF4444' : c.purple))}
              />
              <Text style={{
                fontSize: 10,
                fontWeight: '800',
                color: syncState === 'success' ? '#10B981' : (syncState === 'conflict' ? '#F59E0B' : (lastSyncError ? '#EF4444' : c.purple))
              }}>
                {syncing
                  ? translateCopy("Sinkron...")
                  : (syncState === 'success'
                      ? copy('Tersinkron', 'Synced')
                      : (syncState === 'conflict'
                          ? copy('Konflik', 'Conflict')
                          : (lastSyncError ? copy('Gagal', 'Failed') : copy('Tersambung', 'Connected'))))}
              </Text>
            </View>
          </View>

          {syncState === 'conflict' && (
            <View style={{ backgroundColor: '#F59E0B12', padding: 10, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#F59E0B30' }}>
              <Text style={{ color: isDark ? '#FCD34D' : '#D97706', fontSize: 12, lineHeight: 17, fontWeight: '600' }}>
                {copy('Sync otomatis dijeda karena ada perbedaan versi. Tekan tombol di bawah untuk memilih versi data yang ingin disimpan.', 'Automatic sync paused due to version differences. Tap below to choose which version to keep.')}
              </Text>
            </View>
          )}

          {lastSyncError ? (
            <View style={{ backgroundColor: '#EF444412', padding: 10, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#EF444430' }}>
              <Text style={{ color: isDark ? '#FCA5A5' : '#DC2626', fontSize: 12, lineHeight: 17, fontWeight: '600' }}>
                {translateCopy("Sinkronisasi terakhir gagal:")} {lastSyncError}
              </Text>
            </View>
          ) : null}

          {syncState === 'success' && !lastSyncError && (
            <Text style={{ color: c.textMuted, fontSize: 11, marginBottom: 12 }}>
              {copy('Sinkronisasi cloud terakhir berhasil. Data lokal dan server telah cocok.', 'Last synchronization succeeded. Local and server data are matched.')}
            </Text>
          )}

          <TouchableOpacity
            disabled={syncing}
            onPress={() => handleSync()}
            accessibilityRole="button"
            activeOpacity={0.8}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 13,
              backgroundColor: syncing ? c.border : c.purple,
              borderRadius: 14,
            }}
          >
            <MaterialIcons name={syncing ? 'sync' : 'cloud-sync'} size={18} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
              {syncing ? translateCopy("Sedang Menyinkronkan…") : translateCopy("Sinkronkan Akun Cloud")}
            </Text>
          </TouchableOpacity>

          {hasBackup && (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={exportConflictBackup}
              style={{ marginTop: 10, paddingVertical: 10, alignItems: 'center' }}
            >
              <Text style={{ color: c.purple, fontSize: 12, fontWeight: '700' }}>
                {copy('Bagikan cadangan konflik (JSON)', 'Share conflict backups (JSON)')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

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
              <Text style={[styles.statLab, { color: c.textMuted }]}>{translateCopy("Total XP")}</Text>
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
                <Text style={[styles.settingVal, { color: c.textMuted }]}>{user?.name || 'Whenya Explorer'}</Text>
              </View>
            </View>
            <MaterialIcons name="edit" size={18} color={c.purple} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: c.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: c.green + '15' }]}>
                <MaterialIcons name="verified-user" size={20} color={c.green} />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: c.textPrimary }]}>{t('profile.email_verified')}</Text>
                <Text style={[styles.settingVal, { color: c.textMuted }]}>{user?.email}</Text>
              </View>
            </View>
            <MaterialIcons name="verified-user" size={18} color={c.green} />
          </View>
        </View>

        {/* Security & Encryption Section */}
        <Text style={[styles.sectionTitle, { color: c.textMuted }]}>{translateCopy("KEAMANAN & PRIVASI")}</Text>
        <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          <View style={[styles.settingRow, { paddingVertical: 8, flexDirection: 'column', alignItems: 'flex-start' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }}>
              <View style={[styles.iconBox, { backgroundColor: c.green + '15' }]}>
                <MaterialIcons name="security" size={20} color={c.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingLabel, { color: c.textPrimary }]}>{translateCopy("Password backup lama")}</Text>
                <Text style={[styles.settingVal, { color: c.textMuted, fontSize: 11 }]}>{translateCopy("Khusus backup lama; sinkronisasi database memakai akses akun, tanpa enkripsi password.")}</Text>
              </View>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border, width: '100%', marginBottom: 0, paddingVertical: 10 }]}
              placeholder={translateCopy("Masukkan password E2E")}
              placeholderTextColor={c.textMuted}
              secureTextEntry
              value={syncPassword}
              onChangeText={setSyncPassword}
              onBlur={() => handleSaveSyncPassword()}
            />
          </View>
        </View>

        <Text style={[styles.footerText, { color: c.textMuted }]}>
          {t('profile.footer_text')}
        </Text>
      </ScrollView>

      {/* Edit Name Modal */}
      <Modal visible={isEditing} animationType="fade" transparent onRequestClose={() => setIsEditing(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => {
                Keyboard.dismiss();
                setIsEditing(false);
              }}
            />
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
        </KeyboardAvoidingView>
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
