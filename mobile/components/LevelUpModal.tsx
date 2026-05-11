import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../context/languageContext';

const { width, height } = Dimensions.get('window');

interface LevelUpModalProps {
  visible: boolean;
  level: any;
  onClose: () => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ visible, level, onClose }) => {
  const { t } = useLanguage();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 10000,
            useNativeDriver: true,
          })
        )
      ]).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  if (!level) return null;

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        
        <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
          <Animated.View style={[styles.glow, { backgroundColor: level.color, transform: [{ rotate }] }]} />
          
          <View style={[styles.card, { backgroundColor: '#0a0a0a' }]}>
            <View style={[styles.iconContainer, { backgroundColor: level.color + '22' }]}>
              <MaterialIcons name="emoji-events" size={60} color={level.color} />
            </View>

            <Text style={styles.congrats}>LEVEL UP!</Text>
            <Text style={[styles.levelTitle, { color: level.color }]}>{t(level.key).toUpperCase()}</Text>
            
            <View style={styles.levelBadge}>
              <Text style={styles.levelNumber}>Lv. {level.level}</Text>
            </View>

            <Text style={styles.msg}>
              Luar biasa brok! Lo makin deket jadi versi terbaik diri lo. Terus gaspol!
            </Text>

            <TouchableOpacity 
              style={[styles.btn, { backgroundColor: level.color }]} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onClose();
              }}
            >
              <Text style={styles.btnText}>SIAAP, LANJUTKAN!</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: width * 0.85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.3,
    filter: 'blur(40px)',
  },
  card: {
    width: '100%',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  congrats: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 8,
  },
  levelTitle: {
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },
  levelBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
  },
  levelNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  msg: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  btn: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
