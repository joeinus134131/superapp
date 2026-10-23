import { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/themeContext';
import { useLanguage } from '../context/languageContext';
import { useColors } from '../lib/theme';
import { useMobileLayout } from '../lib/layout';
import { readJournalEntries } from '../lib/journalRepository';

export function DashboardSearch({ visible, onClose, tasks, goals }: { visible: boolean; onClose: () => void; tasks: any[]; goals: any[] }) {
  const { language } = useLanguage();
  const copy = (id: string, en: string) => language === 'id' ? id : en;
  const { isDark } = useTheme(); const c = useColors(isDark); const layout = useMobileLayout(); const router = useRouter();
  const [query, setQuery] = useState(''); const [journal, setJournal] = useState<any[]>([]);
  const [loading, setLoading] = useState(false); const [failed, setFailed] = useState(false); const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!visible) { setQuery(''); return; }
    let active = true; setLoading(true); setFailed(false); setJournal([]);
    readJournalEntries().then(data => { if (active) setJournal(data); })
      .catch(() => { if (active) setFailed(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [visible, retry]);
  const groups = [
    { label: copy('Tugas', 'Tasks'), route: 'tasks', data: tasks },
    { label: copy('Jurnal', 'Journal'), route: 'journal', data: journal },
    { label: copy('Tujuan', 'Goals'), route: 'goals', data: goals },
  ];
  const results = groups.flatMap(group => group.data.filter(item => query.trim() && `${item.title || ''} ${item.description || ''} ${item.content || ''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).map(item => ({ ...item, route: group.route, label: group.label })));
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: c.bgPrimary, paddingTop: layout.topPadding }}>
      <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ flex: 1, fontSize: 22, fontWeight: '700', color: c.textPrimary }}>{copy('Pencarian', 'Search')}</Text>
        <TouchableOpacity accessibilityRole="button" onPress={onClose} style={{ minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: c.textPrimary }}>{copy('Tutup', 'Close')}</Text></TouchableOpacity>
      </View>
      <TextInput autoFocus accessibilityLabel={copy('Cari tugas, jurnal, atau tujuan', 'Search tasks, journal, or goals')} value={query} onChangeText={setQuery} placeholder={copy('Cari tugas, jurnal, atau tujuan…', 'Search tasks, journal, or goals…')} placeholderTextColor={c.textMuted} style={{ margin: 20, padding: 16, minHeight: 52, borderWidth: 1, borderColor: c.border, borderRadius: 16, color: c.textPrimary, backgroundColor: c.bgCard, fontSize: 16 }} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: layout.bottomPadding }}>
        <Text style={{ color: c.textSecondary, marginBottom: 16 }}>{copy('Mencari data yang tersimpan di perangkat ini.', 'Searches data saved on this device.')}</Text>
        {loading && <ActivityIndicator color={c.textPrimary} />}
        {failed && <TouchableOpacity onPress={() => setRetry(n => n + 1)} style={{ minHeight: 48 }}><Text style={{ color: c.textPrimary }}>{copy('Jurnal gagal dimuat. Coba lagi', 'Journal could not load. Retry')}</Text></TouchableOpacity>}
        {!loading && !failed && !results.length && <Text accessibilityLiveRegion="polite" style={{ color: c.textSecondary }}>{query.trim() ? copy('Tidak ada hasil. Coba kata lain.', 'No results. Try another keyword.') : copy('Ketik judul atau isi yang ingin dicari.', 'Type a title or content to search.')}</Text>}
        {results.map(item => <TouchableOpacity key={`${item.route}-${item.id}`} accessibilityRole="button" onPress={() => { onClose(); router.push({ pathname: `/(app)/${item.route}`, params: { item: item.id } } as any); }} style={{ padding: 16, marginBottom: 12, borderRadius: 16, backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border }}>
          <Text style={{ color: c.textSecondary, marginBottom: 4 }}>{item.label}</Text><Text style={{ color: c.textPrimary, fontSize: 16 }}>{item.title || item.content}</Text>
        </TouchableOpacity>)}
      </ScrollView>
    </KeyboardAvoidingView>
  </Modal>;
}
