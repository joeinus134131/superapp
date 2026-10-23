import { useAuth } from '../hooks/useAuth';
import { useCallback, useState } from 'react';
import { Text, TouchableOpacity, DeviceEventEmitter } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getSyncStatus } from '../lib/databaseSync';
import { SyncStatus } from '../lib/syncCoordinator';
import { useTheme } from '../context/themeContext';
import { useColors } from '../lib/theme';
import { useLanguage } from '../context/languageContext';
export function SyncStatusNotice() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SyncStatus | null>(null); const router = useRouter();
  const { language } = useLanguage(); const { isDark } = useTheme(); const c = useColors(isDark);
  useFocusEffect(useCallback(() => {
    let active = true, updated = false;
    getSyncStatus().then(value => { if (active && !updated) setStatus(value); }).catch(() => {});
    const subscription = DeviceEventEmitter.addListener('whenya:sync-status', value => { updated = true; if (active) setStatus(value); });
    return () => { active = false; subscription.remove(); };
  }, [user?.id]));
  if (status?.state !== 'conflict') return null;
  return <TouchableOpacity accessibilityRole="button" onPress={() => router.push('/(app)/profile' as any)} style={{ borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 16, backgroundColor: c.bgCard, marginBottom: 16 }}>
    <Text accessibilityLiveRegion="polite" style={{ color: c.textPrimary, fontWeight: '700', fontSize: 15 }}>{language === 'id' ? 'Sinkronisasi menunggu pilihan versi' : 'Sync needs your version choices'}</Text>
    <Text style={{ color: c.textSecondary, lineHeight: 20, marginTop: 6 }}>{language === 'id' ? 'Data lokal tetap tersedia. Ketuk untuk meninjau konflik di Profil.' : 'Local data is still available. Tap to review conflicts in Profile.'}</Text>
  </TouchableOpacity>;
}
