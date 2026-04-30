import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { useMobileLayout } from '../../lib/layout';
import { getData, setData, STORAGE_KEYS } from '../../lib/storage';
import { generateId, getToday, formatDate } from '../../lib/helpers';
import { PageHeader } from '../../components/PageHeader';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM
  endTime: string;    // HH:MM
  category: string;
  color: string;
  notes: string;
  isAllDay: boolean;
  createdAt: string;
}

const CATEGORIES = [
  { label: 'Kerja', color: '#3b82f6', icon: 'work' },
  { label: 'Personal', color: '#8b5cf6', icon: 'person' },
  { label: 'Kesehatan', color: '#10b981', icon: 'favorite' },
  { label: 'Belajar', color: '#f59e0b', icon: 'school' },
  { label: 'Sosial', color: '#ec4899', icon: 'people' },
  { label: 'Lainnya', color: '#9ca3af', icon: 'event' },
];

const EMPTY: CalendarEvent = {
  id: '', title: '', date: '', time: '09:00', endTime: '10:00',
  category: 'Personal', color: '#8b5cf6', notes: '', isAllDay: false, createdAt: '',
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function CalendarScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const today = getToday();
  const todayDate = new Date(today);
  const layout = useMobileLayout();

  const [year, setYear] = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth());
  const [selectedDate, setSelectedDate] = useState(today);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<CalendarEvent>(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await getData(STORAGE_KEYS.EVENTS);
    setEvents(data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const openAdd = () => {
    setForm({ ...EMPTY, id: generateId(), date: selectedDate, createdAt: new Date().toISOString() });
    setEditId(null);
    setModalVisible(true);
  };

  const openEdit = (event: CalendarEvent) => {
    setForm({ ...event });
    setEditId(event.id);
    setModalVisible(true);
  };

  const save = async () => {
    if (!form.title.trim()) { Alert.alert('Judul acara wajib diisi'); return; }
    if (!form.date) { Alert.alert('Tanggal wajib diisi'); return; }
    const updated = editId
      ? events.map(e => e.id === editId ? { ...form } : e)
      : [...events, { ...form }];
    await setData(STORAGE_KEYS.EVENTS, updated);
    setEvents(updated);
    setModalVisible(false);
  };

  const deleteEvent = (id: string) => {
    Alert.alert('Hapus Acara', 'Yakin hapus acara ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive', onPress: async () => {
          const updated = events.filter(e => e.id !== id);
          await setData(STORAGE_KEYS.EVENTS, updated);
          setEvents(updated);
        },
      },
    ]);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const calCells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const getEventsForDate = (dateStr: string) => events.filter(e => e.date === dateStr);
  const selectedEvents = getEventsForDate(selectedDate).sort((a, b) => a.time.localeCompare(b.time));

  const upcomingEvents = events
    .filter(e => e.date >= today)
    .sort((a, b) => a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date))
    .slice(0, 20);

  const s = styles(c, isDark);

  return (
    <View style={s.container}>
      <PageHeader
        title="Kalender"
        subtitle="Atur jadwal dan lihat agenda mendatang."
        textColor={c.textPrimary}
        subtextColor={c.textSecondary}
        backgroundColor={c.bgPrimary}
        actionColor={c.purple}
        onActionPress={openAdd}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 8, paddingBottom: layout.bottomPadding }}>
        {/* Month Navigator */}
        <View style={s.monthNav}>
          <TouchableOpacity style={s.navBtn} onPress={prevMonth}>
            <MaterialIcons name="chevron-left" size={24} color={c.textPrimary} />
          </TouchableOpacity>
          <Text style={s.monthTitle}>{MONTH_NAMES[month]} {year}</Text>
          <TouchableOpacity style={s.navBtn} onPress={nextMonth}>
            <MaterialIcons name="chevron-right" size={24} color={c.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Calendar Grid */}
        <View style={s.calendarCard}>
          {/* Day names */}
          <View style={s.dayNamesRow}>
            {DAY_NAMES.map(d => (
              <Text key={d} style={s.dayName}>{d}</Text>
            ))}
          </View>
          {/* Cells */}
          <View style={s.cellsGrid}>
            {calCells.map((day, i) => {
              if (!day) return <View key={`e-${i}`} style={s.cell} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              const hasEvents = getEventsForDate(dateStr).length > 0;
              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[s.cell, isSelected && s.cellSelected, isToday && !isSelected && s.cellToday]}
                  onPress={() => setSelectedDate(dateStr)}
                >
                  <Text style={[s.cellText, isSelected && s.cellTextSelected, isToday && !isSelected && { color: c.purple }]}>
                    {day}
                  </Text>
                  {hasEvents && <View style={[s.dot, { backgroundColor: isSelected ? '#fff' : c.purple }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Selected Date Events */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>
            {selectedDate === today ? 'Hari Ini' : formatDate(selectedDate)}
          </Text>
          {selectedEvents.length === 0 ? (
            <View style={s.emptyDay}>
              <MaterialIcons name="event-available" size={32} color={c.textMuted} />
              <Text style={s.emptyDayText}>Tidak ada acara</Text>
            </View>
          ) : (
            selectedEvents.map(event => <EventCard key={event.id} event={event} onEdit={() => openEdit(event)} onDelete={() => deleteEvent(event.id)} c={c} />)
          )}
          <TouchableOpacity style={s.addEventBtn} onPress={openAdd}>
            <MaterialIcons name="add" size={18} color={c.purple} />
            <Text style={s.addEventBtnText}>Tambah Acara</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming */}
        {upcomingEvents.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Mendatang</Text>
            {upcomingEvents.map(event => <EventCard key={event.id} event={event} onEdit={() => openEdit(event)} onDelete={() => deleteEvent(event.id)} c={c} />)}
          </View>
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, { paddingBottom: Math.max(layout.insets.bottom, 20) + 20 }]}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editId ? 'Edit Acara' : 'Tambah Acara'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={c.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.label}>Judul Acara *</Text>
              <TextInput style={s.input} value={form.title} onChangeText={t => setForm(f => ({ ...f, title: t }))} placeholder="Masukkan judul acara" placeholderTextColor={c.textMuted} />

              <Text style={s.label}>Tanggal *</Text>
              <TextInput style={s.input} value={form.date} onChangeText={t => setForm(f => ({ ...f, date: t }))} placeholder="YYYY-MM-DD" placeholderTextColor={c.textMuted} />

              <TouchableOpacity style={s.toggleRow} onPress={() => setForm(f => ({ ...f, isAllDay: !f.isAllDay }))}>
                <Text style={s.toggleLabel}>Seharian</Text>
                <View style={[s.toggle, form.isAllDay && s.toggleOn]}>
                  <View style={[s.toggleThumb, form.isAllDay && s.toggleThumbOn]} />
                </View>
              </TouchableOpacity>

              {!form.isAllDay && (
                <View style={s.row}>
                  <View style={s.halfField}>
                    <Text style={s.label}>Mulai</Text>
                    <TextInput style={s.input} value={form.time} onChangeText={t => setForm(f => ({ ...f, time: t }))} placeholder="09:00" placeholderTextColor={c.textMuted} />
                  </View>
                  <View style={s.halfField}>
                    <Text style={s.label}>Selesai</Text>
                    <TextInput style={s.input} value={form.endTime} onChangeText={t => setForm(f => ({ ...f, endTime: t }))} placeholder="10:00" placeholderTextColor={c.textMuted} />
                  </View>
                </View>
              )}

              <Text style={s.label}>Kategori</Text>
              <View style={s.chipRow}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.label}
                    style={[s.chip, form.category === cat.label && { backgroundColor: cat.color, borderColor: cat.color }]}
                    onPress={() => setForm(f => ({ ...f, category: cat.label, color: cat.color }))}
                  >
                    <Text style={[s.chipText, form.category === cat.label && { color: '#fff' }]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.label}>Catatan</Text>
              <TextInput style={[s.input, s.textarea]} value={form.notes} onChangeText={t => setForm(f => ({ ...f, notes: t }))} placeholder="Deskripsi acara..." placeholderTextColor={c.textMuted} multiline numberOfLines={3} />

              <TouchableOpacity style={s.saveBtn} onPress={save}>
                <Text style={s.saveBtnText}>{editId ? 'Simpan Perubahan' : 'Tambah Acara'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function EventCard({ event, onEdit, onDelete, c }: { event: CalendarEvent; onEdit: () => void; onDelete: () => void; c: any }) {
  const cat = CATEGORIES.find(cat => cat.label === event.category) || CATEGORIES[CATEGORIES.length - 1];
  return (
    <TouchableOpacity style={[eventStyles.card, { borderLeftColor: cat.color, backgroundColor: c.bgCard }]} onPress={onEdit} activeOpacity={0.8}>
      <View style={eventStyles.info}>
        <Text style={[eventStyles.title, { color: c.textPrimary }]} numberOfLines={1}>{event.title}</Text>
        <Text style={[eventStyles.meta, { color: c.textSecondary }]}>
          {event.isAllDay ? 'Seharian' : `${event.time} – ${event.endTime}`} · {cat.label}
        </Text>
        {event.notes ? <Text style={[eventStyles.notes, { color: c.textMuted }]} numberOfLines={1}>{event.notes}</Text> : null}
      </View>
      <TouchableOpacity onPress={onDelete} style={eventStyles.del}>
        <MaterialIcons name="delete-outline" size={18} color={c.textMuted} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const eventStyles = StyleSheet.create({
  card: { flexDirection: 'row', borderRadius: 12, padding: 12, borderLeftWidth: 4, marginBottom: 8 },
  info: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 12 },
  notes: { fontSize: 12 },
  del: { padding: 4 },
});

const styles = (c: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgPrimary },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 },
  navBtn: { padding: 6, backgroundColor: c.bgCard, borderRadius: 10 },
  monthTitle: { fontSize: 18, fontWeight: '800', color: c.textPrimary },
  calendarCard: { marginHorizontal: 16, backgroundColor: c.bgCard, borderRadius: 16, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: c.border },
  dayNamesRow: { flexDirection: 'row', marginBottom: 8 },
  dayName: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: c.textMuted },
  cellsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  cellSelected: { backgroundColor: c.purple },
  cellToday: { backgroundColor: c.purple + '20' },
  cellText: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
  cellTextSelected: { color: '#fff', fontWeight: '800' },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: c.textPrimary, marginBottom: 12 },
  emptyDay: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyDayText: { color: c.textMuted, fontSize: 14 },
  addEventBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingVertical: 10, justifyContent: 'center', borderWidth: 1, borderColor: c.border, borderRadius: 12, marginTop: 4 },
  addEventBtnText: { color: c.purple, fontWeight: '700', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: c.bgPrimary, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: c.textPrimary },
  label: { fontSize: 13, fontWeight: '600', color: c.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: c.bgCard, borderRadius: 12, padding: 12, fontSize: 14, color: c.textPrimary, borderWidth: 1, borderColor: c.border },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: c.textPrimary },
  toggle: { width: 44, height: 24, borderRadius: 12, backgroundColor: c.border, padding: 2, justifyContent: 'center' },
  toggleOn: { backgroundColor: c.purple },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleThumbOn: { alignSelf: 'flex-end' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.border },
  chipText: { fontSize: 13, fontWeight: '600', color: c.textSecondary },
  saveBtn: { backgroundColor: c.purple, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20, marginBottom: 8 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
