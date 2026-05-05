import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, Alert, ScrollView, RefreshControl
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { useMobileLayout } from '../../lib/layout';
import { formatDate, getToday } from '../../lib/helpers';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../../context/languageContext';

import { useCalendar, CalendarEvent } from '../../hooks/useCalendar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';

const CATEGORIES = [
  { key: 'work', labelKey: 'calendar.cat_work', color: '#3b82f6', icon: 'work' },
  { key: 'personal', labelKey: 'calendar.cat_personal', color: '#8b5cf6', icon: 'person' },
  { key: 'health', labelKey: 'calendar.cat_health', color: '#10b981', icon: 'favorite' },
  { key: 'study', labelKey: 'calendar.cat_study', color: '#f59e0b', icon: 'school' },
  { key: 'social', labelKey: 'calendar.cat_social', color: '#ec4899', icon: 'people' },
  { key: 'others', labelKey: 'calendar.cat_others', color: '#9ca3af', icon: 'event' },
];

const EMPTY: Omit<CalendarEvent, 'id' | 'createdAt'> = {
  title: '', date: '', time: '09:00', endTime: '10:00',
  category: 'personal', color: '#8b5cf6', notes: '', isAllDay: false,
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const EventCard = React.memo(({ event, onEdit, onDelete, c, t }: { event: CalendarEvent; onEdit: (e: CalendarEvent) => void; onDelete: (id: string) => void; c: any; t: any }) => {
  const cat = CATEGORIES.find(cat => cat.key === event.category) || CATEGORIES[CATEGORIES.length - 1];
  return (
    <Card style={[eventStyles.card, { borderLeftColor: cat.color }]} onPress={() => onEdit(event)}>
      <View style={eventStyles.info}>
        <Text style={[eventStyles.title, { color: c.textPrimary }]} numberOfLines={1}>{event.title}</Text>
        <Text style={[eventStyles.meta, { color: c.textSecondary }]}>
          {event.isAllDay ? t('calendar.all_day_label') : `${event.time} – ${event.endTime}`} · {t(cat.labelKey)}
        </Text>
        {event.notes ? <Text style={[eventStyles.notes, { color: c.textMuted }]} numberOfLines={1}>{event.notes}</Text> : null}
      </View>
      <TouchableOpacity onPress={() => onDelete(event.id)} style={eventStyles.del}>
        <MaterialIcons name="delete-outline" size={18} color={c.textMuted} />
      </TouchableOpacity>
    </Card>
  );
});

export default function CalendarScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const today = getToday();
  const todayDate = new Date(today);
  const layout = useMobileLayout();
  const { t, language } = useLanguage();

  const { 
    events, loading, addEvent, updateEvent, deleteEvent, refreshEvents 
  } = useCalendar();

  const [year, setYear] = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth());
  const [selectedDate, setSelectedDate] = useState(today);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<Omit<CalendarEvent, 'id' | 'createdAt'>>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);

  const MONTH_NAMES = useMemo(() => [
    t('calendar.jan'), t('calendar.feb'), t('calendar.mar'), t('calendar.apr'), t('calendar.mei'), t('calendar.jun'),
    t('calendar.jul'), t('calendar.agu'), t('calendar.sep'), t('calendar.okt'), t('calendar.nov'), t('calendar.des')
  ], [t]);

  const DAY_NAMES = useMemo(() => [
    t('calendar.sun'), t('calendar.mon'), t('calendar.tue'), t('calendar.wed'), t('calendar.thu'), t('calendar.fri'), t('calendar.sat')
  ], [t]);

  const prevMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const openAdd = () => {
    setForm({ ...EMPTY, date: selectedDate });
    setEditId(null);
    setModalVisible(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setForm({ ...event });
    setEditId(event.id);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { Alert.alert(t('calendar.title_label') + ' ' + (t('tasks.required_msg') || 'wajib diisi')); return; }
    if (!form.date) { Alert.alert(t('calendar.date_label') + ' ' + (t('tasks.required_msg') || 'wajib diisi')); return; }
    if (editId) {
      await updateEvent(editId, form);
    } else {
      await addEvent(form);
    }
    setModalVisible(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('calendar.delete_title'), t('calendar.delete_confirm'), [
      { text: t('tasks.cancel'), style: 'cancel' },
      { text: t('tasks.delete_btn'), style: 'destructive', onPress: () => deleteEvent(id) },
    ]);
  };

  const calCells = useMemo(() => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    return [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  }, [year, month]);

  const selectedEvents = useMemo(() => 
    events.filter(e => e.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time)),
  [events, selectedDate]);

  const upcomingEvents = useMemo(() => 
    events
      .filter(e => e.date >= today)
      .sort((a, b) => a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date))
      .slice(0, 20),
  [events, today]);

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <View style={[styles.pageHeader, { borderBottomColor: c.border, paddingTop: layout.topPadding }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.headerIconBox, { backgroundColor: c.purple + '15' }]}>
            <MaterialIcons name="event" size={24} color={c.purple} />
          </View>
          <View>
            <Text style={[styles.pageTitle, { color: c.textPrimary }]}>{t('sidebar.calendar')}</Text>
            <Text style={[styles.pageSubtitle, { color: c.textSecondary }]}>{t('calendar.subtitle')}</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingTop: 20, paddingBottom: layout.bottomPadding + 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refreshEvents} tintColor={c.purple} />}
      >
        {/* Month Navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity style={[styles.navBtn, { backgroundColor: c.bgCard }]} onPress={prevMonth}>
            <MaterialIcons name="chevron-left" size={24} color={c.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: c.textPrimary }]}>{MONTH_NAMES[month]} {year}</Text>
          <TouchableOpacity style={[styles.navBtn, { backgroundColor: c.bgCard }]} onPress={nextMonth}>
            <MaterialIcons name="chevron-right" size={24} color={c.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <Card style={styles.calendarCard}>
          <View style={styles.dayNamesRow}>
            {DAY_NAMES.map(d => (
              <Text key={d} style={[styles.dayName, { color: c.textMuted }]}>{d}</Text>
            ))}
          </View>
          <View style={styles.cellsGrid}>
            {calCells.map((day, i) => {
              if (!day) return <View key={`e-${i}`} style={styles.cell} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              const hasEvents = events.some(e => e.date === dateStr);
              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[styles.cell, isSelected && { backgroundColor: c.purple }, isToday && !isSelected && { backgroundColor: c.purple + '20' }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedDate(dateStr); }}
                >
                  <Text style={[styles.cellText, { color: isSelected ? '#fff' : (isToday ? c.purple : c.textPrimary), fontWeight: isSelected ? '800' : '600' }]}>
                    {day}
                  </Text>
                  {hasEvents && <View style={[styles.dot, { backgroundColor: isSelected ? '#fff' : c.purple }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Selected Date Events */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>
            {selectedDate === today ? t('calendar.today_label') : formatDate(selectedDate, language)}
          </Text>
          {selectedEvents.length === 0 ? (
            <View style={styles.emptyDay}>
              <MaterialIcons name="event-available" size={32} color={c.textMuted} />
              <Text style={[styles.emptyDayText, { color: c.textMuted }]}>{t('calendar.empty_day')}</Text>
            </View>
          ) : (
            selectedEvents.map(event => <EventCard key={event.id} event={event} onEdit={openEdit} onDelete={handleDelete} c={c} t={t} />)
          )}
          <TouchableOpacity style={[styles.addEventBtn, { borderColor: c.border }]} onPress={openAdd}>
            <MaterialIcons name="add" size={18} color={c.purple} />
            <Text style={[styles.addEventBtnText, { color: c.purple }]}>{t('calendar.add_event_btn')}</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming */}
        {upcomingEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>{t('calendar.upcoming_label')}</Text>
            {upcomingEvents.map(event => <EventCard key={event.id} event={event} onEdit={openEdit} onDelete={handleDelete} c={c} t={t} />)}
          </View>
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(layout.insets.bottom, 20) + 20, backgroundColor: c.bgSecondary }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{editId ? t('calendar.edit_event') : t('calendar.new_event')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={c.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Input 
                label={t('calendar.title_label')}
                value={form.title} 
                onChangeText={t => setForm(f => ({ ...f, title: t }))} 
                placeholder={t('calendar.title_placeholder')} 
              />

              <Input 
                label={t('calendar.date_label')}
                value={form.date} 
                onChangeText={t => setForm(f => ({ ...f, date: t }))} 
                placeholder="YYYY-MM-DD" 
              />

              <TouchableOpacity style={styles.toggleRow} onPress={() => setForm(f => ({ ...f, isAllDay: !f.isAllDay }))}>
                <Text style={[styles.toggleLabel, { color: c.textPrimary }]}>{t('calendar.all_day_label')}</Text>
                <View style={[styles.toggle, { backgroundColor: form.isAllDay ? c.purple : c.border }]}>
                  <View style={[styles.toggleThumb, form.isAllDay && styles.toggleThumbOn]} />
                </View>
              </TouchableOpacity>

              {!form.isAllDay && (
                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <Input 
                      label={t('calendar.start_label')}
                      value={form.time} 
                      onChangeText={t => setForm(f => ({ ...f, time: t }))} 
                      placeholder="09:00" 
                    />
                  </View>
                  <View style={styles.halfField}>
                    <Input 
                      label={t('calendar.end_label')}
                      value={form.endTime} 
                      onChangeText={t => setForm(f => ({ ...f, endTime: t }))} 
                      placeholder="10:00" 
                    />
                  </View>
                </View>
              )}

              <Text style={[styles.label, { color: c.textSecondary }]}>{t('calendar.cat_label')}</Text>
              <View style={styles.chipRow}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.chip, { backgroundColor: c.bgInput, borderColor: c.border }, form.category === cat.key && { backgroundColor: cat.color, borderColor: cat.color }]}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setForm(f => ({ ...f, category: cat.key, color: cat.color })); }}
                  >
                    <Text style={[styles.chipText, { color: form.category === cat.key ? '#fff' : c.textSecondary }]}>{t(cat.labelKey)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input 
                label={t('calendar.notes_label')}
                value={form.notes} 
                onChangeText={t => setForm(f => ({ ...f, notes: t }))} 
                placeholder={t('calendar.notes_placeholder')} 
                multiline
                inputStyle={styles.textarea}
              />

              <Button 
                label={editId ? t('calendar.edit_save_btn') : t('calendar.save_btn')} 
                onPress={handleSave} 
                variant="primary"
                style={{ height: 60, marginTop: 12 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const eventStyles = StyleSheet.create({
  card: { flexDirection: 'row', padding: 12, borderLeftWidth: 4, marginBottom: 8 },
  info: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 12 },
  notes: { fontSize: 12 },
  del: { padding: 4 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1 },
  headerIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 28, fontWeight: '900' },
  pageSubtitle: { fontSize: 14, marginTop: 4 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  navBtn: { padding: 6, borderRadius: 10 },
  monthTitle: { fontSize: 18, fontWeight: '800' },
  calendarCard: { marginHorizontal: 20, padding: 16, marginBottom: 24 },
  dayNamesRow: { flexDirection: 'row', marginBottom: 12 },
  dayName: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700' },
  cellsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  cellText: { fontSize: 14 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  section: { marginHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 16 },
  emptyDay: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyDayText: { fontSize: 14, fontWeight: '600' },
  addEventBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48, paddingVertical: 10, justifyContent: 'center', borderWidth: 1, borderRadius: 16, marginTop: 12 },
  addEventBtnText: { fontWeight: '800', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingHorizontal: 24, paddingTop: 28, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '900' },
  label: { fontSize: 14, fontWeight: '800', marginBottom: 8, marginTop: 16 },
  textarea: { height: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  toggleLabel: { fontSize: 15, fontWeight: '700' },
  toggle: { width: 48, height: 26, borderRadius: 13, padding: 2, justifyContent: 'center' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  toggleThumbOn: { alignSelf: 'flex-end' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '700' },
});
