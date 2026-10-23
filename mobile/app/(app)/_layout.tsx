import { subscribeNotificationHistory } from '../../lib/notifications';
import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { CreateActionSheet } from '../../components/CreateActionSheet';
import { StatusAlertModal } from '../../components/StatusAlertModal';
import { Tabs } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { useMobileLayout } from '../../lib/layout';
import { useLanguage } from '../../context/languageContext';
import { useWindowDimensions, TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { useAICoach } from '../../hooks/useAICoach';

export default function AppLayout() {
  const [showCreate, setShowCreate] = useState(false);
  const { tx: translateCopy } = useLanguage();
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const isSmallDevice = width < 380;

  useAICoach();
  useEffect(() => subscribeNotificationHistory(), []);

  const activeColor = isDark ? '#6BB289' : '#193F30';
  const inactiveColor = isDark ? '#7E9185' : '#8A9784';
  const bottomInset = layout.tabBarPaddingBottom;

  return (
    <>
    <StatusBar style={isDark ? "light" : "dark"} />
    <CreateActionSheet visible={showCreate} onClose={() => setShowCreate(false)} />
    <StatusAlertModal />
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          backgroundColor: isDark ? '#14241C' : '#FFFFFF',
          borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#ECEFE6',
          borderTopWidth: 1,
          height: layout.tabBarHeight,
          paddingBottom: bottomInset,
          paddingTop: 6,
          paddingHorizontal: isSmallDevice ? 4 : 10,
          elevation: 10,
          shadowColor: '#193F30',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: isDark ? 0.25 : 0.06,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: isSmallDevice ? 9.5 : 10.5,
          fontWeight: '700',
          marginTop: 2,
          letterSpacing: -0.1,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarHideOnKeyboard: true,
        headerShown: false,
      }}
    >
      {/* 1. Beranda (Home) */}
      <Tabs.Screen
        name="index"
        options={{
          title: translateCopy("Beranda"),
          tabBarLabel: translateCopy("Beranda"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      {/* 2. Tugas (Tasks) */}
      <Tabs.Screen
        name="tasks"
        options={{
          title: translateCopy("Tugas"),
          tabBarLabel: translateCopy("Tugas"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'checkbox' : 'checkbox-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      {/* 3. Capture (+) Floating Center Action */}
      <Tabs.Screen
        name="capture"
        options={{
          title: translateCopy("Tambah"),
          tabBarLabel: () => null,
          tabBarButton: (props) => <TouchableOpacity style={props.style} accessibilityRole="button" accessibilityLabel={translateCopy("Tambah")} onPress={() => setShowCreate(true)}>{props.children}</TouchableOpacity>,
          tabBarIcon: () => (
            <View
              style={[
                styles.captureButton,
                {
                  backgroundColor: isDark ? '#3D6850' : '#193F30',
                  shadowColor: '#193F30',
                },
              ]}
            >
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </View>
          ),
        }}
      />

      {/* 4. Keuangan (Finance) — Matching Master Mockup */}
      <Tabs.Screen
        name="finance"
        options={{
          title: translateCopy("Keuangan"),
          tabBarLabel: translateCopy("Keuangan"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'wallet' : 'wallet-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      {/* 5. Lainnya (More Hub) */}
      <Tabs.Screen
        name="more"
        options={{
          title: translateCopy("Lainnya"),
          tabBarLabel: translateCopy("Lainnya"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'grid' : 'grid-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      {/* ---- Hidden navigation screens (accessible via Hub / Direct routing) ---- */}
      <Tabs.Screen name="insights" options={{ href: null, title: 'Insight', headerShown: false }} />
      <Tabs.Screen name="habits" options={{ href: null, title: translateCopy("Kebiasaan"), headerShown: false }} />
      <Tabs.Screen name="goals" options={{ href: null, title: translateCopy("Tujuan"), headerShown: false }} />
      <Tabs.Screen name="journal" options={{ href: null, title: translateCopy("Jurnal"), headerShown: false }} />
      <Tabs.Screen name="calendar" options={{ href: null, title: translateCopy("Kalender"), headerShown: false }} />
      <Tabs.Screen name="pomodoro" options={{ href: null, title: translateCopy("Waktu Fokus"), headerShown: false }} />
      <Tabs.Screen name="health" options={{ href: null, title: translateCopy("Kesehatan"), headerShown: false }} />
      <Tabs.Screen name="reading" options={{ href: null, title: translateCopy("Bacaan"), headerShown: false }} />
      <Tabs.Screen name="achievements" options={{ href: null, title: translateCopy("Pencapaian"), headerShown: false }} />
      <Tabs.Screen name="profile" options={{ href: null, title: translateCopy("Pengaturan Akun"), headerShown: false }} />
      <Tabs.Screen name="finance-repository" options={{ href: null, title: translateCopy("Buku Keuangan"), headerShown: false }} />
      <Tabs.Screen name="social" options={{ href: null, title: translateCopy("Komunitas"), headerShown: false }} />
      <Tabs.Screen name="squad/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="plan" options={{ href: null, title: translateCopy("Rencana"), headerShown: false }} />
      <Tabs.Screen name="notes" options={{ href: null, title: translateCopy("Catatan"), headerShown: false }} />
    </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  captureButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 8,
    elevation: 8,
  },
});
