import { localDate } from '@superapp/shared/insights';
import { EncryptedStorage } from '../lib/secureStorage';
import React, { useState, useRef, useEffect } from 'react';
import { Modal, View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Dimensions, Animated, KeyboardAvoidingView, Platform, Keyboard, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { getData, setData, STORAGE_KEYS } from '../lib/storage';
import { CONFIG } from '../lib/config';
import { useColors } from '../lib/theme';
import * as Haptics from 'expo-haptics';
import { useLanguage } from "../context/languageContext";
import { statusAlert } from '../lib/statusAlert';


interface QuickCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
}

export function QuickCaptureModal({ visible, onClose, isDark }: QuickCaptureModalProps) {
  const { tx: translateCopy } = useLanguage();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const c = useColors(isDark);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!query.trim()) return;

    setLoading(true);
    Keyboard.dismiss();
    try {
      const token = await getData(STORAGE_KEYS.SESSION_TOKEN);
      if (!token) {
        // Fallback: save locally as a task if unauthenticated or offline
        await handleParsedData({ module: translateCopy("task"), data: { title: query.trim(), priority: 'P3' } });
        onClose();
        return;
      }
      const res = await fetch(`${CONFIG.API_URL}/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: query })
      });

      if (!res.ok) throw new Error(translateCopy("Gagal memproses NLP"));
      const parsed = await res.json();

      await handleParsedData(parsed);
      onClose();
    } catch (err: any) {
      // Fallback: save locally as a task if NLP parse fails
      await handleParsedData({ module: translateCopy("task"), data: { title: query.trim(), priority: 'P3' } });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleParsedData = async (parsed: any) => {
    const { module, data } = parsed;

    if (module === 'finance') {
      const txId = 'tx_' + Date.now();
      let txs = await EncryptedStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (!Array.isArray(txs)) txs = [];
      txs.push({
        id: txId,
        ...data,
        date: new Date().toISOString()
      });
      await EncryptedStorage.setItem(STORAGE_KEYS.TRANSACTIONS, txs);
      statusAlert.success(
        translateCopy("Transaksi Dicatat"),
        translateCopy("{0} tercatat di Keuangan.", [data.description || translateCopy("Pengeluaran")])
      );
    } else if (module === 'task') {
      const taskId = 't_' + Date.now();
      let tasks = await getData(STORAGE_KEYS.TASKS);
      if (!Array.isArray(tasks)) tasks = [];
      tasks.push({
        id: taskId,
        ...data,
        status: data.status || 'todo',
        category: data.category || translateCopy("Personal"),
        completed: false,
        createdAt: new Date().toISOString()
      });
      await setData(STORAGE_KEYS.TASKS, tasks);
      statusAlert.success(
        translateCopy("Tugas Ditambahkan"),
        translateCopy("\"{0}\" telah masuk ke daftar tugas.", [data.title || query])
      );
    } else if (module === 'journal') {
      const journalId = 'j_' + Date.now();
      let journals = await EncryptedStorage.getItem(STORAGE_KEYS.JOURNAL);
      if (!Array.isArray(journals)) journals = [];
      journals.push({
        id: journalId,
        title: data.title || (data.entry || query).slice(0, 70),
        content: data.entry || query,
        mood: data.mood || 'good',
        tags: [],
        date: localDate(),
        createdAt: new Date().toISOString()
      });
      await EncryptedStorage.setItem(STORAGE_KEYS.JOURNAL, journals);
      statusAlert.success(
        translateCopy("Jurnal Disimpan"),
        translateCopy("Refleksimu telah tersimpan dengan aman.")
      );
    } else {
      statusAlert.info('Info', translateCopy("Modul {0} belum didukung.", [module]));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <BlurView intensity={25} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
            <View
              style={[styles.sheetContainer, { backgroundColor: c.bgCard, borderColor: c.border }]}
              onStartShouldSetResponder={() => true}
            >
              {/* Sheet Grab Handle */}
              <View style={[styles.dragHandle, { backgroundColor: c.border }]} />

              {/* Sheet Header */}
              <View style={styles.sheetHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[styles.headerIconCircle, { backgroundColor: c.purple + '18' }]}>
                    <MaterialIcons name="bolt" size={22} color={c.purple} />
                  </View>
                  <View>
                    <Text style={[styles.sheetTitle, { color: c.textPrimary }]}>{translateCopy("Aksi Cepat")}</Text>
                    <Text style={[styles.sheetSubtitle, { color: c.textSecondary }]}>{translateCopy("Catat cerdas atau pilih menu langsung")}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: c.bgInput }]}>
                  <MaterialIcons name="close" size={20} color={c.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* AI Smart Input Bar */}
              <View style={[styles.smartInputBox, { backgroundColor: c.bgInput, borderColor: c.border }]}>
                <MaterialIcons name="auto-awesome" size={20} color={c.purple} style={{ marginRight: 10 }} />
                <TextInput
                  ref={inputRef}
                  style={[styles.input, { color: c.textPrimary }]}
                  placeholder={translateCopy("Ketik apa saja... misal: 'Beli kopi 25rb' atau 'Meeting jam 2'")}
                  placeholderTextColor={c.textMuted}
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={handleSubmit}
                  returnKeyType="send"
                  editable={!loading}
                />
                {loading ? (
                  <ActivityIndicator color={c.purple} style={{ marginLeft: 8 }} />
                ) : (
                  <TouchableOpacity
                    onPress={handleSubmit}
                    style={[styles.sendBtn, { backgroundColor: query.trim() ? c.purple : c.border }]}
                    disabled={!query.trim()}
                  >
                    <MaterialIcons name="arrow-upward" size={18} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>

              {loading && (
                <Text style={[styles.loadingText, { color: c.purple }]}>
                  {translateCopy("Memproses dengan AI Whenya...")}
                </Text>
              )}

              {/* Quick Actions Grid (6 Tiles matching Mockup Image 2) */}
              <Text style={[styles.gridTitle, { color: c.textMuted }]}>{translateCopy("PILIHAN AKSI")}</Text>
              <View style={styles.actionGrid}>
                {[
                  {
                    icon: 'check-circle-outline',
                    label: translateCopy("Tambah Tugas"),
                    desc: translateCopy("Rencana hal baru"),
                    color: c.purple,
                    route: '/(app)/tasks',
                  },
                  {
                    icon: 'account-balance-wallet',
                    label: translateCopy("Catat Transaksi"),
                    desc: translateCopy("Kelola kas & saldo"),
                    color: '#10b981',
                    route: '/(app)/finance',
                  },
                  {
                    icon: 'local-fire-department',
                    label: translateCopy("Buat Kebiasaan"),
                    desc: translateCopy("Bangun rutinitas"),
                    color: '#f59e0b',
                    route: '/(app)/habits',
                  },
                  {
                    icon: 'auto-stories',
                    label: translateCopy("Tulis Jurnal"),
                    desc: translateCopy("Refleksi hari ini"),
                    color: '#ec4899',
                    route: '/(app)/journal',
                  },
                  {
                    icon: 'track-changes',
                    label: translateCopy("Tambah Tujuan"),
                    desc: translateCopy("Target hidup baru"),
                    color: '#3b82f6',
                    route: '/(app)/goals',
                  },
                  {
                    icon: 'calendar-today',
                    label: translateCopy("Buat Event"),
                    desc: translateCopy("Jadwalkan agenda"),
                    color: '#6366f1',
                    route: '/(app)/calendar',
                  },
                ].map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.actionTile, { backgroundColor: c.bgInput, borderColor: c.border }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onClose();
                      const { router } = require('expo-router');
                      router.push(item.route);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.tileIconBox, { backgroundColor: item.color + '18' }]}>
                      <MaterialIcons name={item.icon as any} size={22} color={item.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tileLabel, { color: c.textPrimary }]} numberOfLines={1}>{item.label}</Text>
                      <Text style={[styles.tileDesc, { color: c.textMuted }]} numberOfLines={1}>{item.desc}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </BlurView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheetContainer: {
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smartInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 54,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 4,
  },
  gridTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 18,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionTile: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  tileIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  tileDesc: {
    fontSize: 10,
    marginTop: 2,
  },
});
