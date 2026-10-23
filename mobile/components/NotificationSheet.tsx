import { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/themeContext';
import { useLanguage } from '../context/languageContext';
import { useColors } from '../lib/theme';
import { useMobileLayout } from '../lib/layout';
import { AppNotification } from '../lib/notificationHistory';
import { sendTestNotification } from '../lib/notifications';
export function NotificationSheet({ visible, onClose, history }: { visible: boolean; onClose: () => void; history: { items: AppNotification[]; unread: number; loading: boolean; error: boolean; refresh: () => Promise<void>; markRead: (id?: string) => Promise<void> } }) {
  const [actionError, setActionError] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const { language } = useLanguage(); const copy = (id: string, en: string) => language === 'id' ? id : en;
  const { isDark } = useTheme(); const c = useColors(isDark); const layout = useMobileLayout(); const router = useRouter();

  const handleTestNotification = async () => {
    setTesting(true);
    try {
      await sendTestNotification(3);
      setTestSent(true);
      await history.refresh();
      setTimeout(() => setTestSent(false), 4000);
    } catch {
      setActionError(true);
    } finally {
      setTesting(false);
    }
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000066' }}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={copy('Tutup notifikasi', 'Close notifications')} onPress={onClose} style={{ flex: 1 }} />
      <View accessibilityViewIsModal style={{ maxHeight: '85%', padding: 20, paddingBottom: Math.max(20, layout.insets.bottom), borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: c.bgCard }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ flex: 1, fontSize: 22, fontWeight: '800', color: c.textPrimary }}>{copy('Notifikasi', 'Notifications')}{history.unread ? ` (${history.unread})` : ''}</Text>
          <TouchableOpacity onPress={handleTestNotification} disabled={testing} accessibilityRole="button" style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: isDark ? '#193F30' : '#E8F5E9' }}>
            <Text style={{ color: isDark ? '#88C9A0' : '#193F30', fontSize: 13, fontWeight: '700' }}>{testing ? '...' : copy('Uji Coba', 'Test')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" style={{ minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'flex-end' }}>
            <Text style={{ color: c.textPrimary }}>{copy('Tutup', 'Close')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ color: c.textSecondary, marginBottom: 8 }}>{copy('Notifikasi yang diterima di perangkat ini.', 'Notifications received on this device.')}</Text>
        {testSent && <Text accessibilityLiveRegion="polite" style={{ color: '#10B981', fontSize: 13, fontWeight: '600', marginBottom: 8 }}>{copy('Notifikasi uji coba dikirim! Banner akan muncul dalam 3 detik.', 'Test notification sent! Banner will appear in 3 seconds.')}</Text>}
        <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
          {history.loading && <ActivityIndicator color={c.textPrimary} />}
          {history.error && <TouchableOpacity onPress={history.refresh} accessibilityRole="button" style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: c.textPrimary }}>{copy('Gagal memuat notifikasi. Coba lagi.', 'Could not load notifications. Retry.')}</Text></TouchableOpacity>}
          {!history.loading && !history.error && !history.items.length && <Text style={{ color: c.textSecondary, paddingVertical: 24 }}>{copy('Belum ada notifikasi.', 'No notifications yet.')}</Text>}
          {actionError && <Text accessibilityLiveRegion="polite" style={{ color: c.textPrimary, marginBottom: 12 }}>{copy('Status baca belum tersimpan. Silakan coba lagi.', 'Read status could not save. Please retry.')}</Text>}
          {history.unread > 0 && <TouchableOpacity accessibilityRole="button" onPress={async () => { try { await history.markRead(); setActionError(false); } catch { setActionError(true); } }} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: c.textPrimary }}>{copy('Tandai semua dibaca', 'Mark all read')}</Text></TouchableOpacity>}
          {history.items.map(item => <TouchableOpacity key={item.id} accessibilityRole="button" accessibilityLabel={`${item.readAt ? '' : copy('Belum dibaca. ', 'Unread. ')}${item.title}`} onPress={async () => { try { await history.markRead(item.id); setActionError(false); if (item.route) { onClose(); router.push(item.route as any); } } catch { setActionError(true); } }} style={{ padding: 16, borderWidth: 1, borderColor: c.border, borderRadius: 16, marginBottom: 12 }}>
            <Text style={{ color: c.textPrimary, fontSize: 16, fontWeight: item.readAt ? '500' : '800' }}>{!item.readAt ? '● ' : ''}{item.title}</Text><Text style={{ color: c.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 6 }}>{item.body}</Text><Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 8 }}>{new Date(item.receivedAt).toLocaleString(language === 'id' ? 'id-ID' : 'en-US')}</Text>
          </TouchableOpacity>)}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
