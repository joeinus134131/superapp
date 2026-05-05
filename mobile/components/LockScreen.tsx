import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSecurity } from '../context/securityContext';
import { useColors } from '../lib/theme';
import { useTheme } from '../context/themeContext';
import { triggerHaptic } from '../lib/haptics';
import { BrandLogo } from './BrandLogo';

const { width } = Dimensions.get('window');

export const LockScreen = () => {
  const { unlockApp, isBiometricsEnabled, authenticateWithBiometrics } = useSecurity();
  const { isDark } = useTheme();
  const c = useColors(isDark);
  const [pin, setPin] = useState('');
  const [shake] = useState(new Animated.Value(0));

  useEffect(() => {
    // Auto-authenticate with biometrics if enabled
    if (isBiometricsEnabled) {
      const timer = setTimeout(() => {
        handleBiometrics();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isBiometricsEnabled]);

  const handleBiometrics = async () => {
    triggerHaptic('medium');
    const success = await authenticateWithBiometrics();
    if (success) {
      triggerHaptic('success');
    }
  };

  const handlePress = (num: string) => {
    if (pin.length < 4) {
      triggerHaptic('light');
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        checkPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      triggerHaptic('medium');
      setPin(pin.slice(0, -1));
    }
  };

  const shakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const checkPin = async (finalPin: string) => {
    setTimeout(async () => {
      const success = await unlockApp(finalPin);
      if (!success) {
        triggerHaptic('error');
        shakeAnimation();
        setPin('');
      } else {
        triggerHaptic('success');
      }
    }, 100);
  };

  const renderNum = (num: string) => (
    <TouchableOpacity
      key={num}
      style={[styles.numBtn, { backgroundColor: c.bgCard, borderColor: c.border }]}
      onPress={() => handlePress(num)}
      activeOpacity={0.6}
    >
      <Text style={[styles.numText, { color: c.textPrimary }]}>{num}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.bgPrimary }]}>
      <View style={styles.header}>
        <BrandLogo size={60} showText={false} />
        <Text style={[styles.title, { color: c.textPrimary }]}>SelfOne Secure</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>Masukkan PIN Anda</Text>
      </View>

      <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shake }] }]}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { borderColor: c.purple },
              pin.length >= i && { backgroundColor: c.purple, transform: [{ scale: 1.2 }] }
            ]}
          />
        ))}
      </Animated.View>

      <View style={styles.numpad}>
        <View style={styles.row}>
          {['1', '2', '3'].map(renderNum)}
        </View>
        <View style={styles.row}>
          {['4', '5', '6'].map(renderNum)}
        </View>
        <View style={styles.row}>
          {['7', '8', '9'].map(renderNum)}
        </View>
        <View style={styles.row}>
          {isBiometricsEnabled ? (
            <TouchableOpacity
              style={[styles.deleteBtn, { backgroundColor: c.purple + '15', borderRadius: 37.5 }]}
              onPress={handleBiometrics}
              activeOpacity={0.6}
            >
              <MaterialIcons name="face" size={32} color={c.purple} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
          {renderNum('0')}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            onLongPress={() => { triggerHaptic('warning'); setPin(''); }}
            activeOpacity={0.6}
          >
            <MaterialIcons name="backspace" size={26} color={c.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 50 },
  title: { fontSize: 26, fontWeight: '900', marginTop: 24, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, marginTop: 8, textAlign: 'center', opacity: 0.6, fontWeight: '600' },
  dotsRow: { flexDirection: 'row', gap: 24, marginBottom: 60, height: 20, alignItems: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  
  // Fixed width for the numpad to keep it consistent across all devices (Mobile/Tablet)
  numpad: { 
    width: 280, // Fixed static width
    gap: 15,    // Tighter gaps
    alignItems: 'center' 
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 15 // Consistent gap between buttons
  },
  numBtn: { 
    width: 75, 
    height: 75, 
    borderRadius: 37.5, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  placeholder: { width: 75, height: 75 },
  deleteBtn: { width: 75, height: 75, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 28, fontWeight: '800' },
});
