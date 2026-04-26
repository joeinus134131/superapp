import { View, Text, TouchableOpacity } from 'react-native'
import { useTheme } from '../../context/themeContext'
import { useAuth } from '../../hooks/useAuth'
import { useRouter } from 'expo-router'

export default function ProfileScreen() {
  const { isDark } = useTheme()
  const { logout } = useAuth()
  const router = useRouter()

  const bgColor = isDark ? '#1a1a1a' : '#ffffff'
  const textColor = isDark ? '#ffffff' : '#000000'

  const handleLogout = async () => {
    await logout()
    router.replace('/(auth)/login')
  }

  return (
    <View style={{ flex: 1, backgroundColor: bgColor, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: textColor, marginBottom: 20 }}>
        Profile
      </Text>

      <TouchableOpacity
        onPress={handleLogout}
        style={{
          backgroundColor: '#ef4444',
          padding: 14,
          borderRadius: 8,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}
