import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { triggerHaptic } from '../lib/haptics';

export const DEFAULT_DASHBOARD_SHORTCUTS = ['habits', 'journal', 'goals', 'calendar', 'pomodoro'];

export interface ShortcutMenuDefinition {
  route: string;
  icon: string;
  idLabel: string;
  enLabel: string;
  idDesc: string;
  enDesc: string;
}

export const ALL_SHORTCUT_MENUS: ShortcutMenuDefinition[] = [
  { route: 'habits', icon: 'local-fire-department', idLabel: 'Kebiasaan', enLabel: 'Habits', idDesc: 'Rutinitas & streak harian', enDesc: 'Daily routines & streaks' },
  { route: 'journal', icon: 'edit-note', idLabel: 'Jurnal', enLabel: 'Journal', idDesc: 'Refleksi & catatan cerita', enDesc: 'Reflections & daily notes' },
  { route: 'goals', icon: 'flag', idLabel: 'Tujuan', enLabel: 'Goals', idDesc: 'Target finansial & impian', enDesc: 'Financial & life targets' },
  { route: 'calendar', icon: 'calendar-today', idLabel: 'Kalender', enLabel: 'Calendar', idDesc: 'Jadwal & agenda bulanan', enDesc: 'Schedule & monthly events' },
  { route: 'pomodoro', icon: 'timer', idLabel: 'Fokus', enLabel: 'Focus', idDesc: 'Timer kerja mendalam', enDesc: 'Deep work focus timer' },
  { route: 'tasks', icon: 'check-circle-outline', idLabel: 'Tugas', enLabel: 'Tasks', idDesc: 'Daftar to-do & prioritas', enDesc: 'To-do list & priorities' },
  { route: 'finance', icon: 'account-balance-wallet', idLabel: 'Keuangan', enLabel: 'Finance', idDesc: 'Pemasukan & pengeluaran', enDesc: 'Income & expenses' },
  { route: 'health', icon: 'fitness-center', idLabel: 'Kesehatan', enLabel: 'Health', idDesc: 'Olahraga, tidur & air', enDesc: 'Workouts, sleep & water' },
  { route: 'reading', icon: 'menu-book', idLabel: 'Bacaan', enLabel: 'Reading', idDesc: 'Daftar buku & progres baca', enDesc: 'Book list & reading progress' },
  { route: 'insights', icon: 'insights', idLabel: 'Insight', enLabel: 'Insights', idDesc: 'Analisis progres mingguan', enDesc: 'Weekly progress analytics' },
  { route: 'notes', icon: 'sticky-note-2', idLabel: 'Catatan', enLabel: 'Notes', idDesc: 'Ide cepat & memo', enDesc: 'Quick ideas & memos' },
  { route: 'achievements', icon: 'emoji-events', idLabel: 'Pencapaian', enLabel: 'Badges', idDesc: 'Level XP & koleksi lencana', enDesc: 'XP levels & badge collection' },
  { route: 'social', icon: 'people', idLabel: 'Komunitas', enLabel: 'Social', idDesc: 'Squad & tantangan bersama', enDesc: 'Squads & shared challenges' },
];

export function resolveShortcutRoutes(savedRoutes?: string[]): string[] {
  const validSet = new Set(ALL_SHORTCUT_MENUS.map(m => m.route));
  if (!Array.isArray(savedRoutes) || savedRoutes.length === 0) {
    return [...DEFAULT_DASHBOARD_SHORTCUTS];
  }
  const filtered = savedRoutes.filter(r => validSet.has(r));
  const unique: string[] = [];
  for (const r of filtered) {
    if (!unique.includes(r)) unique.push(r);
  }
  for (const fallback of DEFAULT_DASHBOARD_SHORTCUTS) {
    if (unique.length >= 5) break;
    if (!unique.includes(fallback)) unique.push(fallback);
  }
  return unique.slice(0, 5);
}

interface DashboardShortcutsProps {
  routes?: string[];
  onChangeRoutes: (nextRoutes: string[]) => void;
  onOpenRoute: (route: string) => void;
  language: string;
  isDark: boolean;
  c: any;
  fontScale: number;
  bottomInset?: number;
}

export const DashboardShortcuts: React.FC<DashboardShortcutsProps> = ({
  routes: rawRoutes,
  onChangeRoutes,
  onOpenRoute,
  language,
  isDark,
  c,
  fontScale,
  bottomInset = 24,
}) => {
  const copy = (id: string, en: string) => (language === 'id' ? id : en);
  const activeRoutes = resolveShortcutRoutes(rawRoutes);

  const [isEditing, setIsEditing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [showPickerModal, setShowPickerModal] = useState(false);

  // Horizontal touch-drag tracking across the 5 slots
  const rowWidthRef = useRef<number>(320);
  const dragOriginXRef = useRef<number | null>(null);
  const dragOriginIndexRef = useRef<number>(0);
  const dragCurrentIndexRef = useRef<number>(0);

  const getMenu = (route: string): ShortcutMenuDefinition => {
    return (
      ALL_SHORTCUT_MENUS.find(m => m.route === route) ||
      ALL_SHORTCUT_MENUS[0]
    );
  };

  const getLabel = (menu: ShortcutMenuDefinition) =>
    language === 'id' ? menu.idLabel : menu.enLabel;

  const getDesc = (menu: ShortcutMenuDefinition) =>
    language === 'id' ? menu.idDesc : menu.enDesc;

  const saveRoutes = (next: string[]) => {
    onChangeRoutes(next);
  };

  const moveItemToIndex = (fromIndex: number, toIndex: number) => {
    const clampedTo = Math.max(0, Math.min(activeRoutes.length - 1, toIndex));
    if (fromIndex === clampedTo) return;
    const next = [...activeRoutes];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(clampedTo, 0, moved);
    triggerHaptic('light');
    saveRoutes(next);
    setSelectedIndex(clampedTo);
    dragCurrentIndexRef.current = clampedTo;
  };

  const swapOrReplaceSlot = (slotIdx: number, targetRoute: string) => {
    const existingIdx = activeRoutes.indexOf(targetRoute);
    const next = [...activeRoutes];
    if (existingIdx !== -1 && existingIdx !== slotIdx) {
      // Swap positions if the chosen menu is already in another slot
      const temp = next[slotIdx];
      next[slotIdx] = next[existingIdx];
      next[existingIdx] = temp;
      setSelectedIndex(slotIdx);
    } else {
      next[slotIdx] = targetRoute;
    }
    triggerHaptic('medium');
    saveRoutes(next);
  };

  const handleLongPressSlot = (index: number) => {
    triggerHaptic('medium');
    setSelectedIndex(index);
    dragCurrentIndexRef.current = index;
    setIsEditing(true);
  };

  const handlePressSlot = (route: string, index: number) => {
    if (!isEditing) {
      onOpenRoute(route);
      return;
    }
    // In edit mode: tapping another slot swaps the currently selected icon with the tapped slot!
    if (selectedIndex !== index) {
      const next = [...activeRoutes];
      const temp = next[selectedIndex];
      next[selectedIndex] = next[index];
      next[index] = temp;
      triggerHaptic('medium');
      saveRoutes(next);
      setSelectedIndex(index);
    } else {
      // Tapping the already-selected slot opens the menu replacement picker
      setShowPickerModal(true);
    }
  };

  const handleTouchStartSlot = (index: number, pageX?: number) => {
    if (!isEditing || typeof pageX !== 'number') return;
    dragOriginXRef.current = pageX;
    dragOriginIndexRef.current = index;
    dragCurrentIndexRef.current = index;
    setSelectedIndex(index);
  };

  const handleTouchMoveSlot = (pageX?: number) => {
    if (!isEditing || dragOriginXRef.current === null || typeof pageX !== 'number') return;
    const slotWidth = Math.max(48, rowWidthRef.current / activeRoutes.length);
    const deltaX = pageX - dragOriginXRef.current;
    const targetIdx = Math.max(
      0,
      Math.min(
        activeRoutes.length - 1,
        Math.round(dragOriginIndexRef.current + deltaX / slotWidth)
      )
    );
    if (targetIdx !== dragCurrentIndexRef.current) {
      moveItemToIndex(dragCurrentIndexRef.current, targetIdx);
    }
  };

  const handleTouchEndSlot = () => {
    dragOriginXRef.current = null;
  };

  const selectedMenu = getMenu(activeRoutes[selectedIndex] || activeRoutes[0]);
  const accentColor = isDark ? '#88C9A0' : '#193F30';
  const goldColor = '#B78E51';

  return (
    <View style={styles.wrapper}>
      <View
        onLayout={e => {
          const w = e.nativeEvent?.layout?.width;
          if (w && w > 0) rowWidthRef.current = w;
        }}
        style={[
          styles.shortcuts,
          { flexWrap: fontScale > 1.3 ? 'wrap' : 'nowrap' },
        ]}
      >
        {activeRoutes.map((route, index) => {
          const item = getMenu(route);
          const title = getLabel(item);
          const isSelected = isEditing && selectedIndex === index;
          return (
            <TouchableOpacity
              key={item.route}
              accessibilityRole="button"
              accessibilityLabel={
                isEditing
                  ? `${title} (${copy('Posisi', 'Slot')} ${index + 1})`
                  : title
              }
              onPress={() => handlePressSlot(item.route, index)}
              onLongPress={() => handleLongPressSlot(index)}
              delayLongPress={260}
              style={[
                styles.shortcut,
                fontScale > 1.3 ? { flexBasis: '30%' } : { flex: 1 },
              ]}
            >
              <View
                onTouchStart={e => handleTouchStartSlot(index, e?.nativeEvent?.pageX)}
                onTouchMove={e => handleTouchMoveSlot(e?.nativeEvent?.pageX)}
                onTouchEnd={handleTouchEndSlot}
                style={[
                  styles.shortcutIcon,
                  {
                    backgroundColor: isSelected
                      ? isDark
                        ? '#1E3A2B'
                        : '#EDF3EA'
                      : c.bgCard,
                    borderColor: isSelected
                      ? accentColor
                      : isEditing
                        ? goldColor + '88'
                        : c.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                <MaterialIcons
                  name={item.icon as any}
                  size={24}
                  color={isSelected ? accentColor : c.textPrimary}
                />
                {isEditing && (
                  <View
                    style={[
                      styles.slotBadge,
                      {
                        backgroundColor: isSelected ? accentColor : goldColor,
                      },
                    ]}
                  >
                    <Text style={styles.slotBadgeText}>{index + 1}</Text>
                  </View>
                )}
              </View>
              <Text
                style={{
                  color: isSelected ? accentColor : c.textPrimary,
                  fontSize: 12,
                  fontWeight: isSelected ? '800' : '700',
                  textAlign: 'center',
                }}
                numberOfLines={1}
              >
                {title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Clean normal state: properties appear only after long-pressing any icon */}
      {isEditing && (
        <View
          style={[
            styles.editPanel,
            {
              backgroundColor: c.bgCard,
              borderColor: accentColor + '44',
            },
          ]}
        >
          <View style={styles.editHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.textPrimary, fontSize: 13, fontWeight: '800' }}>
                {copy(
                  `Atur "${getLabel(selectedMenu)}" (Posisi #${selectedIndex + 1})`,
                  `Arrange "${getLabel(selectedMenu)}" (Slot #${selectedIndex + 1})`
                )}
              </Text>
              <Text style={{ color: c.textSecondary, fontSize: 11, marginTop: 2 }}>
                {copy(
                  'Geser icon, ketuk icon lain untuk tukar posisi, atau pindah ke ujung:',
                  'Drag icon, tap another icon to swap, or move left/right:'
                )}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={copy('Selesai mengatur pintasan', 'Done customizing shortcuts')}
              onPress={() => setIsEditing(false)}
              style={[styles.doneBtn, { backgroundColor: accentColor }]}
            >
              <Text style={styles.doneBtnText}>{copy('Selesai', 'Done')}</Text>
            </TouchableOpacity>
          </View>

          {/* Move Left / Right / Far Left / Far Right controls */}
          <View style={styles.moveRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={copy('Taruh di paling kiri', 'Move to leftmost')}
              disabled={selectedIndex === 0}
              onPress={() => moveItemToIndex(selectedIndex, 0)}
              style={[
                styles.moveBtn,
                {
                  borderColor: c.border,
                  opacity: selectedIndex === 0 ? 0.4 : 1,
                },
              ]}
            >
              <MaterialIcons name="first-page" size={18} color={c.textPrimary} />
              <Text style={{ color: c.textPrimary, fontSize: 11, fontWeight: '700' }}>
                {copy('Paling Kiri', 'Far Left')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={copy('Geser ke kiri', 'Move left')}
              disabled={selectedIndex === 0}
              onPress={() => moveItemToIndex(selectedIndex, selectedIndex - 1)}
              style={[
                styles.moveBtn,
                {
                  borderColor: c.border,
                  opacity: selectedIndex === 0 ? 0.4 : 1,
                },
              ]}
            >
              <MaterialIcons name="chevron-left" size={18} color={c.textPrimary} />
              <Text style={{ color: c.textPrimary, fontSize: 11, fontWeight: '700' }}>
                {copy('Kiri', 'Left')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={copy('Geser ke kanan', 'Move right')}
              disabled={selectedIndex === activeRoutes.length - 1}
              onPress={() => moveItemToIndex(selectedIndex, selectedIndex + 1)}
              style={[
                styles.moveBtn,
                {
                  borderColor: c.border,
                  opacity: selectedIndex === activeRoutes.length - 1 ? 0.4 : 1,
                },
              ]}
            >
              <Text style={{ color: c.textPrimary, fontSize: 11, fontWeight: '700' }}>
                {copy('Kanan', 'Right')}
              </Text>
              <MaterialIcons name="chevron-right" size={18} color={c.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={copy('Taruh di paling kanan', 'Move to rightmost')}
              disabled={selectedIndex === activeRoutes.length - 1}
              onPress={() => moveItemToIndex(selectedIndex, activeRoutes.length - 1)}
              style={[
                styles.moveBtn,
                {
                  borderColor: c.border,
                  opacity: selectedIndex === activeRoutes.length - 1 ? 0.4 : 1,
                },
              ]}
            >
              <Text style={{ color: c.textPrimary, fontSize: 11, fontWeight: '700' }}>
                {copy('Paling Kanan', 'Far Right')}
              </Text>
              <MaterialIcons name="last-page" size={18} color={c.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.editFooterActions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={copy('Ganti dengan menu lain', 'Replace with another menu')}
              onPress={() => setShowPickerModal(true)}
              style={[styles.replaceBtn, { borderColor: accentColor }]}
            >
              <MaterialIcons name="apps" size={16} color={accentColor} />
              <Text style={{ color: accentColor, fontSize: 12, fontWeight: '700' }}>
                {copy('Ganti Menu Lainnya…', 'Replace with Another Menu…')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={copy('Reset pintasan ke awal', 'Reset shortcuts to default')}
              onPress={() => {
                triggerHaptic('light');
                saveRoutes([...DEFAULT_DASHBOARD_SHORTCUTS]);
                setSelectedIndex(0);
              }}
              style={styles.resetBtn}
            >
              <Text style={{ color: c.textSecondary, fontSize: 11, fontWeight: '600' }}>
                {copy('Reset Default', 'Reset')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Full Menu Picker Modal */}
      <Modal
        visible={showPickerModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPickerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowPickerModal(false)}
          />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: c.bgSecondary || c.bgCard,
                paddingBottom: Math.max(bottomInset, 20) + 12,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.textPrimary, fontSize: 18, fontWeight: '800' }}>
                  {copy('Kustomisasi Pintasan Menu', 'Customize Menu Shortcuts')}
                </Text>
                <Text style={{ color: c.textSecondary, fontSize: 12, marginTop: 2 }}>
                  {copy(
                    'Pilih slot posisi (1 = Paling Kiri, 5 = Paling Kanan), lalu ketuk menu di bawah untuk menggantinya.',
                    'Select a slot (1 = Far Left, 5 = Far Right), then tap any menu below to assign it.'
                  )}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={copy('Tutup kustomisasi pintasan', 'Close shortcut customizer')}
                onPress={() => setShowPickerModal(false)}
                style={styles.closeIconBtn}
              >
                <MaterialIcons name="close" size={22} color={c.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Current 5 Slots Preview Bar */}
            <View
              style={[
                styles.modalSlotsBar,
                { backgroundColor: c.bgPrimary, borderColor: c.border },
              ]}
            >
              {activeRoutes.map((route, idx) => {
                const m = getMenu(route);
                const active = idx === selectedIndex;
                return (
                  <TouchableOpacity
                    key={route + idx}
                    accessibilityRole="button"
                    onPress={() => setSelectedIndex(idx)}
                    style={[
                      styles.modalSlotItem,
                      active && {
                        backgroundColor: isDark ? '#1E3A2B' : '#E7F0E4',
                        borderColor: accentColor,
                        borderWidth: 1.5,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: active ? accentColor : c.textSecondary,
                      }}
                    >
                      #{idx + 1}
                    </Text>
                    <MaterialIcons
                      name={m.icon as any}
                      size={20}
                      color={active ? accentColor : c.textPrimary}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '700',
                        color: active ? accentColor : c.textPrimary,
                      }}
                      numberOfLines={1}
                    >
                      {getLabel(m)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quick Reorder for Selected Slot inside Modal */}
            <View style={[styles.moveRow, { marginBottom: 12 }]}>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={selectedIndex === 0}
                onPress={() => moveItemToIndex(selectedIndex, 0)}
                style={[
                  styles.moveBtn,
                  { borderColor: c.border, opacity: selectedIndex === 0 ? 0.4 : 1 },
                ]}
              >
                <MaterialIcons name="first-page" size={16} color={c.textPrimary} />
                <Text style={{ color: c.textPrimary, fontSize: 11, fontWeight: '700' }}>
                  {copy('Paling Kiri', 'Far Left')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={selectedIndex === 0}
                onPress={() => moveItemToIndex(selectedIndex, selectedIndex - 1)}
                style={[
                  styles.moveBtn,
                  { borderColor: c.border, opacity: selectedIndex === 0 ? 0.4 : 1 },
                ]}
              >
                <MaterialIcons name="chevron-left" size={16} color={c.textPrimary} />
                <Text style={{ color: c.textPrimary, fontSize: 11, fontWeight: '700' }}>
                  {copy('Geser Kiri', 'Left')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={selectedIndex === activeRoutes.length - 1}
                onPress={() => moveItemToIndex(selectedIndex, selectedIndex + 1)}
                style={[
                  styles.moveBtn,
                  {
                    borderColor: c.border,
                    opacity: selectedIndex === activeRoutes.length - 1 ? 0.4 : 1,
                  },
                ]}
              >
                <Text style={{ color: c.textPrimary, fontSize: 11, fontWeight: '700' }}>
                  {copy('Geser Kanan', 'Right')}
                </Text>
                <MaterialIcons name="chevron-right" size={16} color={c.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={selectedIndex === activeRoutes.length - 1}
                onPress={() => moveItemToIndex(selectedIndex, activeRoutes.length - 1)}
                style={[
                  styles.moveBtn,
                  {
                    borderColor: c.border,
                    opacity: selectedIndex === activeRoutes.length - 1 ? 0.4 : 1,
                  },
                ]}
              >
                <Text style={{ color: c.textPrimary, fontSize: 11, fontWeight: '700' }}>
                  {copy('Paling Kanan', 'Far Right')}
                </Text>
                <MaterialIcons name="last-page" size={16} color={c.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 340 }}
              contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
            >
              {ALL_SHORTCUT_MENUS.map(menu => {
                const slotPos = activeRoutes.indexOf(menu.route);
                const isCurrentSlot = slotPos === selectedIndex;
                return (
                  <TouchableOpacity
                    key={menu.route}
                    accessibilityRole="button"
                    onPress={() => swapOrReplaceSlot(selectedIndex, menu.route)}
                    style={[
                      styles.menuOptionRow,
                      {
                        backgroundColor: isCurrentSlot
                          ? isDark
                            ? '#1E3A2B'
                            : '#EDF3EA'
                          : c.bgPrimary,
                        borderColor: isCurrentSlot ? accentColor : c.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.menuOptionIcon,
                        { backgroundColor: c.bgCard, borderColor: c.border },
                      ]}
                    >
                      <MaterialIcons name={menu.icon as any} size={22} color={c.textPrimary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.textPrimary, fontSize: 14, fontWeight: '700' }}>
                        {getLabel(menu)}
                      </Text>
                      <Text style={{ color: c.textSecondary, fontSize: 12 }}>
                        {getDesc(menu)}
                      </Text>
                    </View>
                    {slotPos !== -1 ? (
                      <View
                        style={[
                          styles.assignedBadge,
                          {
                            backgroundColor: isCurrentSlot ? accentColor : goldColor + '22',
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: isCurrentSlot ? '#FFFFFF' : goldColor,
                            fontSize: 11,
                            fontWeight: '800',
                          }}
                        >
                          {copy(`Posisi #${slotPos + 1}`, `Slot #${slotPos + 1}`)}
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.useMenuBtn,
                          { borderColor: accentColor },
                        ]}
                      >
                        <Text style={{ color: accentColor, fontSize: 11, fontWeight: '700' }}>
                          {copy(`Pakai di #${selectedIndex + 1}`, `Use in #${selectedIndex + 1}`)}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 20,
  },
  shortcuts: {
    flexDirection: 'row',
    gap: 4,
  },
  shortcut: {
    minWidth: 48,
    minHeight: 72,
    alignItems: 'center',
    gap: 8,
  },
  shortcutIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  customizeHintRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  customizePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  editPanel: {
    marginTop: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  editHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  doneBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  moveRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  moveBtn: {
    flex: 1,
    minWidth: 68,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 6,
  },
  editFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  replaceBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  resetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 25, 20, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  closeIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSlotsBar: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    marginBottom: 10,
  },
  modalSlotItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
    gap: 4,
  },
  menuOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  menuOptionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  useMenuBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
});
