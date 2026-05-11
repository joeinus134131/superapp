import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../lib/theme';
import { useTheme } from '../context/themeContext';
import { getDailyQuest, completeDailyQuest } from '../lib/quests';
import { addXP } from '../lib/gamification';
import * as Haptics from 'expo-haptics';

export const DailyQuestCard = () => {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const [quest, setQuest] = useState<any>(null);
  const scaleAnim = new Animated.Value(1);

  useEffect(() => {
    getDailyQuest().then(setQuest);
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
  };

  const handleComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const result = await completeDailyQuest();
    if (!result.alreadyCompleted) {
      await addXP('TASK_COMPLETE');
      setQuest({ ...quest, completed: true });
    }
  };

  if (!quest) return null;

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: quest.completed ? c.green + '10' : c.bgCard, 
          borderColor: quest.completed ? c.green + '44' : c.border,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: quest.completed ? c.green : c.purple }]}>
          <MaterialIcons name={quest.completed ? 'verified' : 'workspace-premium'} size={24} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.microLabel, { color: quest.completed ? c.green : c.purple }]}>
            {quest.completed ? 'DAILY GOAL ACHIEVED' : 'ACTIVE DAILY QUEST'}
          </Text>
          <Text style={[styles.questTitle, { color: c.textPrimary }]}>{quest.title}</Text>
        </View>
        {!quest.completed && (
          <View style={[styles.xpBadge, { backgroundColor: c.purple + '20' }]}>
            <Text style={[styles.xpText, { color: c.purple }]}>+{quest.xp} XP</Text>
          </View>
        )}
      </View>

      <Text style={[styles.description, { color: c.textSecondary }]}>{quest.description}</Text>

      {!quest.completed ? (
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: c.purple }]} 
          onPress={handleComplete}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.buttonText}>Complete Quest</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
      ) : (
        <View style={styles.completedBadge}>
          <MaterialIcons name="check-circle" size={16} color={c.green} />
          <Text style={[styles.completedText, { color: c.green }]}>Reward Claimed</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 1.5,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  microLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  questTitle: {
    fontSize: 20,
    fontWeight: '900',
  },
  xpBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  xpText: {
    fontSize: 13,
    fontWeight: '900',
  },
  description: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 24,
    opacity: 0.9,
  },
  button: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
