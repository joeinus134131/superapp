import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, AppState,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { MOBILE_SPACING, useMobileLayout } from '../../lib/layout';
import { getData, setData, STORAGE_KEYS } from '../../lib/storage';
import { getToday } from '../../lib/helpers';
import { addXP } from '../../lib/gamification';
import { useKeepAwake } from 'expo-keep-awake';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

interface PomodoroSession {
  date: string;
  timestamp: string;
  mode: string;
}

const MODES = {
  focus: { duration: 25 * 60, label: 'Fokus', color: '#8b5cf6' },
  break: { duration: 5 * 60, label: 'Istirahat', color: '#10b981' },
  longBreak: { duration: 15 * 60, label: 'Istirahat Panjang', color: '#06b6d4' },
};

const SOUNDSCAPES = [
  { id: 'rain', name: 'Hujan', emoji: '🌧️', color: '#3b82f6', url: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3' },
  { id: 'cafe', name: 'Café', emoji: '☕', color: '#f59e0b', url: 'https://cdn.pixabay.com/download/audio/2022/11/22/audio_104f21ccb5.mp3' },
  { id: 'lofi', name: 'Lo-Fi', emoji: '🎵', color: '#8b5cf6', url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf7f5.mp3' },
];

type ModeKey = keyof typeof MODES;

export default function PomodoroScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const today = getToday();
  const layout = useMobileLayout();

  const [mode, setMode] = useState<ModeKey>('focus');
  const [timeLeft, setTimeLeft] = useState(MODES.focus.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [xpToast, setXpToast] = useState<string | null>(null);
  const [autoStart, setAutoStart] = useState(false);
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  
  // Prevent screen from sleeping while Pomodoro screen is open
  useKeepAwake();

  const load = useCallback(async () => {
    const saved = await getData(STORAGE_KEYS.POMODORO);
    if (saved?.sessions) setSessions(saved.sessions);
    
    // Set audio mode for iOS/Android
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning]);

  const handleSessionComplete = async () => {
    setIsRunning(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (mode === 'focus') {
      const newSession: PomodoroSession = {
        date: today,
        timestamp: new Date().toISOString(),
        mode: 'focus',
      };
      const newSessions = [...sessions, newSession];
      setSessions(newSessions);
      await setData(STORAGE_KEYS.POMODORO, { sessions: newSessions });

      const result = await addXP('POMODORO_SESSION');
      setXpToast(`+${result.xpGained} XP 🎉 Sesi selesai!`);
      setTimeout(() => setXpToast(null), 3000);

      // Auto switch to break
      const todayCount = newSessions.filter(s => s.date === today).length;
      if (todayCount % 4 === 0) {
        switchMode('longBreak', autoStart);
      } else {
        switchMode('break', autoStart);
      }
    } else {
      switchMode('focus', autoStart);
    }
  };

  const toggleTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimeLeft(MODES[mode].duration);
  };

  const switchMode = (newMode: ModeKey, start: boolean = false) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRunning(start);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setMode(newMode);
    setTimeLeft(MODES[newMode].duration);
  };

  const playSound = async (soundId: string) => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      if (activeSound === soundId) {
        setActiveSound(null);
        return;
      }

      const s = SOUNDSCAPES.find(x => x.id === soundId);
      if (!s) return;

      const { sound } = await Audio.Sound.createAsync(
        { uri: s.url },
        { isLooping: true, shouldPlay: true, volume: 0.5 }
      );
      soundRef.current = sound;
      setActiveSound(soundId);
    } catch (e) {
      console.warn('Failed to play sound', e);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const todaySessions = sessions.filter(s => s.date === today).length;
  const totalFocusMin = sessions.length * 25;

  // Progress for SVG circle
  const progress = 1 - (timeLeft / MODES[mode].duration);
  const size = 260;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  // Weekly stats
  const getWeekStats = () => {
    const stats = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const count = sessions.filter(s => s.date === dateStr).length;
      stats.push({
        date: dateStr,
        count,
        day: d.toLocaleDateString('id-ID', { weekday: 'short' }).slice(0, 3),
      });
    }
    return stats;
  };

  const weekStats = getWeekStats();
  const maxSessionsWeek = Math.max(...weekStats.map(s => s.count), 1);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.bgPrimary }]}
      contentContainerStyle={{ paddingHorizontal: MOBILE_SPACING.screen, paddingTop: layout.topPadding, paddingBottom: layout.bottomPadding }}
      showsVerticalScrollIndicator={false}
    >
      {xpToast && (
        <View style={[styles.xpToast, { top: layout.insets.top + 12 }]}>
          <Text style={styles.xpToastText}>⚡ {xpToast}</Text>
        </View>
      )}

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Sesi Hari Ini', value: todaySessions, icon: 'flag' as const, color: c.purple },
          { label: 'Fokus Hari Ini', value: `${todaySessions * 25}m`, icon: 'schedule' as const, color: c.cyan },
          { label: 'Total Fokus', value: `${totalFocusMin}m`, icon: 'bar-chart' as const, color: c.green },
          { label: 'Total Sesi', value: sessions.length, icon: 'local-fire-department' as const, color: c.yellow },
        ].map((s, i) => (
          <View key={i} style={[styles.miniStat, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <MaterialIcons name={s.icon} size={18} color={s.color} />
            <Text style={[styles.miniStatVal, { color: c.textPrimary }]}>{s.value}</Text>
            <Text style={[styles.miniStatLabel, { color: c.textMuted }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Timer Card */}
      <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        {/* Mode Tabs */}
        <View style={styles.modeTabs}>
          {(Object.keys(MODES) as ModeKey[]).map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.modeTab, mode === m && { backgroundColor: MODES[m].color + '22' }]}
              onPress={() => switchMode(m)}
            >
              <MaterialIcons
                name={m === 'focus' ? 'flag' : m === 'break' ? 'coffee' : 'park'}
                size={16}
                color={mode === m ? MODES[m].color : c.textMuted}
              />
              <Text style={[styles.modeTabText, { color: mode === m ? MODES[m].color : c.textMuted }]}>
                {MODES[m].label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* SVG Circle Timer */}
        <View style={styles.timerContainer}>
          <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke={c.border}
              strokeWidth={strokeWidth}
            />
            <Circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke={MODES[mode].color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </Svg>
          <View style={styles.timerTextContainer}>
            <Text style={[styles.timerTime, { color: c.textPrimary }]}>{formatTime(timeLeft)}</Text>
            <Text style={[styles.timerLabel, { color: MODES[mode].color }]}>{MODES[mode].label}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.mainBtn, { backgroundColor: MODES[mode].color }]}
            onPress={toggleTimer}
            activeOpacity={0.8}
          >
            <MaterialIcons name={isRunning ? 'pause' : 'play-arrow'} size={28} color="#fff" />
            <Text style={styles.mainBtnText}>{isRunning ? 'Pause' : 'Mulai'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.resetBtn, { borderColor: c.border }]}
            onPress={resetTimer}
          >
            <MaterialIcons name="replay" size={22} color={c.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Auto Start Toggle */}
        <TouchableOpacity
          style={styles.autoStartRow}
          onPress={() => setAutoStart(!autoStart)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, autoStart && { backgroundColor: c.purple, borderColor: c.purple }]}>
            {autoStart && <MaterialIcons name="check" size={14} color="#fff" />}
          </View>
          <Text style={[styles.autoStartText, { color: c.textSecondary }]}>Auto-start sesi berikutnya</Text>
        </TouchableOpacity>

        <Text style={[styles.sessionInfo, { color: c.textMuted }]}>
          Sesi ke-{todaySessions + 1} • {todaySessions % 4 === 3 && mode === 'focus'
            ? 'Istirahat panjang setelah ini'
            : `${4 - (todaySessions % 4)} sesi lagi sebelum istirahat panjang`}
        </Text>
      </View>

      {/* Soundscapes */}
      <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        <View style={styles.cardTitleRow}>
          <MaterialIcons name="headset" size={18} color="#f59e0b" />
          <Text style={[styles.cardTitle, { color: c.textPrimary }]}>Soundscapes</Text>
        </View>
        <View style={styles.soundscapesRow}>
          {SOUNDSCAPES.map(s => (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.soundBtn,
                { borderColor: c.border, backgroundColor: c.bgInput },
                activeSound === s.id && { borderColor: s.color, backgroundColor: s.color + '22' }
              ]}
              onPress={() => playSound(s.id)}
            >
              <Text style={{ fontSize: 24, marginBottom: 4 }}>{s.emoji}</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: activeSound === s.id ? s.color : c.textPrimary }}>
                {s.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Weekly Chart */}
      <View style={[styles.card, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        <View style={styles.cardTitleRow}>
          <MaterialIcons name="bar-chart" size={18} color={c.purple} />
          <Text style={[styles.cardTitle, { color: c.textPrimary }]}>Statistik Mingguan</Text>
        </View>
        <View style={styles.chartContainer}>
          {weekStats.map((s, i) => (
            <View key={i} style={styles.chartCol}>
              <Text style={[styles.chartValue, { color: c.textPrimary }]}>{s.count}</Text>
              <View style={[
                styles.chartBar,
                {
                  height: Math.max((s.count / maxSessionsWeek) * 120, 4),
                  backgroundColor: s.date === today ? c.purple : c.purple + '44',
                }
              ]} />
              <Text style={[styles.chartDay, { color: c.textMuted }]}>{s.day}</Text>
            </View>
          ))}
        </View>

        {/* Tips */}
        <View style={[styles.tipsSection, { borderTopColor: c.border }]}>
          <View style={styles.cardTitleRow}>
            <MaterialIcons name="lightbulb-outline" size={18} color={c.yellow} />
            <Text style={[styles.cardTitle, { color: c.textPrimary }]}>Tips Pomodoro</Text>
          </View>
          {[
            '🎯 Fokus pada satu tugas per sesi',
            '☕ Istirahat sejenak setelah setiap sesi',
            '📵 Matikan notifikasi saat fokus',
            '📝 Catat apa yang akan dikerjakan sebelum mulai',
            '🧘 Tarik nafas dalam sebelum mulai sesi baru',
          ].map((tip, i) => (
            <Text key={i} style={[styles.tipText, { color: c.textSecondary }]}>{tip}</Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderRadius: 20, padding: 18, marginBottom: 18, borderWidth: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '800' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  miniStat: { flex: 1, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center', borderWidth: 1, minHeight: 94, justifyContent: 'center' },
  miniStatVal: { fontSize: 18, fontWeight: '900', marginTop: 6 },
  miniStatLabel: { fontSize: 11, marginTop: 4, textAlign: 'center' },

  modeTabs: { flexDirection: 'row', gap: 10, marginBottom: 24, justifyContent: 'center' },
  modeTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999 },
  modeTabText: { fontSize: 13, fontWeight: '700' },

  timerContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  timerTextContainer: { position: 'absolute', alignItems: 'center' },
  timerTime: { fontSize: 52, fontWeight: '700', letterSpacing: 2 },
  timerLabel: { fontSize: 14, fontWeight: '700', marginTop: 6 },

  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 18 },
  mainBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 32, paddingVertical: 15, borderRadius: 18 },
  mainBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resetBtn: { width: 50, height: 50, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  autoStartRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 18 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#666', alignItems: 'center', justifyContent: 'center' },
  autoStartText: { fontSize: 13, fontWeight: '600' },

  sessionInfo: { textAlign: 'center', fontSize: 13, lineHeight: 20 },

  soundscapesRow: { flexDirection: 'row', gap: 12 },
  soundBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 16, borderWidth: 1 },

  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 160, paddingHorizontal: 8 },
  chartCol: { flex: 1, alignItems: 'center', gap: 4 },
  chartValue: { fontSize: 11, fontWeight: '700' },
  chartBar: { width: '60%', borderRadius: 4 },
  chartDay: { fontSize: 10 },

  tipsSection: { borderTopWidth: 1, marginTop: 18, paddingTop: 18 },
  tipText: { fontSize: 14, lineHeight: 24, marginBottom: 4 },

  xpToast: { position: 'absolute', top: 10, right: 16, zIndex: 999, backgroundColor: '#8b5cf6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  xpToastText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
