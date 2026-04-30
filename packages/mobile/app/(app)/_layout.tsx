import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { useMobileLayout } from '../../lib/layout';

interface TabBarIconProps {
  color: string;
}

export default function AppLayout() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();

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
          title: 'Dashboard',
          headerShown: false,
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }: TabBarIconProps) => (
            <MaterialIcons name="dashboard" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          headerShown: false,
          tabBarLabel: 'Tasks',
          tabBarIcon: ({ color }: TabBarIconProps) => (
            <MaterialIcons name="checklist" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: 'Habits',
          tabBarLabel: 'Habits',
          headerStyle: { backgroundColor: c.bgPrimary, elevation: 0, shadowOpacity: 0 },
          headerTitleStyle: { fontWeight: '800', color: c.textPrimary },
          tabBarIcon: ({ color }: TabBarIconProps) => (
            <MaterialIcons name="local-fire-department" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pomodoro"
        options={{
          title: 'Pomodoro',
          tabBarLabel: 'Focus',
          headerStyle: { backgroundColor: c.bgPrimary, elevation: 0, shadowOpacity: 0 },
          headerTitleStyle: { fontWeight: '800', color: c.textPrimary },
          tabBarIcon: ({ color }: TabBarIconProps) => (
            <MaterialIcons name="timer" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarLabel: 'More',
          headerShown: false,
          tabBarIcon: ({ color }: TabBarIconProps) => (
            <MaterialIcons name="apps" size={24} color={color} />
          ),
        }}
      />

      {/* ---- Hidden screens (accessible via navigation, not tab bar) ---- */}
      <Tabs.Screen name="profile" options={{ href: null, title: 'Profile' }} />
      <Tabs.Screen name="finance" options={{ href: null, title: 'Finance', headerShown: false }} />
      <Tabs.Screen name="goals" options={{ href: null, title: 'Goals', headerShown: false }} />
      <Tabs.Screen name="health" options={{ href: null, title: 'Health', headerShown: false }} />
      <Tabs.Screen name="journal" options={{ href: null, title: 'Journal', headerShown: false }} />
      <Tabs.Screen name="reading" options={{ href: null, title: 'Reading', headerShown: false }} />
      <Tabs.Screen name="calendar" options={{ href: null, title: 'Kalender', headerShown: false }} />
      <Tabs.Screen name="achievements" options={{ href: null, title: 'Pencapaian', headerShown: false }} />
    </Tabs>
  );
}
