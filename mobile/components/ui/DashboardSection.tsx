import { ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
export function DashboardSection({ title, action, onAction, children }: { title: string; action?: string; onAction?: () => void; children: ReactNode }) {
  const { isDark } = useTheme(); const c = useColors(isDark);
  return <View style={{ marginBottom: 24 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}><Text style={{ flex: 1, color: c.textPrimary, fontSize: 20, fontWeight: '800' }}>{title}</Text>{action && <TouchableOpacity accessibilityRole="button" onPress={onAction} style={{ minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }}><Text style={{ color: c.textPrimary, fontSize: 14, fontWeight: '700' }}>{action}</Text></TouchableOpacity>}</View>
    {children}
  </View>;
}
export function DashboardEmptyState({ title, message, action, onAction }: { title: string; message?: string; action?: string; onAction?: () => void }) {
  const { isDark } = useTheme(); const c = useColors(isDark);
  return <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: 20, padding: 18, backgroundColor: c.bgCard }}>
    <Text style={{ color: c.textPrimary, fontSize: 16, fontWeight: '700' }}>{title}</Text>{message && <Text style={{ color: c.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 8 }}>{message}</Text>}
    {action && <TouchableOpacity accessibilityRole="button" onPress={onAction} style={{ minHeight: 48, marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: '#193F30', justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700', textAlign: 'center' }}>{action}</Text></TouchableOpacity>}
  </View>;
}
