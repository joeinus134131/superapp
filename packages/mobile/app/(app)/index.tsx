import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useTheme } from '../../context/themeContext'
import { usePremium } from '../../context/premiumContext'
import { useLanguage } from '../../context/languageContext'

interface Stat {
  label: string
  value: string
  icon: keyof typeof MaterialIcons.glyphMap
}

interface Feature {
  id: string
  name: string
  icon: keyof typeof MaterialIcons.glyphMap
  color: string
}

export default function DashboardScreen() {
  const { isDark } = useTheme()
  const { isPremium } = usePremium()
  const { t } = useLanguage()

  const bgColor = isDark ? '#1a1a1a' : '#ffffff'
  const cardBgColor = isDark ? '#2a2a2a' : '#f5f5f5'
  const textColor = isDark ? '#ffffff' : '#000000'
  const accentColor = '#8b5cf6'

  const stats: Stat[] = [
    { label: 'XP', value: '2,450', icon: 'star' },
    { label: 'Level', value: '5', icon: 'trending-up' },
    { label: 'Streak', value: '12', icon: 'local-fire-department' },
    { label: 'Tasks', value: '23', icon: 'checklist' },
  ]

  const features: Feature[] = [
    { id: 'tasks', name: 'Tasks', icon: 'checklist', color: '#3b82f6' },
    { id: 'habits', name: 'Habits', icon: 'trending-up', color: '#10b981' },
    { id: 'goals', name: 'Goals', icon: 'flag', color: '#f59e0b' },
    { id: 'pomodoro', name: 'Pomodoro', icon: 'timer', color: '#8b5cf6' },
    { id: 'finance', name: 'Finance', icon: 'account-balance-wallet', color: '#06b6d4' },
    { id: 'health', name: 'Health', icon: 'favorite', color: '#ef4444' },
  ]

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bgColor }}>
      <View style={{ padding: 16 }}>
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: textColor, marginBottom: 4 }}>
            Welcome back! 👋
          </Text>
          <Text style={{ fontSize: 14, color: '#888' }}>
            {isPremium ? '✨ Pro Member' : 'Free Account'}
          </Text>
        </View>

        {/* Stats Grid */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 24,
          }}
        >
          {stats.map((stat, index) => (
            <View
              key={index}
              style={{
                flex: 1,
                minWidth: '48%',
                backgroundColor: cardBgColor,
                padding: 16,
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <MaterialIcons name={stat.icon} size={24} color={accentColor} />
              <Text style={{ fontSize: 12, color: '#888', marginTop: 8, marginBottom: 4 }}>
                {stat.label}
              </Text>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: textColor }}>
                {stat.value}
              </Text>
            </View>
          ))}
        </View>

        {/* Features Grid */}
        <Text style={{ fontSize: 18, fontWeight: '600', color: textColor, marginBottom: 12 }}>
          Quick Access
        </Text>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 24,
          }}
        >
          {features.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={{
                flex: 1,
                minWidth: '31%',
                backgroundColor: cardBgColor,
                padding: 12,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name={feature.icon} size={28} color={feature.color} />
              <Text
                style={{
                  fontSize: 12,
                  color: textColor,
                  marginTop: 8,
                  textAlign: 'center',
                  fontWeight: '500',
                }}
              >
                {feature.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Activity */}
        <Text style={{ fontSize: 18, fontWeight: '600', color: textColor, marginBottom: 12 }}>
          Recent Activity
        </Text>
        <View style={{ backgroundColor: cardBgColor, padding: 16, borderRadius: 12 }}>
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <MaterialIcons name="check-circle" size={20} color="#10b981" />
              <Text style={{ color: textColor, marginLeft: 10, fontWeight: '500' }}>
                Completed morning workout
              </Text>
            </View>
            <Text style={{ color: '#888', fontSize: 12, marginLeft: 30 }}>Today at 6:30 AM</Text>
          </View>
          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <MaterialIcons name="check-circle" size={20} color="#10b981" />
              <Text style={{ color: textColor, marginLeft: 10, fontWeight: '500' }}>
                Finished project report
              </Text>
            </View>
            <Text style={{ color: '#888', fontSize: 12, marginLeft: 30 }}>Yesterday at 5:15 PM</Text>
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <MaterialIcons name="check-circle" size={20} color="#10b981" />
              <Text style={{ color: textColor, marginLeft: 10, fontWeight: '500' }}>
                Read 20 pages of book
              </Text>
            </View>
            <Text style={{ color: '#888', fontSize: 12, marginLeft: 30 }}>2 days ago</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}
