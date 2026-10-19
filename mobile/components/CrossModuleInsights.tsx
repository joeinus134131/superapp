import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../lib/theme';
import { CONFIG } from '../lib/config';
import { getData, STORAGE_KEYS } from '../lib/storage';
import { useLanguage } from "../context/languageContext";


interface CrossModuleInsightsProps {
  isDark: boolean;
}

export function CrossModuleInsights({ isDark }: CrossModuleInsightsProps) {
  const { tx: translateCopy } = useLanguage();
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const c = useColors(isDark);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      const token = await getData(STORAGE_KEYS.SESSION_TOKEN);
      if (!token) {
        setInsights([]);
        setLoading(false);
        return;
      }
      const res = await fetch(`${CONFIG.API_URL}/insights`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const json = await res.json();
        setInsights(json.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch insights', e);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    setLoading(true);
    try {
      const token = await getData(STORAGE_KEYS.SESSION_TOKEN);
      if (!token) {
        setLoading(false);
        return;
      }
      await fetch(`${CONFIG.API_URL}/insights/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      await fetchInsights();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  if (loading && insights.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        <ActivityIndicator color="#52745a" style={{ marginBottom: 8 }} />
        <Text style={{ color: c.textSecondary }}>{translateCopy("Sedang menganalisis pola hidupmu...")}</Text>
      </View>
    );
  }

  if (insights.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: c.bgCard, borderColor: c.border, borderStyle: 'dashed' }]}>
        <MaterialIcons name="auto-awesome" size={32} color="#52745a" style={{ marginBottom: 8 }} />
        <Text style={[styles.title, { color: c.textPrimary, marginBottom: 4 }]}>{translateCopy("Personal Intelligence")}</Text>
        <Text style={{ color: c.textSecondary, textAlign: 'center', marginBottom: 16, fontSize: 14 }}>
          {translateCopy("Belum ada insight. AI kami butuh lebih banyak data aktivitasmu.")}
        </Text>
        <TouchableOpacity style={styles.button} onPress={generateInsights}>
          <Text style={styles.buttonText}>{translateCopy("Analisis Sekarang")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialIcons name="auto-awesome" size={20} color="#52745a" style={{ marginRight: 8 }} />
          <Text style={[styles.title, { color: c.textPrimary }]}>{translateCopy("Intelligence Feed")}</Text>
        </View>
        <TouchableOpacity onPress={generateInsights}>
          <Text style={{ color: '#52745a', fontWeight: 'bold', fontSize: 12 }}>{translateCopy("Update")}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ gap: 12 }}>
        {insights.map(insight => {
          let borderColor = '#52745a';
          let iconName = 'lightbulb';
          if (insight.insight_type === 'warning') {
            borderColor = '#ef4444';
            iconName = 'warning';
          } else if (insight.insight_type === 'praise') {
            borderColor = '#10b981';
            iconName = 'emoji-events';
          }

          return (
            <View key={insight.id} style={[styles.insightCard, { backgroundColor: c.bgCard, borderLeftColor: borderColor }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <MaterialIcons name={iconName as any} size={24} color={borderColor} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.textPrimary, fontSize: 15, lineHeight: 22 }}>
                    {insight.content}
                  </Text>
                  <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'center' }}>
                    {insight.related_modules && insight.related_modules.split(',').map((m: string) => (
                      <View key={m} style={styles.badge}>
                        <Text style={{ color: c.textSecondary, fontSize: 11, textTransform: 'capitalize' }}>{m.trim()}</Text>
                      </View>
                    ))}
                    <Text style={{ color: c.textMuted, fontSize: 11, marginLeft: 'auto' }}>
                      {translateCopy("Keyakinan:")} {insight.confidence_score}%
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: 'rgba(25, 63, 48, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(25, 63, 48, 0.3)',
  },
  buttonText: {
    color: '#52745a',
    fontWeight: 'bold',
  },
  insightCard: {
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  badge: {
    backgroundColor: 'rgba(128,128,128,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 6,
  }
});
