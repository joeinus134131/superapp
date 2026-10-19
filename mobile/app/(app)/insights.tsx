import React, { useCallback, useState } from 'react';
import { ScrollView, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { summarizeLife } from '@superapp/shared/insights';
import { EncryptedStorage } from '../../lib/secureStorage';
import { getData, STORAGE_KEYS } from '../../lib/storage';
import { useTheme } from '../../context/themeContext';
import { useColors } from '../../lib/theme';
import { useMobileLayout } from '../../lib/layout';
import { WhenyaHeader } from '../../components/WhenyaHeader';
import { useLanguage } from "../../context/languageContext";


export default function InsightsScreen() {
  const { tx: translateCopy } = useLanguage();
  const { language: uiLanguage } = useLanguage();

  const { isDark } = useTheme();
  const c = useColors(isDark);
  const layout = useMobileLayout();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState(false);
  const [days, setDays] = useState(7);
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    setError(false);
    Promise.all([getData(STORAGE_KEYS.TASKS), getData(STORAGE_KEYS.HABITS), getData(STORAGE_KEYS.GOALS), EncryptedStorage.getItem(STORAGE_KEYS.TRANSACTIONS)])
      .then(([tasks, habits, goals, transactions]) => { if (active) setData({ tasks: tasks || [], habits: habits || [], goals: goals || [], transactions: transactions || [] }); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [attempt]));

  const summary = data ? summarizeLife(data, new Date(), days) : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.bgPrimary }}>
      <WhenyaHeader
        title={translateCopy("Insight Pribadi")}
        subtitle={translateCopy("Analisis progres dan konsistensi hidupmu")}
        showBack={router.canGoBack()}
        tabs={[
          { key: '7', label: translateCopy("7 Hari") },
          { key: '30', label: translateCopy("30 Hari") },
        ]}
        activeTab={String(days)}
        onTabChange={(k) => setDays(Number(k))}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bgPrimary }}
        contentContainerStyle={{ padding: 20, paddingTop: 14, paddingBottom: layout.bottomPadding + 40 }}
      >
        {error ? (
          <Pressable accessibilityRole="button" onPress={() => setAttempt(n => n + 1)}>
            <Text style={{ color: c.red }}>{translateCopy("Belum dapat memuat ringkasan. Ketuk untuk mencoba lagi.")}</Text>
          </Pressable>
        ) : !summary ? (
          <ActivityIndicator color="#193F30" style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: translateCopy("Tugas selesai"), value: `${summary.taskRate}%`, href: '/(app)/tasks', color: '#193F30' },
                { label: translateCopy("Konsistensi habit"), value: `${summary.habitRate}%`, href: '/(app)/habits', color: '#397353' },
                { label: translateCopy("Progres tujuan"), value: `${summary.goalRate}%`, href: '/(app)/goals', color: '#B38B4D' },
              ].map(item => (
                <Pressable
                  key={item.href}
                  accessibilityRole="button"
                  onPress={() => router.push(item.href as any)}
                  style={{
                    flexGrow: 1,
                    minWidth: '45%',
                    borderRadius: 18,
                    backgroundColor: c.bgCard,
                    padding: 18,
                    borderWidth: 1,
                    borderColor: c.border,
                  }}
                >
                  <Text style={{ fontSize: 28, fontWeight: '800', color: item.color }}>{item.value}</Text>
                  <Text style={{ color: c.textSecondary, marginTop: 4, fontSize: 13 }}>{item.label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={{ padding: 20, backgroundColor: c.bgCard, borderRadius: 18, marginTop: 18, borderColor: c.border, borderWidth: 1 }}>
              <Text style={{ color: c.textPrimary, fontSize: 17, fontWeight: '800', marginBottom: 14 }}>{translateCopy("Tren Kebiasaan (")}{days} {translateCopy("Hari)")}</Text>
              <View style={{ flexDirection: 'row', gap: 3, height: 130, alignItems: 'flex-end', marginBottom: 8 }}>
                {summary.habitTrend.map(day => (
                  <View key={day.date} accessible accessibilityLabel={translateCopy("{0}: {1} dari {2}", [day.date, day.completed, day.total])} style={{ flex: 1, height: 120, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#EBF0E9', justifyContent: 'flex-end', borderRadius: 4 }}>
                    <View style={{ height: `${day.rate}%`, backgroundColor: '#397353', borderRadius: 4 }} />
                  </View>
                ))}
              </View>
              <Text style={{ color: c.textSecondary, fontSize: 11, lineHeight: 16 }}>
                {translateCopy("Check-in dari kebiasaan yang dibuat pada tiap tanggal.")}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(app)/finance')}
              style={{ padding: 20, backgroundColor: c.bgCard, marginTop: 18, borderRadius: 18, borderColor: c.border, borderWidth: 1 }}
            >
              <Text style={{ color: c.textPrimary, fontSize: 17, fontWeight: '800' }}>{translateCopy("Keuangan Bulan Ini")}</Text>
              <Text style={{ color: '#193F30', marginTop: 10, fontSize: 13, fontWeight: '700' }}>
                {translateCopy("Pemasukan: Rp")} {summary.income.toLocaleString(uiLanguage === 'id' ? 'id-ID' : 'en-US')}
              </Text>
              <Text style={{ color: '#EF4444', marginTop: 4, fontSize: 13, fontWeight: '700' }}>
                {translateCopy("Pengeluaran: Rp")} {summary.expense.toLocaleString(uiLanguage === 'id' ? 'id-ID' : 'en-US')}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}
