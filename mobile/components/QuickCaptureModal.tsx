import React, { useState, useRef, useEffect } from 'react';
import { Modal, View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Dimensions, Animated, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { getData, setData, STORAGE_KEYS } from '../lib/storage';
import { CONFIG } from '../lib/config';
import { useColors } from '../lib/theme';
import * as Haptics from 'expo-haptics';

interface QuickCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  isDark: boolean;
}

export function QuickCaptureModal({ visible, onClose, isDark }: QuickCaptureModalProps) {
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
      const token = await getData(STORAGE_KEYS.SESSION_TOKEN) || 'dummy-token';
      const res = await fetch(`${CONFIG.API_URL}/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: query })
      });

      if (!res.ok) throw new Error('Gagal memproses NLP');
      const parsed = await res.json();
      
      await handleParsedData(parsed);
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleParsedData = async (parsed: any) => {
    const { module, data } = parsed;
    
    if (module === 'finance') {
      let txs = await getData(STORAGE_KEYS.TRANSACTIONS);
      if (!Array.isArray(txs)) txs = [];
      txs.push({
        id: 'tx_' + Date.now(),
        ...data,
        date: new Date().toISOString()
      });
      await setData(STORAGE_KEYS.TRANSACTIONS, txs);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      alert('Transaksi berhasil dicatat!');
    } else if (module === 'task') {
      let tasks = await getData(STORAGE_KEYS.TASKS);
      if (!Array.isArray(tasks)) tasks = [];
      tasks.push({
        id: 't_' + Date.now(),
        ...data,
        completed: false,
        createdAt: new Date().toISOString()
      });
      await setData(STORAGE_KEYS.TASKS, tasks);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      alert('Tugas berhasil ditambahkan!');
    } else if (module === 'journal') {
      let journals = await getData(STORAGE_KEYS.JOURNAL);
      if (!Array.isArray(journals)) journals = [];
      journals.push({
        id: 'j_' + Date.now(),
        content: data.entry,
        date: new Date().toISOString()
      });
      await setData(STORAGE_KEYS.JOURNAL, journals);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      alert('Jurnal berhasil disimpan!');
    } else {
      alert(`Berhasil diparsing ke modul ${module}, namun penyimpanan belum diimplementasi.`);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
            <View 
              style={[styles.modalContainer, { backgroundColor: c.bgCard, borderColor: c.border }]}
              onStartShouldSetResponder={() => true} // Prevent touch from bubbling to overlay
            >
              <View style={styles.inputContainer}>
                <Text style={{ fontSize: 24, marginRight: 12, opacity: 0.5 }}>✨</Text>
                <TextInput
                  ref={inputRef}
                  style={[styles.input, { color: c.textPrimary }]}
                  placeholder="Apa yang ingin dicatat? (Coba: 'beli kopi 20rb')"
                  placeholderTextColor={c.textMuted}
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={handleSubmit}
                  returnKeyType="send"
                  editable={!loading}
                />
                {loading ? (
                  <ActivityIndicator color="#8b5cf6" style={{ marginLeft: 12 }} />
                ) : (
                  <TouchableOpacity onPress={handleSubmit} style={{ marginLeft: 12 }}>
                    <MaterialIcons name="send" size={24} color="#8b5cf6" />
                  </TouchableOpacity>
                )}
              </View>
              {loading && (
                <Text style={[styles.loadingText, { color: c.textSecondary }]}>
                  Memproses dengan AI...
                </Text>
              )}
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: '20%',
  },
  modalContainer: {
    width: '90%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 18,
    paddingVertical: 8,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontStyle: 'italic',
  }
});
