import { Tabs } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { useTheme } from '../../context/themeContext'

interface TabBarIconProps {
  color: string
}

export default function AppLayout() {
  const { isDark } = useTheme()

  const bgColor = isDark ? '#1a1a1a' : '#ffffff'
  const textColor = isDark ? '#ffffff' : '#000000'
  const inactiveColor = isDark ? '#888' : '#666'

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#8b5cf6',
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: bgColor,
          borderTopColor: isDark ? '#333' : '#e0e0e0',
          height: 60,
          paddingBottom: 8,
        },
        headerStyle: {
          backgroundColor: bgColor,
          borderBottomColor: isDark ? '#333' : '#e0e0e0',
        },
        headerTintColor: textColor,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }: TabBarIconProps) => <MaterialIcons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarLabel: 'Tasks',
          tabBarIcon: ({ color }: TabBarIconProps) => <MaterialIcons name="checklist" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: 'Habits',
          tabBarLabel: 'Habits',
          tabBarIcon: ({ color }: TabBarIconProps) => <MaterialIcons name="trending-up" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pomodoro"
        options={{
          title: 'Pomodoro',
          tabBarLabel: 'Focus',
          tabBarIcon: ({ color }: TabBarIconProps) => <MaterialIcons name="timer" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }: TabBarIconProps) => <MaterialIcons name="person" size={24} color={color} />,
        }}
      />
    </Tabs>
  )
}
