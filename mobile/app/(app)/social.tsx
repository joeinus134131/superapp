import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Image, StyleSheet, RefreshControl, Dimensions,
  Modal, TextInput
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { useMobileLayout } from '../../lib/layout';
import { useLanguage } from '../../context/languageContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { getData, STORAGE_KEYS } from '../../lib/storage';
import { CONFIG } from '../../lib/config';
import { useRouter } from 'expo-router';
import axios from 'axios';

const { width } = Dimensions.get('window');

const getStyles = (c: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1 },
  headerIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: 28, fontWeight: '900' },
  pageSubtitle: { fontSize: 14, marginTop: 2 },
  
  tabWrapper: { flexDirection: 'row', paddingHorizontal: 24, gap: 12, marginVertical: 20 },
  tab: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: 'transparent', backgroundColor: 'rgba(150,150,150,0.05)' },
  tabText: { fontSize: 13, fontWeight: '800' },
  
  content: { paddingHorizontal: 24 },
  podiumContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', marginVertical: 30, gap: 16 },
  podiumItem: { alignItems: 'center', width: (width - 80) / 3 },
  podiumAvatarWrapper: { position: 'relative', marginBottom: 12 },
  podiumAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(150,150,150,0.1)' },
  podiumInitial: { fontSize: 24, fontWeight: '900', color: 'rgba(150,150,150,0.5)' },
  rankBadge: { position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
  rankText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  podiumName: { fontSize: 13, fontWeight: '800', textAlign: 'center', marginBottom: 2 },
  podiumXP: { fontSize: 12, fontWeight: '700' },

  listWrapper: { gap: 12, marginTop: 20 },
  friendCard: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  rankNumberBox: { width: 24, alignItems: 'center' },
  rankNumber: { fontSize: 14, fontWeight: '900' },
  avatarMini: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(150,150,150,0.1)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  avatarInitial: { fontSize: 18, fontWeight: '900' },
  onlineDot: { position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#000' },
  friendName: { fontSize: 15, fontWeight: '800' },
  friendTask: { fontSize: 12, fontWeight: '600' },
  friendStats: { alignItems: 'flex-end' },
  friendXP: { fontSize: 14, fontWeight: '900' },
  friendLevel: { fontSize: 10, fontWeight: '800' },

  emptySquad: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '900', marginTop: 24 },
  emptyDesc: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 12, opacity: 0.7, lineHeight: 22 },
  createBtn: { marginTop: 32, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 20, elevation: 4 },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  version: { textAlign: 'center', color: c.textMuted, fontSize: 11, fontWeight: '700', marginTop: 10 },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalContent: { width: '100%', borderRadius: 28, padding: 28, elevation: 20 },
  modalTitle: { fontSize: 24, fontWeight: '900', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, fontWeight: '600', marginBottom: 24, opacity: 0.8 },
  
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 10, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
  input: { borderRadius: 16, padding: 16, fontSize: 16, borderWidth: 1, fontWeight: '700' },
  
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  modalBtn: { flex: 1, paddingVertical: 16, borderRadius: 18, alignItems: 'center' },
});

interface Friend {
  user_id: string;
  name: string;
  level: number;
  total_xp: number;
  isOnline?: boolean;
  avatar?: string;
  currentTask?: string;
}

export default function SocialScreen() {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();
  const { t } = useLanguage();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'squads'>('leaderboard');
  const [leaderboard, setLeaderboard] = useState<Friend[]>([]);
  const [squads, setSquads] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [squadName, setSquadName] = useState('');
  const [squadDesc, setSquadDesc] = useState('');

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getData(STORAGE_KEYS.SESSION_TOKEN);
      const response = await axios.get(`${CONFIG.API_URL}/social/leaderboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data?.data) {
        setLeaderboard(response.data.data);
      }
    } catch (e) {
      console.error('[Social] Gagal ambil leaderboard:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSquads = useCallback(async () => {
    try {
      const token = await getData(STORAGE_KEYS.SESSION_TOKEN);
      const response = await axios.get(`${CONFIG.API_URL}/social/squads`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data?.data) {
        setSquads(response.data.data);
      }
    } catch (e) {
      console.error('[Social] Gagal ambil squads:', e);
    }
  }, []);

  const handleCreateSquad = async () => {
    if (!squadName.trim()) return;
    setLoading(true);
    try {
      const token = await getData(STORAGE_KEYS.SESSION_TOKEN);
      await axios.post(`${CONFIG.API_URL}/social/squads`, {
        name: squadName,
        description: squadDesc
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowCreateModal(false);
      setSquadName('');
      setSquadDesc('');
      fetchSquads();
    } catch (e) {
      console.error('[Social] Gagal bikin squad:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'leaderboard') fetchLeaderboard();
    else fetchSquads();
  }, [activeTab, fetchLeaderboard, fetchSquads]);

  const onRefresh = useCallback(() => {
    if (activeTab === 'leaderboard') fetchLeaderboard();
    else fetchSquads();
  }, [activeTab, fetchLeaderboard, fetchSquads]);

  const top3 = leaderboard.slice(0, 3);
  const others = leaderboard.slice(3);

  const styles = getStyles(c, isDark);

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.pageHeader, { borderBottomColor: c.border, paddingTop: layout.topPadding }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.headerIconBox, { backgroundColor: c.blue + '15' }]}>
            <MaterialIcons name="groups" size={24} color={c.blue} />
          </View>
          <View>
            <Text style={[styles.pageTitle, { color: c.textPrimary }]}>Social Hub</Text>
            <Text style={[styles.pageSubtitle, { color: c.textSecondary }]}>Connect & Compete with your Squad</Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={c.purple} />}
        contentContainerStyle={{ paddingBottom: layout.bottomPadding + 100 }}
      >
        {/* Tabs */}
        <View style={styles.tabWrapper}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'leaderboard' && { backgroundColor: c.purple + '15', borderColor: c.purple }]} 
            onPress={() => setActiveTab('leaderboard')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'leaderboard' ? c.purple : c.textMuted }]}>Global Leaderboard</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'squads' && { backgroundColor: c.purple + '15', borderColor: c.purple }]} 
            onPress={() => setActiveTab('squads')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'squads' ? c.purple : c.textMuted }]}>My Squads</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'leaderboard' ? (
          <View style={styles.content}>
            {/* Top 3 Podium */}
            <View style={styles.podiumContainer}>
              {/* Rank 2 */}
              {top3[1] && (
                <View style={[styles.podiumItem, { marginTop: 24 }]}>
                  <View style={styles.podiumAvatarWrapper}>
                    <View style={[styles.podiumAvatar, { borderColor: '#94a3b8' }]}>
                      <Text style={styles.podiumInitial}>{top3[1].name.charAt(0)}</Text>
                    </View>
                    <View style={[styles.rankBadge, { backgroundColor: '#94a3b8' }]}>
                      <Text style={styles.rankText}>2</Text>
                    </View>
                  </View>
                  <Text style={[styles.podiumName, { color: c.textPrimary }]}>{top3[1].name}</Text>
                  <Text style={[styles.podiumXP, { color: c.textMuted }]}>{Math.round(top3[1].total_xp / 1000)}k XP</Text>
                </View>
              )}

              {/* Rank 1 */}
              {top3[0] && (
                <View style={styles.podiumItem}>
                  <View style={styles.podiumAvatarWrapper}>
                    <View style={[styles.podiumAvatar, { borderColor: '#fbbf24', width: 80, height: 80, borderRadius: 40 }]}>
                      <Text style={[styles.podiumInitial, { fontSize: 32 }]}>{top3[0].name.charAt(0)}</Text>
                    </View>
                    <View style={[styles.rankBadge, { backgroundColor: '#fbbf24', width: 28, height: 28 }]}>
                      <MaterialIcons name="emoji-events" size={16} color="#fff" />
                    </View>
                  </View>
                  <Text style={[styles.podiumName, { color: c.textPrimary, fontSize: 16, fontWeight: '900' }]}>{top3[0].name}</Text>
                  <Text style={[styles.podiumXP, { color: '#fbbf24', fontWeight: '900' }]}>{Math.round(top3[0].total_xp / 1000)}k XP</Text>
                </View>
              )}

              {/* Rank 3 */}
              {top3[2] && (
                <View style={[styles.podiumItem, { marginTop: 40 }]}>
                  <View style={styles.podiumAvatarWrapper}>
                    <View style={[styles.podiumAvatar, { borderColor: '#b45309' }]}>
                      <Text style={styles.podiumInitial}>{top3[2].name.charAt(0)}</Text>
                    </View>
                    <View style={[styles.rankBadge, { backgroundColor: '#b45309' }]}>
                      <Text style={styles.rankText}>3</Text>
                    </View>
                  </View>
                  <Text style={[styles.podiumName, { color: c.textPrimary }]}>{top3[2].name}</Text>
                  <Text style={[styles.podiumXP, { color: c.textMuted }]}>{Math.round(top3[2].total_xp / 1000)}k XP</Text>
                </View>
              )}
            </View>

            {/* List Leaderboard Remaining */}
            <View style={styles.listWrapper}>
              {others.map((friend, index) => (
                <Card key={friend.user_id} style={styles.friendCard}>
                  <View style={styles.rankNumberBox}>
                    <Text style={[styles.rankNumber, { color: c.textMuted }]}>{index + 4}</Text>
                  </View>
                  <View style={styles.avatarMini}>
                    <Text style={[styles.avatarInitial, { color: c.purple }]}>{friend.name.charAt(0)}</Text>
                    {friend.isOnline && <View style={styles.onlineDot} />}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.friendName, { color: c.textPrimary }]}>{friend.name}</Text>
                    <Text style={[styles.friendTask, { color: c.textMuted }]} numberOfLines={1}>
                      {friend.currentTask || 'Sedang Fokus'}
                    </Text>
                  </View>
                  <View style={styles.friendStats}>
                    <Text style={[styles.friendXP, { color: c.purple }]}>{friend.total_xp}</Text>
                    <Text style={[styles.friendLevel, { color: c.textMuted }]}>Lv.{friend.level}</Text>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.content}>
            {squads.length > 0 ? (
              <View style={styles.listWrapper}>
                {squads.map((squad) => (
                  <TouchableOpacity key={squad.id} activeOpacity={0.8} onPress={() => router.push(`/squad/${squad.id}`)}>
                    <Card style={styles.friendCard}>
                      <View style={[styles.avatarMini, { backgroundColor: c.blue + '15' }]}>
                        <MaterialIcons name="groups" size={24} color={c.blue} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={[styles.friendName, { color: c.textPrimary }]}>{squad.name}</Text>
                        <Text style={[styles.friendTask, { color: c.textMuted }]} numberOfLines={1}>
                          {squad.description || 'No description'}
                        </Text>
                      </View>
                      <View style={styles.friendStats}>
                        <Text style={[styles.friendXP, { color: c.blue }]}>{squad.member_count}</Text>
                        <Text style={[styles.friendLevel, { color: c.textMuted }]}>Members</Text>
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity 
                  style={[styles.createBtn, { backgroundColor: c.purple, marginTop: 20, width: '100%' }]}
                  onPress={() => setShowCreateModal(true)}
                >
                  <Text style={styles.createBtnText}>Bikin Squad Lain</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptySquad}>
                <MaterialIcons name="group-add" size={64} color={c.textMuted} />
                <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>Belum punya Squad?</Text>
                <Text style={[styles.emptyDesc, { color: c.textSecondary }]}>Bikin komunitas lo sendiri dan mulai kompetisi sehat hari ini!</Text>
                <TouchableOpacity 
                  style={[styles.createBtn, { backgroundColor: c.purple }]}
                  onPress={() => setShowCreateModal(true)}
                >
                  <Text style={styles.createBtnText}>Bikin Squad Baru</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Create Squad Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[styles.modalContent, { backgroundColor: c.bgCard, borderColor: c.border, borderWidth: 1 }]}>
            <Text style={[styles.modalTitle, { color: c.textPrimary }]}>Bikin Squad Baru</Text>
            <Text style={[styles.modalSubtitle, { color: c.textSecondary }]}>Bangun komunitas produktivitasmu sendiri.</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: c.textMuted }]}>NAMA SQUAD</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border }]}
                placeholder="Contoh: Pejuang Subuh"
                placeholderTextColor={c.textMuted}
                value={squadName}
                onChangeText={setSquadName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: c.textMuted }]}>DESKRIPSI (OPSIONAL)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.bgInput, color: c.textPrimary, borderColor: c.border, height: 80, textAlignVertical: 'top' }]}
                placeholder="Apa visi squad kamu?"
                placeholderTextColor={c.textMuted}
                value={squadDesc}
                onChangeText={setSquadDesc}
                multiline
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtn, { borderColor: c.border, borderWidth: 1 }]} 
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={{ color: c.textSecondary, fontWeight: '700' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: c.purple }]} 
                onPress={handleCreateSquad}
                disabled={!squadName.trim() || loading}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>{loading ? 'Membuat...' : 'Bikin Squad'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
