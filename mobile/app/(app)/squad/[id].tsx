import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import axios from 'axios';
import { useTheme } from '../../../context/themeContext';
import { useColors } from '../../../lib/theme';
import { useMobileLayout } from '../../../lib/layout';
import { Card } from '../../../components/ui/Card';
import { getData, STORAGE_KEYS } from '../../../lib/storage';
import { CONFIG } from '../../../lib/config';

export default function SquadDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();
  
  const [loading, setLoading] = useState(true);
  const [squad, setSquad] = useState<any>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newChallenge, setNewChallenge] = useState({ title: '', target: '', xpStake: '100', endDate: '' });

  const fetchSquadDetails = useCallback(async () => {
    try {
      const token = await getData(STORAGE_KEYS.SESSION_TOKEN);
      const res = await axios.get(`${CONFIG.API_URL}/social/squads/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.data) {
        setSquad(res.data.data.squad);
      }
    } catch (e) {
      console.error('Failed to fetch squad details', e);
    }
  }, [id]);

  const fetchChallenges = useCallback(async () => {
    try {
      const token = await getData(STORAGE_KEYS.SESSION_TOKEN);
      const res = await axios.get(`${CONFIG.API_URL}/social/squads/${id}/challenges`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.data) {
        setChallenges(res.data.data);
      }
    } catch (e) {
      console.error('Failed to fetch challenges', e);
    }
  }, [id]);

  useEffect(() => {
    Promise.all([fetchSquadDetails(), fetchChallenges()]).finally(() => setLoading(false));
  }, [fetchSquadDetails, fetchChallenges]);

  const handleCreateChallenge = async () => {
    if (!newChallenge.title.trim() || !newChallenge.target.trim() || !newChallenge.endDate.trim()) return;
    try {
      const token = await getData(STORAGE_KEYS.SESSION_TOKEN);
      await axios.post(`${CONFIG.API_URL}/social/squads/${id}/challenges`, {
        title: newChallenge.title,
        description: '',
        target: parseInt(newChallenge.target, 10),
        xp_stake: parseInt(newChallenge.xpStake, 10),
        start_date: new Date().toISOString(),
        end_date: new Date(newChallenge.endDate).toISOString(),
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowCreate(false);
      setNewChallenge({ title: '', target: '', xpStake: '100', endDate: '' });
      fetchChallenges();
    } catch (e) {
      console.error('Failed to create challenge', e);
      Alert.alert('Error', 'Gagal membuat challenge');
    }
  };

  const handleUpdateProgress = async (challengeId: string) => {
    try {
      const token = await getData(STORAGE_KEYS.SESSION_TOKEN);
      await axios.post(`${CONFIG.API_URL}/social/challenges/${challengeId}/progress`, {
        increment: 1
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchChallenges();
    } catch (e) {
      console.error('Failed to update progress', e);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: c.bgPrimary, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={c.purple} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <View style={[styles.header, { borderBottomColor: c.border, paddingTop: layout.topPadding }]}>
        <TouchableOpacity style={[styles.backBtn, { borderColor: c.border }]} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={20} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.textPrimary }]}>{squad?.name || 'Squad Details'}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        <View style={[styles.summaryCard, { backgroundColor: c.blue + '10', borderColor: c.blue + '30' }]}>
          <Text style={[styles.squadDesc, { color: c.textSecondary }]}>{squad?.description || 'Tidak ada deskripsi.'}</Text>
          <View style={styles.membersRow}>
            <MaterialIcons name="groups" size={20} color={c.blue} />
            <Text style={{ color: c.blue, fontWeight: '700' }}>{squad?.member_count || 0} Members</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Active Challenges</Text>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: c.purple }]} onPress={() => setShowCreate(true)}>
            <MaterialIcons name="add" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>Create</Text>
          </TouchableOpacity>
        </View>

        {challenges.length === 0 ? (
          <View style={[styles.emptyState, { borderColor: c.border }]}>
            <MaterialIcons name="flag" size={48} color={c.textMuted} />
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>Belum ada tantangan aktif di squad ini.</Text>
          </View>
        ) : (
          challenges.map(chal => (
            <Card key={chal.id} style={styles.challengeCard}>
              <View style={styles.chalHeader}>
                <View>
                  <Text style={[styles.chalTitle, { color: c.textPrimary }]}>{chal.title}</Text>
                  <Text style={[styles.chalTarget, { color: c.textMuted }]}>Target: {chal.target}</Text>
                </View>
                <View style={[styles.stakeBadge, { backgroundColor: c.purple + '20' }]}>
                  <Text style={[styles.stakeText, { color: c.purple }]}>{chal.xp_stake} XP</Text>
                </View>
              </View>
              
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: c.textSecondary, marginBottom: 8 }}>Progress Kamu:</Text>
                <View style={[styles.progressTrack, { backgroundColor: c.bgInput }]}>
                  <View style={[styles.progressFill, { width: `50%`, backgroundColor: c.green }]} />
                </View>
                <TouchableOpacity 
                  style={[styles.updateBtn, { backgroundColor: c.green + '20' }]}
                  onPress={() => handleUpdateProgress(chal.id)}
                >
                  <Text style={{ color: c.green, fontWeight: '800', textAlign: 'center' }}>Update Progress (+1)</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Create Challenge Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[styles.modalContent, { backgroundColor: c.bgCard, borderColor: c.border, borderWidth: 1 }]}>
            <Text style={[styles.modalTitle, { color: c.textPrimary }]}>Buat Challenge</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: c.textMuted }]}>JUDUL TANTANGAN</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                placeholder="Contoh: Baca Buku 50 Halaman"
                placeholderTextColor={c.textMuted}
                value={newChallenge.title}
                onChangeText={(t) => setNewChallenge({...newChallenge, title: t})}
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: c.textMuted }]}>TARGET (ANGKA)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                  placeholder="Contoh: 50"
                  keyboardType="numeric"
                  placeholderTextColor={c.textMuted}
                  value={newChallenge.target}
                  onChangeText={(t) => setNewChallenge({...newChallenge, target: t})}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: c.textMuted }]}>XP STAKE</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                  placeholder="100"
                  keyboardType="numeric"
                  placeholderTextColor={c.textMuted}
                  value={newChallenge.xpStake}
                  onChangeText={(t) => setNewChallenge({...newChallenge, xpStake: t})}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: c.textMuted }]}>TANGGAL BERAKHIR</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={c.textMuted}
                value={newChallenge.endDate}
                onChangeText={(t) => setNewChallenge({...newChallenge, endDate: t})}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: c.border, borderWidth: 1 }]} onPress={() => setShowCreate(false)}>
                <Text style={{ color: c.textSecondary, fontWeight: '700' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: c.purple }]} onPress={handleCreateChallenge}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>Buat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1 },
  backBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  title: { fontSize: 18, fontWeight: '800' },
  
  summaryCard: { padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 24 },
  squadDesc: { fontSize: 14, fontWeight: '600', marginBottom: 12, lineHeight: 20 },
  membersRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  
  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, borderWidth: 1, borderStyle: 'dashed' },
  emptyText: { marginTop: 12, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  
  challengeCard: { padding: 20, marginBottom: 16 },
  chalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chalTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  chalTarget: { fontSize: 12, fontWeight: '600' },
  stakeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  stakeText: { fontSize: 12, fontWeight: '900' },
  
  progressTrack: { height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: '100%', borderRadius: 5 },
  updateBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', borderRadius: 28, padding: 24, elevation: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  rowInputs: { flexDirection: 'row', gap: 12 },
  inputLabel: { fontSize: 10, fontWeight: '900', marginBottom: 6, letterSpacing: 1 },
  input: { borderRadius: 12, padding: 14, fontSize: 14, borderWidth: 1, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
});
