import { Modal, View, Text, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useTheme } from '../context/themeContext';
import { useColors } from '../lib/theme';
import { useLanguage } from '../context/languageContext';
import { useMobileLayout } from '../lib/layout';
import { useSettings } from '../context/settingsContext';
import { RadarChart } from './RadarChart';
import { lifeDnaMetrics } from '../lib/lifeDna';
export function LifeDnaSheet({ visible, onClose, data, unavailable, loading, onRetry }: { visible: boolean; onClose: () => void; data: ReturnType<typeof lifeDnaMetrics>; unavailable: boolean; loading: boolean; onRetry: () => void }) {
  const { language } = useLanguage(); const copy = (id: string, en: string) => language === 'id' ? id : en;
  const { isDark } = useTheme(); const c = useColors(isDark); const layout = useMobileLayout(); const { width } = useWindowDimensions(); const { settings } = useSettings();
  const chart = data.chart.filter(item => !(settings.hideFinanceBalance && item.key === 'money'));
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1, paddingTop: layout.topPadding, backgroundColor: c.bgPrimary }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}><Text style={{ color: c.textPrimary, fontWeight: '800', fontSize: 22, flex: 1 }}>{copy('Life DNA', 'Life DNA')}</Text><TouchableOpacity accessibilityRole="button" onPress={onClose} style={{ minWidth: 48, minHeight: 48, justifyContent: 'center' }}><Text style={{ color: c.textPrimary }}>{copy('Tutup', 'Close')}</Text></TouchableOpacity></View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: layout.bottomPadding }}>
        <Text style={{ color: c.textSecondary, lineHeight: 22, marginBottom: 20 }}>{copy('Ringkasan dari aktivitas tercatat. Periode dan rumus setiap indikator dijelaskan di bawah.', 'A summary of recorded activity. Each indicator’s period and formula are explained below.')}</Text>
        {loading ? <Text style={{ color: c.textSecondary }}>{copy('Memuat aktivitas…', 'Loading activity…')}</Text> : unavailable ? <TouchableOpacity accessibilityRole="button" onPress={onRetry} style={{ minHeight: 48 }}><Text style={{ color: c.textPrimary }}>{copy('Sebagian sumber data belum tersedia. Ketuk untuk coba lagi.', 'Some data sources are unavailable. Tap to retry.')}</Text></TouchableOpacity> : !data.hasActivity ? <View style={{ paddingVertical: 24 }}><Text style={{ color: c.textPrimary, fontSize: 18, fontWeight: '700' }}>{copy('Belum ada aktivitas tercatat', 'No activity recorded yet')}</Text><Text style={{ color: c.textSecondary, lineHeight: 22, marginTop: 12 }}>{copy('Catat tugas, kebiasaan, jurnal, atau sesi fokus untuk mulai melihat ringkasan.', 'Record tasks, habits, journal entries, or focus sessions to start your summary.')}</Text></View> : <>
          {chart.length >= 3 && <View style={{ alignItems: 'center' }}><RadarChart data={chart.map(item => ({ label: language === 'id' ? item.id : item.en, value: item.value }))} size={Math.min(width - 40, 280)} /></View>}
          {data.metrics.map(item => <View key={item.key} style={{ padding: 16, marginBottom: 12, borderWidth: 1, borderColor: c.border, borderRadius: 16, backgroundColor: c.bgCard }}>
            <Text style={{ color: c.textPrimary, fontSize: 16, fontWeight: '700' }}>{language === 'id' ? item.id : item.en}: {settings.hideFinanceBalance && item.key === 'money' ? '••••' : item.available ? `${Math.round(item.value)}%` : copy('Belum ada data', 'No data yet')}</Text><Text style={{ color: c.textSecondary, lineHeight: 21, marginTop: 8 }}>{language === 'id' ? item.noteId : item.noteEn}</Text>
          </View>)}
          <Text style={{ color: c.textSecondary }}>{copy('Indikator sosial belum dihitung karena belum ada sumber data yang ditetapkan.', 'A social indicator is not calculated because no data source has been defined.')}</Text>
        </>}
      </ScrollView>
    </View>
  </Modal>;
}
