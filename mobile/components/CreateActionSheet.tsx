import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '../context/languageContext';
import { useTheme } from '../context/themeContext';
import { useColors } from '../lib/theme';
import { useMobileLayout } from '../lib/layout';
export function CreateActionSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { language } = useLanguage(); const { isDark } = useTheme(); const c = useColors(isDark); const layout = useMobileLayout(); const router = useRouter();
  const copy = (id: string, en: string) => language === 'id' ? id : en;
  const actions = [ ['tasks', 'checklist', copy('Tugas', 'Task')], ['habits', 'repeat', copy('Kebiasaan', 'Habit')], ['finance', 'account-balance-wallet', copy('Pengeluaran', 'Expense')], ['journal', 'edit', copy('Jurnal', 'Journal')] ];
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' }}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={copy('Tutup', 'Close')} onPress={onClose} style={{ flex: 1 }} />
      <View accessibilityViewIsModal style={{ maxHeight: '85%', backgroundColor: c.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Math.max(20, layout.insets.bottom) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text style={{ flex: 1, color: c.textPrimary, fontSize: 22, fontWeight: '700' }}>{copy('Tambah baru', 'Add new')}</Text><TouchableOpacity accessibilityRole="button" onPress={onClose} style={{ minWidth: 48, minHeight: 48, justifyContent: 'center' }}><Text style={{ color: c.textPrimary }}>{copy('Tutup', 'Close')}</Text></TouchableOpacity></View>
        <ScrollView>{actions.map(([route, icon, label]) => <TouchableOpacity key={route} accessibilityRole="button" onPress={() => { onClose(); router.push({ pathname: `/(app)/${route}`, params: { create: String(Date.now()) } } as any); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 64, paddingVertical: 12 }}><MaterialIcons name={icon as any} size={24} color={c.textPrimary} /><Text style={{ fontSize: 16, color: c.textPrimary, flex: 1 }}>{label}</Text><MaterialIcons name="chevron-right" size={24} color={c.textMuted} /></TouchableOpacity>)}</ScrollView>
      </View>
    </View>
  </Modal>;
}
