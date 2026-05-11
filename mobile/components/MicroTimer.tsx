import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '../lib/theme';
import { useTheme } from '../context/themeContext';
import * as Haptics from 'expo-haptics';

interface MicroTimerProps {
  duration?: number;
  onComplete: () => void;
  onCancel: () => void;
  title: string;
}

export const MicroTimer: React.FC<MicroTimerProps> = ({ 
  duration = 120, 
  onComplete, 
  onCancel,
  title
}) => {
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isActive, setIsActive] = useState(true);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      clearInterval(interval);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 1 - (timeLeft / duration),
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
    
    if (timeLeft % 10 === 0 && timeLeft !== duration) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: c.bgSecondary, opacity: fadeAnim }]}>
      <View style={styles.header}>
        <View style={[styles.microBadge, { backgroundColor: c.purple + '20' }]}>
          <MaterialIcons name="speed" size={12} color={c.purple} style={{ marginRight: 6 }} />
          <Text style={[styles.microBadgeText, { color: c.purple }]}>FOCUS MODE</Text>
        </View>
        <Text style={[styles.title, { color: c.textPrimary }]}>{title}</Text>
      </View>

      <View style={styles.timerContainer}>
        <Text style={[styles.timerText, { color: c.textPrimary }]}>{formatTime(timeLeft)}</Text>
        
        <View style={[styles.progressTrack, { backgroundColor: c.border + '44' }]}>
          <Animated.View 
            style={[
              styles.progressFill, 
              { 
                backgroundColor: c.purple,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                })
              }
            ]} 
          />
        </View>
        <Text style={[styles.subText, { color: c.textSecondary }]}>
          "Success is the sum of small efforts, repeated day in and day out."
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: c.bgInput, borderWidth: 1, borderColor: c.border }]} 
          onPress={onCancel}
        >
          <Text style={[styles.buttonText, { color: c.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: c.purple }]} 
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setIsActive(!isActive);
          }}
        >
          <MaterialIcons name={isActive ? 'pause' : 'play-arrow'} size={24} color="#fff" />
          <Text style={[styles.buttonText, { color: '#fff', marginLeft: 8 }]}>
            {isActive ? 'Pause' : 'Resume'}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 32,
    borderRadius: 40,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  microBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  microBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
  },
  timerContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 48,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 24,
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  timerText: {
    fontSize: 80,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
  },
  subText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  button: {
    flex: 1,
    height: 64,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
  },
});
