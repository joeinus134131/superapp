import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { Card } from './ui/Card';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface MomentumHabitCardProps {
  habit: any;
  isDone: boolean;
  colors: any;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
}

export const MomentumHabitCard: React.FC<MomentumHabitCardProps> = ({
  habit, isDone, colors, onToggle, onDelete, onComplete
}) => {
  const [isPressing, setIsPressing] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<any>(null);

  const SIZE = 50;
  const STROKE = 4;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRCUM = 2 * Math.PI * RADIUS;

  const startMomentum = () => {
    if (isDone) return;
    setIsPressing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Animated.timing(progress, {
      toValue: 1,
      duration: 1800, // 1.8 seconds to complete
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        completeHabit();
      }
    });

    // Escalating haptics
    let hapticCount = 0;
    timerRef.current = setInterval(() => {
      hapticCount++;
      if (hapticCount < 5) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (hapticCount < 10) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    }, 150);
  };

  const cancelMomentum = () => {
    setIsPressing(false);
    clearInterval(timerRef.current);
    Animated.spring(progress, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 10,
    }).start();
  };

  const completeHabit = () => {
    setIsPressing(false);
    clearInterval(timerRef.current);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete(habit.id);
    
    // Quick reset for next time
    setTimeout(() => progress.setValue(0), 500);
  };

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUM, 0],
  });

  return (
    <Card 
      style={[
        styles.container, 
        isPressing && { transform: [{ scale: 1.02 }], borderColor: colors.purple }
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={startMomentum}
        onPressOut={cancelMomentum}
        onPress={() => onToggle(habit.id)}
        style={styles.content}
      >
        {/* Progress Overlay */}
        {isPressing && (
          <View style={styles.svgOverlay}>
            <Svg width={SIZE} height={SIZE}>
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                stroke={colors.purple + '22'}
                strokeWidth={STROKE}
                fill="transparent"
              />
              <AnimatedCircle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                stroke={colors.purple}
                strokeWidth={STROKE}
                strokeDasharray={CIRCUM}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                rotation="-90"
                origin={`${SIZE / 2}, ${SIZE / 2}`}
              />
            </Svg>
          </View>
        )}

        <View style={[styles.checkbox, isDone && { backgroundColor: colors.green, borderColor: colors.green }]}>
          {isDone ? <MaterialIcons name="check" size={16} color="#fff" /> : isPressing && (
             <MaterialIcons name="bolt" size={16} color={colors.purple} />
          )}
        </View>

        <View style={[styles.habitIcon, { backgroundColor: colors.bgInput }]}>
          <MaterialIcons name={habit.icon as any} size={24} color={isPressing ? colors.purple : colors.textSecondary} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[
            styles.name, 
            { color: colors.textPrimary, textDecorationLine: isDone ? 'line-through' : 'none', opacity: isDone ? 0.6 : 1 }
          ]}>
            {habit.name}
          </Text>
          <View style={styles.meta}>
            <MaterialIcons name="local-fire-department" size={14} color={colors.red} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{habit.streak} DAY STREAK</Text>
            
            {!isDone && (
              <View style={[styles.microBadge, { backgroundColor: colors.purple + '15' }]}>
                <Text style={[styles.microBadgeText, { color: colors.purple }]}>
                  {isPressing ? 'CHARGING...' : 'HOLD FOR MICRO'}
                </Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity onPress={() => onDelete(habit.id)} style={styles.deleteBtn}>
          <MaterialIcons name="delete-outline" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 12, overflow: 'hidden' },
  content: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  svgOverlay: { position: 'absolute', left: 14, top: 14, zIndex: 10 },
  checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  habitIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaText: { fontSize: 11, fontWeight: '800' },
  microBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 4 },
  microBadgeText: { fontSize: 9, fontWeight: '900' },
  deleteBtn: { padding: 4 },
});
