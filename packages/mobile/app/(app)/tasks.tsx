import { View, Text } from 'react-native'
import { useTheme } from '../../context/themeContext'

export default function TasksScreen() {
  const { isDark } = useTheme()
  const bgColor = isDark ? '#1a1a1a' : '#ffffff'
  const textColor = isDark ? '#ffffff' : '#000000'

  return (
    <View style={{ flex: 1, backgroundColor: bgColor, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: textColor }}>Tasks Screen</Text>
      <Text style={{ color: '#888', marginTop: 8 }}>Coming soon...</Text>
    </View>
  )
}
