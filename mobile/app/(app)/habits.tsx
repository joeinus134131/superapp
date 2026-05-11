import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, StyleSheet, RefreshControl, Modal, useWindowDimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { MOBILE_SPACING, useMobileLayout } from '../../lib/layout';
import { getToday } from '../../lib/helpers';
import { useLanguage } from '../../context/languageContext';
import * as Haptics from 'expo-haptics';

import { useHabits, Habit } from '../../hooks/useHabits';
import { FloatingActionButton } from '../../components/FloatingActionButton';
import { LevelUpModal } from '../../components/LevelUpModal';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { MicroTimer } from '../../components/MicroTimer';
import { MomentumHabitCard } from '../../components/MomentumHabitCard';

const HABIT_ICONS = [
  'star', 'fitness-center', 'menu-book', 'self-improvement', 'directions-run', 
  'water-drop', 'restaurant', 'bedtime', 'edit', 'ads-click', 
  'cleaning-services', 'medication', 'apple', 'computer', 'directions-bike', 
  'local-cafe', 'palette', 'music-note', 'eco', 'shower', 
  'smartphone', 'volume-off', 'handshake', 'wb-sunny'
];

export default function HabitsScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const today = getToday();
  const layout = useMobileLayout();
  const { t, language } = useLanguage();
  const { width } = useWindowDimensions();
  const isSmall = width < 380;

  const { 
    habits, loading, xpToast, levelUpData, setLevelUpData, 
    addHabit, toggleHabit, deleteHabit, refreshHabits 
  } = useHabits();

  const [showModal, setShowModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('star');
  const [historyRange, setHistoryRange] = useState(7);
  const [microModeHabit, setMicroModeHabit] = useState<Habit | null>(null);

  const handleAddHabit = async () => {
    if (!newHabitName.trim()) return;
    await addHabit(newHabitName, selectedIcon);
    setNewHabitName('');
    setShowModal(false);
  };

  const handleDeleteHabit = (id: string) => {
    Alert.alert(t('habits.delete_title'), t('habits.delete_confirm'), [
      { text: t('tasks.cancel'), style: 'cancel' },
      { text: t('tasks.delete_btn'), style: 'destructive', onPress: () => deleteHabit(id) },
    ]);
  };

  const todayCompleted = useMemo(() => habits.filter(h => h.completedDates?.includes(today)).length, [habits, today]);
  const completionRate = useMemo(() => habits.length > 0 ? Math.round((todayCompleted / habits.length) * 100) : 0, [todayCompleted, habits.length]);
  const maxStreak = useMemo(() => habits.reduce((max, h) => Math.max(max, h.streak || 0), 0), [habits]);

  const visibleDays = useMemo(() => Array.from({ length: historyRange }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (historyRange - 1 - i));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }), [historyRange]);

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.pageHeader, { borderBottomColor: c.border, paddingTop: layout.topPadding }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <View style={[styles.headerIconBox, { backgroundColor: c.purple + '15' }]}>
            <MaterialIcons name="local-fire-department" size={24} color={c.purple} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[isSmall ? styles.pageTitleSmall : styles.pageTitle, { color: c.textPrimary }]} numberOfLines={1}>{t('sidebar.habits')}</Text>
            <Text style={[isSmall ? styles.pageSubtitleSmall : styles.pageSubtitle, { color: c.textSecondary }]} numberOfLines={1}>{t('habits.subtitle')}</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={[styles.historyToggle, { backgroundColor: c.purple + '15', borderColor: c.purple + '30', borderWidth: 1, marginLeft: 12 }]} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setHistoryRange(r => r === 7 ? 30 : 7);
          }}
        >
          <MaterialIcons name="event" size={16} color={c.purple} />
          <Text style={{ color: c.purple, fontWeight: '800', marginLeft: isSmall ? 4 : 6, fontSize: isSmall ? 11 : 13 }}>
            {historyRange} {isSmall ? '' : t('habits.day')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshHabits} tintColor={c.purple} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: layout.bottomPadding + 100 }}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: t('habits.today'), value: `${todayCompleted}/${habits.length}`, icon: 'check-circle' as const, color: c.green },
            { label: t('habits.rate'), value: `${completionRate}%`, icon: 'trending-up' as const, color: c.purple },
            { label: t('habits.best_streak'), value: maxStreak, icon: 'local-fire-department' as const, color: c.red },
          ].map((s, i) => (
            <Card key={i} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '15' }]}>
                <MaterialIcons name={s.icon} size={20} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: c.textPrimary }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: c.textMuted }]}>{s.label}</Text>
            </Card>
          ))}
        </View>

        {/* Consistency Analysis */}
        <Card style={{ padding: 20, marginBottom: 24 }}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <MaterialIcons name="auto-graph" size={18} color={c.purple} />
              <Text style={[styles.cardTitle, { color: c.textPrimary }]}>{t('habits.consistency_analysis')}</Text>
            </View>
          </View>
          
          <View style={styles.analysisMeta}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.consistencyLabel, { color: c.textSecondary }]}>{t('habits.global_consistency')}</Text>
              <View style={[styles.consistencyBarTrack, { backgroundColor: c.bgInput }]}>
                <View style={[styles.consistencyBarFill, { width: `${completionRate}%`, backgroundColor: c.purple }]} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.consistencyValue, { color: c.textPrimary }]}>{completionRate}%</Text>
            </View>
          </View>

          <View style={styles.journeyTimeline}>
            {visibleDays.slice().reverse().map((d, index) => {
              const date = new Date(d);
              const isToday = d === today;
              const completedHabits = habits.filter(h => h.completedDates?.includes(d));
              
              return (
                <View key={d} style={styles.timelineDay}>
                  <View style={styles.timelineLeft}>
                    <Text style={[styles.timelineDate, { color: isToday ? c.purple : c.textMuted }]}>
                      {date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short' })}
                    </Text>
                    <View style={[styles.timelineLine, { backgroundColor: c.border }]} />
                    <View style={[styles.timelineDot, { backgroundColor: completedHabits.length > 0 ? c.green : c.border }]} />
                  </View>
                  
                  <View style={styles.timelineContent}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={[styles.timelineDayName, { color: c.textPrimary }]}>
                        {isToday ? t('habits.today') : date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long' })}
                      </Text>
                      {completedHabits.length > 0 && (
                        <Badge label={`${completedHabits.length} ${t('habits.status_completed').toUpperCase()}`} color={c.green} />
                      )}
                    </View>
                    
                    <View style={styles.timelineHabits}>
                      {completedHabits.length === 0 ? (
                        <Text style={[styles.noHabitsText, { color: c.textMuted }]}>{t('habits.no_activity')}</Text>
                      ) : (
                        <View style={styles.habitsCloud}>
                          {completedHabits.map(h => (
                            <View key={h.id} style={[styles.habitTag, { backgroundColor: c.bgInput, borderColor: c.border }]}>
                              <MaterialIcons name={h.icon as any} size={12} color={c.purple} />
                              <Text style={[styles.habitTagText, { color: c.textPrimary }]}>{h.name}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Habit List Section */}
        <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>{t('habits.habit_list').toUpperCase()}</Text>
        {habits.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="add-task" size={48} color={c.textMuted} />
            <Text style={[styles.emptyText, { color: c.textMuted }]}>{t('habits.empty_list')}</Text>
          </View>
        ) : habits.map(h => (
          <MomentumHabitCard 
            key={h.id}
            habit={h}
            isDone={h.completedDates?.includes(today)}
            colors={c}
            onToggle={toggleHabit}
            onDelete={id => {
              Alert.alert(t('habits.delete_title'), t('habits.delete_confirm'), [
                { text: t('tasks.cancel'), style: 'cancel' },
                { text: t('tasks.delete_btn'), style: 'destructive', onPress: () => deleteHabit(id) },
              ]);
            }}
            onComplete={id => toggleHabit(id)} // Momentum complete
          />
        ))}
      </ScrollView>

      <FloatingActionButton onPress={() => setShowModal(true)} />

      <LevelUpModal 
        visible={!!levelUpData} 
        level={levelUpData} 
        onClose={() => setLevelUpData(null)} 
      />

      {/* Add Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.bgSecondary, paddingBottom: Math.max(layout.insets.bottom, 20) + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{t('habits.new_habit')}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><MaterialIcons name="close" size={24} color={c.textSecondary} /></TouchableOpacity>
            </View>
            
            <Text style={[styles.inputLabel, { color: c.textSecondary }]}>{t('habits.icon_label')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiGrid}>
              {HABIT_ICONS.map(iconName => (
                <TouchableOpacity 
                  key={iconName} 
                  style={[styles.emojiSelect, { backgroundColor: c.bgInput }, selectedIcon === iconName && { backgroundColor: c.purple + '20', borderColor: c.purple, borderWidth: 1 }]} 
                  onPress={() => { setSelectedIcon(iconName); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <MaterialIcons name={iconName as any} size={24} color={selectedIcon === iconName ? c.purple : c.textSecondary} />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Input 
              label={t('habits.name_label')}
              value={newHabitName}
              onChangeText={setNewHabitName}
              placeholder={t('habits.name_placeholder')}
              autoFocus
              containerStyle={{ marginTop: 24 }}
            />
            
            <Button 
              label={t('habits.start_btn')} 
              onPress={handleAddHabit} 
              variant="primary"
              style={{ height: 60, marginTop: 12 }}
            />
          </View>
        </View>
      </Modal>

      {/* Level Up Modal */}
      {levelUpData && (
        <View style={styles.levelUpOverlay}>
          <View style={[styles.levelUpModal, { backgroundColor: c.bgPrimary, borderColor: c.purple }]}>
            <MaterialIcons name="auto-awesome" size={64} color={c.purple} style={{ marginBottom: 16 }} />
            <Text style={[styles.levelUpTitle, { color: c.purple }]}>LEVEL UP!</Text>
            <Text style={[styles.levelUpDesc, { color: c.textPrimary }]}>{t('achievements.level_up_desc') || 'Anda telah mencapai Level'} {levelUpData.level}</Text>
            <Text style={[styles.levelUpRank, { color: c.textSecondary }]}>{levelUpData.title}</Text>
            <TouchableOpacity style={[styles.levelUpBtn, { backgroundColor: c.purple }]} onPress={() => setLevelUpData(null)}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>{t('tasks.save') || 'Lanjutkan!'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {xpToast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{xpToast}</Text>
        </View>
      )}

      {/* Micro Mode Modal */}
      <Modal visible={!!microModeHabit} animationType="fade" transparent>
        <View style={styles.microModalOverlay}>
          <View style={styles.microModalContent}>
            {microModeHabit && (
              <MicroTimer 
                title={microModeHabit.name}
                onComplete={() => {
                  toggleHabit(microModeHabit.id);
                  setMicroModeHabit(null);
                }}
                onCancel={() => setMicroModeHabit(null)}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingBottom: 20, 
    borderBottomWidth: 1 
  },
  headerIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 28, fontWeight: '900' },
  pageTitleSmall: { fontSize: 22, fontWeight: '900' },
  pageSubtitle: { fontSize: 14, marginTop: 2 },
  pageSubtitleSmall: { fontSize: 12, marginTop: 1 },
  historyToggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, padding: 16, alignItems: 'center' },
  statIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '700' },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  cardTitle: { fontSize: 16, fontWeight: '900' },
  analysisMeta: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
  consistencyLabel: { fontSize: 12, fontWeight: '800', marginBottom: 8 },
  consistencyBarTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  consistencyBarFill: { height: '100%', borderRadius: 4 },
  consistencyValue: { fontSize: 20, fontWeight: '900' },
  
  journeyTimeline: { paddingLeft: 4 },
  timelineDay: { flexDirection: 'row', minHeight: 80, marginBottom: 4 },
  timelineLeft: { width: 70, alignItems: 'center', position: 'relative' },
  timelineDate: { fontSize: 10, fontWeight: '800', textAlign: 'center', marginTop: 4 },
  timelineLine: { position: 'absolute', top: 24, bottom: -4, width: 2, left: 49 },
  timelineDot: { position: 'absolute', top: 6, left: 45, width: 10, height: 10, borderRadius: 5, zIndex: 2, borderWidth: 2, borderColor: '#fff' },
  timelineContent: { flex: 1, paddingLeft: 12, paddingBottom: 24 },
  timelineDayName: { fontSize: 14, fontWeight: '800', marginBottom: 8 },
  timelineHabits: { gap: 6 },
  noHabitsText: { fontSize: 12, fontStyle: 'italic', opacity: 0.6 },
  habitsCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  habitTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  habitTagText: { fontSize: 11, fontWeight: '700' },
  
  sectionLabel: { fontSize: 11, fontWeight: '900', marginLeft: 4, marginBottom: 16, letterSpacing: 1 },
  habitItemCard: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18, marginBottom: 14 },
  habitIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 28, height: 28, borderRadius: 9, borderWidth: 2, borderColor: 'rgba(150,150,150,0.2)', alignItems: 'center', justifyContent: 'center' },
  habitItemName: { fontSize: 17, fontWeight: '800', marginBottom: 4 },
  habitMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  habitItemMeta: { fontSize: 12, fontWeight: '700' },
  deleteBtn: { padding: 4 },
  
  emptyState: { alignItems: 'center', paddingVertical: 40, opacity: 0.6 },
  emptyText: { fontSize: 15, fontWeight: '800', marginTop: 12 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingHorizontal: 24, paddingTop: 28 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '900' },
  inputLabel: { fontSize: 14, fontWeight: '800', marginBottom: 12 },
  emojiGrid: { gap: 10, paddingBottom: 10 },
  emojiSelect: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  
  levelUpOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  levelUpModal: { width: '85%', padding: 32, borderRadius: 32, borderWidth: 2, alignItems: 'center' },
  levelUpTitle: { fontSize: 28, fontWeight: '900', marginBottom: 12 },
  levelUpDesc: { fontSize: 16, textAlign: 'center', marginBottom: 24 },
  levelUpRank: { fontSize: 14, marginBottom: 24, textAlign: 'center', fontWeight: '600' },
  levelUpBtn: { width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  toast: { position: 'absolute', top: 100, alignSelf: 'center', backgroundColor: '#8b5cf6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, zIndex: 1000 },
  toastText: { color: '#fff', fontWeight: '800' },
  microBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 8, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.3)' },
  microBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  microModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  microModalContent: { width: '100%', maxWidth: 400 },
});
