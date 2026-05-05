import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Dimensions, AppState, Modal, Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { MOBILE_SPACING, useMobileLayout } from '../../lib/layout';
import { getData, setData, STORAGE_KEYS } from '../../lib/storage';
import { getToday } from '../../lib/helpers';
import { addXP } from '../../lib/gamification';
import { useKeepAwake } from 'expo-keep-awake';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../../context/languageContext';

interface PomodoroSession {
  date: string;
  timestamp: string;
  mode: string;
}

interface Soundscape {
  id: string;
  nameKey: string;
  icon: string;
  color: string;
  url: string;
  isCustom?: boolean;
  customName?: string;
}

const DEFAULT_SOUNDSCAPES: Soundscape[] = [
  { id: 'rain', nameKey: 'pomodoro.sound_rain', icon: 'water-drop', color: '#3b82f6', url: 'https://raw.githubusercontent.com/rafaelreis-hotmart/Audio-Files-Demo/master/mp3/rain.mp3' },
  { id: 'cafe', nameKey: 'pomodoro.sound_cafe', icon: 'local-cafe', color: '#f59e0b', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'lofi', nameKey: 'pomodoro.sound_lofi', icon: 'music-note', color: '#8b5cf6', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
];

const MODES = {
  focus: { duration: 25 * 60, labelKey: 'pomodoro.mode_focus', color: '#8b5cf6' },
  break: { duration: 5 * 60, labelKey: 'pomodoro.mode_break', color: '#10b981' },
  longBreak: { duration: 15 * 60, labelKey: 'pomodoro.mode_long_break', color: '#06b6d4' },
};

type ModeKey = keyof typeof MODES;

export default function PomodoroScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const today = getToday();
  const layout = useMobileLayout();
  const { t, language } = useLanguage();

  const [mode, setMode] = useState<ModeKey>('focus');
  const [timeLeft, setTimeLeft] = useState(MODES.focus.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState<PomodoroSession[]>([]);
  const [xpToast, setXpToast] = useState<string | null>(null);
  const [autoStart, setAutoStart] = useState(false);
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [showTips, setShowTips] = useState(false);
  const [selectedTip, setSelectedTip] = useState<string | null>(null);
  const [soundscapes, setSoundscapes] = useState<Soundscape[]>(DEFAULT_SOUNDSCAPES);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  
  useKeepAwake();

  const load = useCallback(async () => {
    const saved = await getData(STORAGE_KEYS.POMODORO);
    if (saved?.sessions) setSessions(saved.sessions);
    if (saved?.customSoundscapes) {
      const migratedCustom = (saved.customSoundscapes || []).map((s: any) => ({
        ...s,
        icon: s.icon || 'music-note'
      }));
      setSoundscapes([...DEFAULT_SOUNDSCAPES, ...migratedCustom]);
    }
    
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
  }, [isRunning, timeLeft]);

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
      
      const currentData = await getData(STORAGE_KEYS.POMODORO) || {};
      await setData(STORAGE_KEYS.POMODORO, { ...currentData, sessions: newSessions });

      const result = await addXP('POMODORO_SESSION');
      setXpToast(`+${result.xpGained} XP 🎉 ${t('pomodoro.session_complete')}`);
      setTimeout(() => setXpToast(null), 3000);

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

      const s = soundscapes.find(x => x.id === soundId);
      if (!s) return;

      const { sound } = await Audio.Sound.createAsync(
        { uri: s.url },
        { isLooping: true, shouldPlay: true, volume: 0.5 }
      );
      soundRef.current = sound;
      setActiveSound(soundId);
    } catch (e) {
      console.warn('Failed to play sound', e);
      Alert.alert(t('pomodoro.fail_play'), t('pomodoro.fail_play_desc'));
    }
  };

  const handleAddCustomSound = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const file = result.assets[0];
        const newSound: Soundscape = {
          id: 'custom_' + Date.now(),
          nameKey: '',
          customName: file.name.split('.')[0].slice(0, 15),
          icon: 'music-note',
          color: c.purple,
          url: file.uri,
          isCustom: true,
        };

        const updatedCustom = soundscapes.filter(s => s.isCustom);
        const newCustomList = [...updatedCustom, newSound];
        
        setSoundscapes([...DEFAULT_SOUNDSCAPES, ...newCustomList]);
        
        const currentData = await getData(STORAGE_KEYS.POMODORO) || {};
        await setData(STORAGE_KEYS.POMODORO, { ...currentData, customSoundscapes: newCustomList });
        
        Alert.alert(t('profile.update_success_title'), t('pomodoro.success_custom'));
      }
    } catch (e) {
      Alert.alert(t('profile.update_fail_title'), t('pomodoro.fail_custom'));
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const calculateStreak = () => {
    const dates = [...new Set(sessions.map(s => s.date))].sort().reverse();
    if (dates.length === 0) return 0;
    
    let streak = 0;
    let checkDate = new Date();
    
    for (let i = 0; i < 365; i++) {
      const dateStr = getToday(checkDate);
      if (dates.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const streakValue = calculateStreak();

  const progressValue = 1 - (timeLeft / MODES[mode].duration);
  const size = 280;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressValue);

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.pageHeader, { borderBottomColor: c.border, paddingTop: layout.topPadding }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.headerIconBox, { backgroundColor: c.purple + '15' }]}>
            <MaterialIcons name="timer" size={24} color={c.purple} />
          </View>
          <View>
            <Text style={[styles.pageTitle, { color: c.textPrimary }]}>{t('sidebar.pomodoro')}</Text>
            <Text style={[styles.pageSubtitle, { color: c.textSecondary }]}>{t('pomodoro.subtitle')}</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.streakBadge, { backgroundColor: c.orange + '15', borderColor: c.orange + '30', borderWidth: 1 }]} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowTips(true);
          }}
        >
          <MaterialIcons name="local-fire-department" size={20} color={c.orange} />
          <Text style={[styles.streakText, { color: c.orange }]}>{streakValue} {t('pomodoro.streak')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: layout.bottomPadding + 40 }}
      >
        {/* Mode Selector */}
        <View style={styles.modeContainer}>
          {(Object.keys(MODES) as ModeKey[]).map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.modeButton, mode === m && { backgroundColor: MODES[m].color + '20', borderColor: MODES[m].color }]}
              onPress={() => switchMode(m)}
            >
              <Text style={[styles.modeText, { color: mode === m ? MODES[m].color : c.textMuted }]}>{t(MODES[m].labelKey)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Visual Timer */}
        <View style={styles.timerWrapper}>
          <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={c.bgInput} strokeWidth={strokeWidth} />
            <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={MODES[mode].color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
          </Svg>
          <View style={styles.timerContent}>
            <Text style={[styles.timerValue, { color: c.textPrimary }]}>{formatTime(timeLeft)}</Text>
            <Text style={[styles.timerMode, { color: c.textMuted }]}>{isRunning ? t('pomodoro.status_running') : t('pomodoro.status_ready')}</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlRow}>
          <TouchableOpacity 
            style={[styles.controlBtn, isRunning ? { backgroundColor: c.red } : { backgroundColor: MODES[mode].color }]} 
            onPress={toggleTimer}
          >
            <MaterialIcons name={isRunning ? 'pause' : 'play-arrow'} size={40} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.resetBtn, { backgroundColor: c.bgInput }]} onPress={resetTimer}>
            <MaterialIcons name="refresh" size={24} color={c.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Auto Start Toggle */}
        <TouchableOpacity 
          style={styles.autoStartRow} 
          onPress={() => { setAutoStart(!autoStart); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <View style={[styles.checkbox, { borderColor: c.purple, backgroundColor: autoStart ? c.purple : 'transparent' }]}>
            {autoStart && <MaterialIcons name="check" size={16} color="#fff" />}
          </View>
          <Text style={[styles.autoStartText, { color: c.textPrimary }]}>{t('pomodoro.auto_start')}</Text>
        </TouchableOpacity>

        {/* Soundscapes */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <MaterialIcons name="headset" size={18} color={c.purple} />
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>{t('pomodoro.soundscapes')}</Text>
          </View>
          <TouchableOpacity onPress={handleAddCustomSound}>
            <Text style={{ color: c.purple, fontSize: 13, fontWeight: '800' }}>{t('pomodoro.custom_sound')}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.soundScroll}>
          {soundscapes.map(s => (
            <TouchableOpacity
              key={s.id}
              style={[styles.soundCard, { backgroundColor: c.bgCard, borderColor: c.border }, activeSound === s.id && { backgroundColor: s.color + '15', borderColor: s.color }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); playSound(s.id); }}
            >
              <View style={[styles.soundIconBox, { backgroundColor: activeSound === s.id ? s.color : c.bgInput }]}>
                <MaterialIcons name={s.icon as any} size={24} color={activeSound === s.id ? '#fff' : c.textSecondary} />
              </View>
              <Text style={[styles.soundName, { color: activeSound === s.id ? s.color : c.textSecondary }]} numberOfLines={1}>
                {s.isCustom ? s.customName : t(s.nameKey)}
              </Text>
              {s.isCustom && (
                <TouchableOpacity 
                  style={styles.deleteSound} 
                  onPress={async () => {
                    const filtered = soundscapes.filter(x => x.id !== s.id);
                    setSoundscapes(filtered);
                    const currentData = await getData(STORAGE_KEYS.POMODORO) || {};
                    await setData(STORAGE_KEYS.POMODORO, { ...currentData, customSoundscapes: filtered.filter(x => x.isCustom) });
                  }}
                >
                  <MaterialIcons name="close" size={12} color={c.textMuted} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* History Analysis */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <MaterialIcons name="history" size={18} color={c.purple} />
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>{t('pomodoro.analysis')}</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
          {[...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const dateStr = getToday(d);
            const count = sessions.filter(s => s.date === dateStr).length;
            const isToday = dateStr === today;
            return (
              <View key={i} style={[styles.dayCard, { backgroundColor: c.bgCard, borderColor: isToday ? c.purple : c.border }]}>
                <Text style={[styles.dayName, { color: isToday ? c.purple : c.textMuted }]}>
                  {d.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'short' })}
                </Text>
                <View style={[styles.dayCircle, isToday && { backgroundColor: c.purple }]}>
                  <Text style={[styles.dayDate, { color: isToday ? '#fff' : c.textPrimary }]}>{d.getDate()}</Text>
                </View>
                <View style={[styles.sessionBadge, { backgroundColor: count > 0 ? c.green : c.bgInput }]}>
                  <Text style={[styles.sessionBadgeText, { color: count > 0 ? '#fff' : c.textMuted }]}>{count} {t('pomodoro.session_count')}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Productivity Hub Tips */}
        <View style={[styles.tipsCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          <View style={styles.tipsHeader}>
            <View style={[styles.tipIconBox, { backgroundColor: c.purple + '15' }]}>
              <MaterialIcons name="lightbulb" size={20} color={c.purple} />
            </View>
            <Text style={[styles.tipsTitle, { color: c.textPrimary }]}>{t('pomodoro.tips_title')}</Text>
          </View>
          <View style={styles.tipsGrid}>
            {[
              { id: '1', titleKey: 'pomodoro.tip_deep_work', icon: 'psychology', tipKey: 'pomodoro.tip_deep_work_desc' },
              { id: '2', titleKey: 'pomodoro.tip_micro_break', icon: 'timer', tipKey: 'pomodoro.tip_micro_break_desc' },
              { id: '3', titleKey: 'pomodoro.tip_eat_frog', icon: 'priority-high', tipKey: 'pomodoro.tip_eat_frog_desc' }
            ].map(tip => (
              <TouchableOpacity key={tip.id} style={[styles.tipChip, { backgroundColor: c.bgInput }]} onPress={() => { setSelectedTip(t(tip.tipKey)); setShowTips(true); }}>
                <MaterialIcons name={tip.icon as any} size={16} color={c.purple} />
                <Text style={[styles.tipChipText, { color: c.textPrimary }]}>{t(tip.titleKey)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Premium Tip Modal */}
      <Modal visible={showTips} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.tipModal, { backgroundColor: c.bgSecondary, paddingBottom: Math.max(layout.insets.bottom, 20) + 20 }]}>
            <View style={styles.tipModalHeader}>
              <Text style={[styles.tipModalTitle, { color: c.textPrimary }]}>{t('pomodoro.modal_title')}</Text>
              <TouchableOpacity onPress={() => setShowTips(false)}><MaterialIcons name="close" size={24} color={c.textSecondary} /></TouchableOpacity>
            </View>
            <View style={[styles.tipContentBox, { backgroundColor: c.bgInput }]}>
              <Text style={[styles.tipModalContent, { color: c.textPrimary }]}>{selectedTip || t('pomodoro.tip_deep_work_desc')}</Text>
            </View>
            <TouchableOpacity style={[styles.closeTipBtn, { backgroundColor: c.purple }]} onPress={() => setShowTips(false)}>
              <Text style={styles.closeTipBtnText}>{t('pomodoro.modal_close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {xpToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{xpToast}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1 },
  headerIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 28, fontWeight: '900' },
  pageSubtitle: { fontSize: 14, marginTop: 2 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  streakText: { fontSize: 14, fontWeight: '800', marginLeft: 6 },
  
  modeContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 24, marginBottom: 32 },
  modeButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  modeText: { fontSize: 13, fontWeight: '800' },
  
  timerWrapper: { alignSelf: 'center', position: 'relative', marginBottom: 40 },
  timerContent: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  timerValue: { fontSize: 64, fontWeight: '900', letterSpacing: -2 },
  timerMode: { fontSize: 14, fontWeight: '700', marginTop: 8 },
  
  controlRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, marginBottom: 32 },
  controlBtn: { width: 84, height: 84, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowOpacity: 0.3, shadowRadius: 10 },
  resetBtn: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  
  autoStartRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 40 },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  autoStartText: { fontSize: 14, fontWeight: '700' },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  
  soundScroll: { gap: 12, paddingBottom: 10 },
  soundCard: { width: 100, height: 120, borderRadius: 24, padding: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  soundIconBox: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  soundName: { fontSize: 12, fontWeight: '800' },
  deleteSound: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.1)', alignItems: 'center', justifyContent: 'center' },
  
  statsScroll: { gap: 12, paddingBottom: 10 },
  dayCard: { width: 85, borderRadius: 24, padding: 16, alignItems: 'center', borderWidth: 1 },
  dayName: { fontSize: 11, fontWeight: '800', marginBottom: 10 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  dayDate: { fontSize: 15, fontWeight: '900' },
  sessionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  sessionBadgeText: { fontSize: 10, fontWeight: '900' },
  
  tipsCard: { borderRadius: 28, padding: 20, marginTop: 20, borderWidth: 1 },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  tipIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tipsTitle: { fontSize: 16, fontWeight: '900' },
  tipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tipChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  tipChipText: { fontSize: 13, fontWeight: '800' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  tipModal: { borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 28 },
  tipModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  tipModalTitle: { fontSize: 24, fontWeight: '900' },
  tipContentBox: { borderRadius: 20, padding: 20, marginBottom: 32 },
  tipModalContent: { fontSize: 16, lineHeight: 26, fontWeight: '600' },
  closeTipBtn: { height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  closeTipBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  
  toast: { position: 'absolute', top: 100, alignSelf: 'center', backgroundColor: '#8b5cf6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, zIndex: 1000 },
  toastText: { color: '#fff', fontWeight: '800' },
});
