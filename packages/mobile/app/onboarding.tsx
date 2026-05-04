import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '../lib/theme';
import { useTheme } from '../context/themeContext';
import { triggerHaptic } from '../lib/haptics';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../hooks/useAuth';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Smart Assistant',
    description: 'SelfOne menganalisis data harianmu untuk memberikan insight produktivitas yang personal.',
    icon: 'psychology',
    color: '#8b5cf6',
  },
  {
    id: '2',
    title: 'Visual Analytics',
    description: 'Lihat progresmu melalui chart dan heatmap yang elegan untuk kesehatan, keuangan, dan habit.',
    icon: 'bar-chart',
    color: '#10b981',
  },
  {
    id: '3',
    title: 'Secure & Private',
    description: 'Data Anda sepenuhnya milik Anda. Amankan dengan PIN dan ekspor kapan saja.',
    icon: 'security',
    color: '#3b82f6',
  },
];

export default function OnboardingScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const router = useRouter();
  const { setOnboarded } = useAuth();
  const scrollX = useRef(new Animated.Value(0)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = async () => {
    triggerHaptic('light');
    if (currentIndex < SLIDES.length - 1) {
      // Scroll logic would go here if using a FlatList, but for simplicity:
      setCurrentIndex(currentIndex + 1);
    } else {
      await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    triggerHaptic('success');
    await AsyncStorage.setItem('superapp_onboarded', 'true');
    setOnboarded(true);
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <View style={styles.header}>
        <BrandLogo size={50} showText={false} />
      </View>

      <View style={styles.slideContent}>
        <View style={[styles.iconCircle, { backgroundColor: SLIDES[currentIndex].color + '22' }]}>
          <MaterialIcons name={SLIDES[currentIndex].icon as any} size={64} color={SLIDES[currentIndex].color} />
        </View>
        <Text style={[styles.title, { color: c.textPrimary }]}>{SLIDES[currentIndex].title}</Text>
        <Text style={[styles.description, { color: c.textSecondary }]}>{SLIDES[currentIndex].description}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.dot, 
                { backgroundColor: i === currentIndex ? c.purple : c.border }
              ]} 
            />
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.nextBtn, { backgroundColor: c.purple }]} 
          onPress={handleNext}
        >
          <Text style={styles.nextBtnText}>
            {currentIndex === SLIDES.length - 1 ? 'Mulai Sekarang' : 'Lanjut'}
          </Text>
        </TouchableOpacity>

        {currentIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={finishOnboarding} style={styles.skipBtn}>
            <Text style={[styles.skipBtnText, { color: c.textMuted }]}>Lewati</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingVertical: 60 },
  header: { alignItems: 'center', marginBottom: 60 },
  slideContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  iconCircle: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 16, textAlign: 'center' },
  description: { fontSize: 16, textAlign: 'center', lineHeight: 24, opacity: 0.8 },
  footer: { alignItems: 'center', paddingBottom: 40 },
  dotsRow: { flexDirection: 'row', gap: 10, marginBottom: 40 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  nextBtn: { width: '100%', height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  skipBtn: { marginTop: 20 },
  skipBtnText: { fontSize: 14, fontWeight: '700' },
});
