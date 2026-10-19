import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/themeContext';
import { useColors } from '../lib/theme';
import { useMobileLayout, MOBILE_SPACING } from '../lib/layout';
import { PageHeader } from './PageHeader';
import { Card } from './ui/Card';

export interface DestinationItem {
  href: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  description: string;
  color: string;
}

interface DestinationHubProps {
  title: string;
  subtitle: string;
  items: DestinationItem[];
}

export function DestinationHub({ title, subtitle, items }: DestinationHubProps) {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();

  return (
    <View style={[styles.screen, { backgroundColor: c.bgPrimary }]}>
      <PageHeader title={title} subtitle={subtitle} showBack={router.canGoBack()} textColor={c.textPrimary} subtextColor={c.textSecondary} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: layout.bottomPadding + 32 }]} showsVerticalScrollIndicator={false}>
        {items.map(item => (
          <Card key={item.href} onPress={() => router.push(item.href as never)} style={styles.card}>
            <View style={[styles.icon, { backgroundColor: `${item.color}14` }]}>
              <MaterialIcons name={item.icon} size={23} color={item.color} />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.label, { color: c.textPrimary }]}>{item.label}</Text>
              <Text style={[styles.description, { color: c.textSecondary }]}>{item.description}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={c.textMuted} />
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: MOBILE_SPACING.screen, paddingTop: 8, gap: 12 },
  card: { minHeight: 88, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  label: { fontSize: 17, fontWeight: '700', marginBottom: 3 },
  description: { fontSize: 14, lineHeight: 20 },
});
