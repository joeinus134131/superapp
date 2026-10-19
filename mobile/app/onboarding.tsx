import { useMobileLayout } from '../lib/layout';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '../lib/theme';
import { useTheme } from '../context/themeContext';
import { triggerHaptic } from '../lib/haptics';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../hooks/useAuth';
import { getData, setData, STORAGE_KEYS } from '../lib/storage';
import { useLanguage } from "../context/languageContext";




export default function OnboardingScreen() {
  const { tx: translateCopy } = useLanguage();
const OUTCOMES = [
  { id: 'focus', title: translateCopy("Lebih Fokus & Teratur"), desc: translateCopy("Selesaikan tugas penting tanpa rasa kewalahan."), icon: 'checklist' as const },
  { id: 'finance', title: translateCopy("Finansial Teratur"), desc: translateCopy("Catat pengeluaran dan jaga ritme kas harian."), icon: 'account-balance-wallet' as const },
  { id: 'health', title: translateCopy("Habit & Kesehatan"), desc: translateCopy("Bangun rutinitas konsisten setiap hari."), icon: 'local-fire-department' as const },
  { id: 'all', title: translateCopy("Semuanya Sekaligus"), desc: translateCopy("Kelola seluruh aspek hidup dalam satu ruang."), icon: 'auto-awesome' as const },
];

  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();
  const router = useRouter();
  const { setOnboarded } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOutcome, setSelectedOutcome] = useState('focus');
  const [firstAction, setFirstAction] = useState('');

  const handleNext = async () => {
    triggerHaptic('light');
    if (currentIndex < 3) {
      setCurrentIndex(currentIndex + 1);
    } else {
      await finishOnboarding();
    }
  };

  const finishOnboarding = async () => {
    triggerHaptic('success');
    if (firstAction.trim()) {
      let tasks = await getData(STORAGE_KEYS.TASKS);
      if (!Array.isArray(tasks)) tasks = [];
      tasks.unshift({
        id: 't_onboard_' + Date.now(),
        title: firstAction.trim(),
        priority: 'P1',
        status: 'todo',
        createdAt: new Date().toISOString(),
      });
      await setData(STORAGE_KEYS.TASKS, tasks);
    }

    await AsyncStorage.setItem('superapp_onboarded', 'true');
    setOnboarded(true);
    router.replace('/(app)');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: c.bgPrimary, paddingTop: layout.topPadding, paddingBottom: layout.contentBottomPadding }]}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <BrandLogo size={46} showText={false} />
        <Text style={[styles.stepLabel, { color: c.purple }]}>{translateCopy("Langkah")} {currentIndex + 1} {translateCopy("dari 4")}</Text>
      </View>

      <View style={styles.slideContent}>
        {/* Step 1: Value Proposition */}
        {currentIndex === 0 && (
          <View style={{ alignItems: 'center' }}>
            <View style={[styles.iconCircle, { backgroundColor: c.purple + '22' }]}>
              <MaterialIcons name="today" size={54} color={c.purple} />
            </View>
            <Text style={[styles.title, { color: c.textPrimary }]}>{translateCopy("Satu ruang untuk harimu.")}</Text>
            <Text style={[styles.description, { color: c.textSecondary }]}>
              {translateCopy("Rencanakan hal penting, catat aktivitas, dan pantau progres tanpa harus membuka banyak aplikasi yang membingungkan.")}
            </Text>
          </View>
        )}

        {/* Step 2: Outcome-First Choice */}
        {currentIndex === 1 && (
          <View style={{ width: '100%' }}>
            <Text style={[styles.titleSmall, { color: c.textPrimary }]}>{translateCopy("Apa fokus utamamu saat ini?")}</Text>
            <Text style={[styles.descriptionSmall, { color: c.textSecondary }]}>
              {translateCopy("Pilih satu yang paling penting agar kami dapat menyesuaikan dashboard awalmu.")}
            </Text>
            <View style={{ gap: 10, marginTop: 20 }}>
              {OUTCOMES.map((item) => {
                const isSelected = selectedOutcome === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setSelectedOutcome(item.id)}
                    style={[
                      styles.outcomeCard,
                      {
                        backgroundColor: c.bgCard,
                        borderColor: isSelected ? c.purple : c.border,
                      },
                    ]}
                  >
                    <View style={[styles.outcomeIcon, { backgroundColor: isSelected ? c.purple + '20' : c.bgInput }]}>
                      <MaterialIcons name={item.icon} size={22} color={isSelected ? c.purple : c.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.outcomeTitle, { color: c.textPrimary }]}>{item.title}</Text>
                      <Text style={[styles.outcomeDesc, { color: c.textSecondary }]}>{item.desc}</Text>
                    </View>
                    {isSelected && <MaterialIcons name="check-circle" size={20} color={c.purple} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Step 3: First Actionable Item */}
        {currentIndex === 2 && (
          <View style={{ width: '100%', alignItems: 'center' }}>
            <View style={[styles.iconCircle, { backgroundColor: c.green + '22' }]}>
              <MaterialIcons name="checklist" size={54} color={c.green} />
            </View>
            <Text style={[styles.title, { color: c.textPrimary }]}>{translateCopy("Buat aksi pertamamu.")}</Text>
            <Text style={[styles.description, { color: c.textSecondary }]}>
              {translateCopy("Satu langkah kecil apa yang ingin kamu tuntaskan hari ini?")}
            </Text>
            <TextInput
              style={[
                styles.actionInput,
                {
                  backgroundColor: c.bgCard,
                  borderColor: c.border,
                  color: c.textPrimary,
                },
              ]}
              placeholder={translateCopy("Contoh: Selesaikan tugas kuliah bab 2")}
              placeholderTextColor={c.textMuted}
              value={firstAction}
              onChangeText={setFirstAction}
              returnKeyType="done"
              autoFocus
            />
          </View>
        )}

        {/* Step 4: Privacy & Offline-First */}
        {currentIndex === 3 && (
          <View style={{ alignItems: 'center' }}>
            <View style={[styles.iconCircle, { backgroundColor: c.blue + '22' }]}>
              <MaterialIcons name="shield" size={54} color={c.blue} />
            </View>
            <Text style={[styles.title, { color: c.textPrimary }]}>{translateCopy("Privasi & Kendali Penuh")}</Text>
            <Text style={[styles.description, { color: c.textSecondary }]}>
              {translateCopy("Data disimpan secara lokal di perangkat ini. Kamu memegang kendali penuh atas sinkronisasi dan keamanan datamu.")}
            </Text>
            <View style={[styles.privacyBox, { backgroundColor: c.bgCard, borderColor: c.border }]}>
              <MaterialIcons name="lock-outline" size={20} color={c.green} />
              <Text style={[styles.privacyText, { color: c.textSecondary }]}>
                {translateCopy("Offline-first: Aplikasi tetap bekerja tanpa koneksi internet.")}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[styles.dot, { backgroundColor: i === currentIndex ? c.purple : c.border }]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: isDark ? '#397353' : '#193F30' }]}
          onPress={handleNext}
          accessibilityRole="button"
        >
          <Text style={styles.nextBtnText}>
            {currentIndex === 3 ? translateCopy("Buka Hari Ini") : translateCopy("Lanjut")}
          </Text>
        </TouchableOpacity>

        {currentIndex < 3 && (
          <TouchableOpacity onPress={finishOnboarding} style={styles.skipBtn}>
            <Text style={[styles.skipBtnText, { color: c.textMuted }]}>{translateCopy("Lewati")}</Text>
          </TouchableOpacity>
        )}
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 50, paddingBottom: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  stepLabel: { fontSize: 13, fontWeight: '700' },
  slideContent: { flex: 1, justifyContent: 'center' },
  iconCircle: { width: 90, height: 90, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 12, textAlign: 'center', letterSpacing: -0.5 },
  description: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 12 },
  titleSmall: { fontSize: 22, fontWeight: '800', marginBottom: 6, letterSpacing: -0.4 },
  descriptionSmall: { fontSize: 14, lineHeight: 20 },
  outcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  outcomeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  outcomeTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  outcomeDesc: { fontSize: 12, lineHeight: 16 },
  actionInput: {
    width: '100%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 24,
    fontSize: 15,
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 24,
    width: '100%',
  },
  privacyText: { fontSize: 13, flex: 1, lineHeight: 18 },
  footer: { alignItems: 'center', paddingTop: 20 },
  dotsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  nextBtn: { width: '100%', height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  skipBtn: { marginTop: 14, padding: 6 },
  skipBtnText: { fontSize: 14, fontWeight: '600' },
});
