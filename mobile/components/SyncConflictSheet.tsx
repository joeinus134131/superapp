import { useEffect, useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../context/themeContext';
import { useColors } from '../lib/theme';
import { useLanguage } from '../context/languageContext';
import { useSettings } from '../context/settingsContext';
import { useMobileLayout } from '../lib/layout';
export interface SyncConflict { key: string; local: any; cloud: any; localHash: string; revision: number; checksum: string }
export function SyncConflictSheet({ conflicts, busy, onClose, onApply }: {
  conflicts: SyncConflict[]; busy: boolean; onClose: () => void;
  onApply: (resolutions: Record<string, any>) => void;
}) {
  const { language } = useLanguage(); const copy = (id: string, en: string) => language === 'id' ? id : en;
  const { isDark } = useTheme(); const c = useColors(isDark); const layout = useMobileLayout(); const { settings } = useSettings();
  const [choices, setChoices] = useState<Record<string, 'local' | 'cloud'>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  useEffect(() => { setChoices({}); setExpanded({}); }, [conflicts]);
  const names: Record<string, string> = {
    superapp_tasks: copy('Tugas', 'Tasks'), superapp_habits: copy('Kebiasaan', 'Habits'), superapp_transactions: copy('Keuangan', 'Finance'),
    superapp_gamification: copy('XP dan level', 'XP and level'), superapp_daily_login: copy('Login harian', 'Daily login'),
    superapp_journal: copy('Jurnal', 'Journal'), superapp_goals: copy('Tujuan', 'Goals'),
  };
  const summary = (value: any) => {
    if (value === null) return copy('Tidak ada data / dihapus', 'No data / deleted');
    if (Array.isArray(value)) return `${value.length} ${copy('entri', 'entries')}`;
    if (value && typeof value === 'object' && typeof value.totalXP === 'number') return `${value.totalXP} XP`;
    if (typeof value === 'string') return value;
    return copy('Data tersedia; buka detail untuk membandingkan.', 'Data available; expand details to compare.');
  };
  const complete = conflicts.length > 0 && conflicts.every(item => choices[item.key]);
  return <Modal visible={conflicts.length > 0} animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
    <View style={{ flex: 1, backgroundColor: c.bgPrimary, paddingTop: layout.topPadding }}>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ flex: 1, fontSize: 22, fontWeight: '800', color: c.textPrimary }}>{copy('Tinjau konflik data', 'Review data conflicts')}</Text>
        <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={onClose} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: c.textPrimary }}>{copy('Nanti', 'Later')}</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: layout.bottomPadding }}>
        <Text style={{ color: c.textSecondary, fontSize: 15, lineHeight: 23, marginBottom: 20 }}>{copy('Pilih versi untuk setiap modul. Pilihan mengganti seluruh isi modul; tidak menggabungkan entri. Kedua versi dicadangkan secara terenkripsi sebelum diterapkan. Sync otomatis dijeda sampai konflik selesai.', 'Choose a version for each module. The choice replaces the whole module; entries are not merged. Both versions are backed up with encryption before applying. Automatic sync pauses until conflicts are resolved.')}</Text>
        {conflicts.map(item => {
          const privateFinance = settings.hideFinanceBalance && item.key === 'superapp_transactions';
          return <View key={item.key} style={{ borderRadius: 18, borderWidth: 1, borderColor: c.border, backgroundColor: c.bgCard, padding: 16, marginBottom: 16 }}>
            <Text style={{ color: c.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>{names[item.key] || item.key.replace('superapp_', '')}</Text>
            {(['local', 'cloud'] as const).map(choice => <TouchableOpacity key={choice} accessibilityRole="radio" accessibilityState={{ checked: choices[item.key] === choice, disabled: busy }} disabled={busy} onPress={() => setChoices(previous => ({ ...previous, [item.key]: choice }))} style={{ padding: 14, minHeight: 64, borderWidth: 2, borderRadius: 12, marginBottom: 10, borderColor: choices[item.key] === choice ? (isDark ? '#88C9A0' : '#193F30') : c.border }}>
              <Text style={{ color: c.textPrimary, fontSize: 15, fontWeight: '700' }}>{choices[item.key] === choice ? '◉ ' : '○ '}{choice === 'local' ? copy('Gunakan versi perangkat ini', 'Use this device’s version') : copy('Gunakan versi cloud', 'Use cloud version')}</Text>
              <Text style={{ color: c.textSecondary, marginTop: 6 }}>{summary(item[choice])}</Text>
            </TouchableOpacity>)}
            {!privateFinance ? <TouchableOpacity accessibilityRole="button" onPress={() => setExpanded(previous => ({ ...previous, [item.key]: !previous[item.key] }))} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: c.textPrimary }}>{expanded[item.key] ? copy('Tutup detail', 'Hide details') : copy('Bandingkan detail lengkap', 'Compare full details')}</Text></TouchableOpacity> : <Text style={{ color: c.textSecondary }}>{copy('Detail nominal disembunyikan sesuai pengaturan privasi.', 'Amount details are hidden by your privacy setting.')}</Text>}
            {expanded[item.key] && !privateFinance && (['local', 'cloud'] as const).map(choice => <View key={choice} style={{ paddingVertical: 12 }}><Text style={{ color: c.textPrimary, fontWeight: '700', marginBottom: 8 }}>{choice === 'local' ? copy('Perangkat ini', 'This device') : 'Cloud'}</Text><Text selectable style={{ color: c.textSecondary, fontSize: 13, lineHeight: 20 }}>{JSON.stringify(item[choice], null, 2)}</Text></View>)}
          </View>;
        })}
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !complete || busy }} disabled={!complete || busy} onPress={() => onApply(Object.fromEntries(conflicts.map(item => [item.key, { choice: choices[item.key], localHash: item.localHash, revision: item.revision, checksum: item.checksum }])))} style={{ minHeight: 56, padding: 16, borderRadius: 16, backgroundColor: '#193F30', opacity: !complete || busy ? 0.5 : 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>{busy ? copy('Mencadangkan dan menyinkronkan…', 'Backing up and syncing…') : copy('Cadangkan & terapkan pilihan', 'Back up & apply choices')}</Text></TouchableOpacity>
        {!complete && <Text style={{ color: c.textSecondary, marginTop: 12 }}>{copy('Pilih satu versi pada setiap modul untuk melanjutkan.', 'Select one version for every module to continue.')}</Text>}
      </ScrollView>
    </View>
  </Modal>;
}
