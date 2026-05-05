import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { useMobileLayout } from '../../lib/layout';
import { useLanguage } from '../../context/languageContext';

interface TabBarIconProps {
  color: string;
}

export default function AppLayout() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();
  const { t } = useLanguage();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.purple,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: {
          backgroundColor: c.tabBg,
          borderTopColor: c.tabBorder,
          height: layout.tabBarHeight,
          paddingBottom: layout.tabBarPaddingBottom,
          paddingTop: 10,
          paddingHorizontal: 10,
          elevation: 0,
          shadowOpacity: 0,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
          borderRadius: 14,
        },
        headerStyle: {
          backgroundColor: c.bgPrimary,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: c.textPrimary,
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 18,
        },
      }}
    >
      {/* ---- Main tabs (visible in tab bar) ---- */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('sidebar.dashboard'),
          headerShown: false,
          tabBarLabel: t('sidebar.dashboard'),
          tabBarIcon: ({ color }: TabBarIconProps) => (
            <MaterialIcons name="dashboard" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: t('sidebar.tasks'),
          headerShown: false,
          tabBarLabel: t('sidebar.tasks'),
          tabBarIcon: ({ color }: TabBarIconProps) => (
            <MaterialIcons name="checklist" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: t('sidebar.habits'),
          tabBarLabel: t('sidebar.habits'),
          headerShown: false,
          tabBarIcon: ({ color }: TabBarIconProps) => (
            <MaterialIcons name="local-fire-department" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pomodoro"
        options={{
          title: t('sidebar.pomodoro'),
          tabBarLabel: t('sidebar.pomodoro'),
          headerShown: false,
          tabBarIcon: ({ color }: TabBarIconProps) => (
            <MaterialIcons name="timer" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: t('sidebar.finance'),
          headerShown: false,
          tabBarLabel: t('sidebar.finance'),
          tabBarIcon: ({ color }: TabBarIconProps) => (
            <MaterialIcons name="account-balance-wallet" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('sidebar.more'),
          tabBarLabel: t('sidebar.more'),
          headerShown: false,
          tabBarIcon: ({ color }: TabBarIconProps) => (
            <MaterialIcons name="apps" size={24} color={color} />
          ),
        }}
      />

      {/* ---- Hidden screens (accessible via navigation, not tab bar) ---- */}
      <Tabs.Screen name="profile" options={{ href: null, title: t('sidebar.settings'), headerShown: false }} />
      <Tabs.Screen name="social" options={{ href: null, title: 'Social', headerShown: false }} />
      <Tabs.Screen name="goals" options={{ href: null, title: 'Goals', headerShown: false }} />
      <Tabs.Screen name="health" options={{ href: null, title: 'Health', headerShown: false }} />
      <Tabs.Screen name="journal" options={{ href: null, title: 'Journal', headerShown: false }} />
      <Tabs.Screen name="reading" options={{ href: null, title: 'Reading', headerShown: false }} />
      <Tabs.Screen name="calendar" options={{ href: null, title: 'Kalender', headerShown: false }} />
      <Tabs.Screen name="achievements" options={{ href: null, title: 'Pencapaian', headerShown: false }} />
    </Tabs>
  );
}
