import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  DeviceEventEmitter,
  Easing,
} from 'react-native';
import { useTheme } from '../context/themeContext';
import { useLanguage } from '../context/languageContext';
import {
  STATUS_ALERT_EVENT,
  StatusAlertPayload,
  StatusAlertType,
} from '../lib/statusAlert';

export function StatusAlertModal() {
  const { isDark } = useTheme();
  const { tx: translateCopy, language } = useLanguage();

  const [currentAlert, setCurrentAlert] = useState<StatusAlertPayload | null>(null);
  const [visible, setVisible] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDismiss = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      if (currentAlert?.onAction) {
        currentAlert.onAction();
      }
      setCurrentAlert(null);
    });
  }, [currentAlert, scaleAnim, opacityAnim]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      STATUS_ALERT_EVENT,
      (payload: StatusAlertPayload) => {
        if (dismissTimerRef.current) {
          clearTimeout(dismissTimerRef.current);
        }

        setCurrentAlert(payload);
        setVisible(true);

        scaleAnim.setValue(0.92);
        opacityAnim.setValue(0);
        progressAnim.setValue(1);

        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 90,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start();

        const duration = payload.duration ?? 3200;
        if (duration > 0) {
          Animated.timing(progressAnim, {
            toValue: 0,
            duration,
            easing: Easing.linear,
            useNativeDriver: false,
          }).start();

          dismissTimerRef.current = setTimeout(() => {
            handleDismiss();
          }, duration);
        }
      }
    );

    return () => {
      subscription.remove();
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [handleDismiss, opacityAnim, progressAnim, scaleAnim]);

  if (!visible || !currentAlert) {
    return null;
  }

  const getTypeConfig = (type: StatusAlertType) => {
    switch (type) {
      case 'success':
        return {
          color: '#10B981',
          badgeText: language === 'id' ? 'SUKSES' : 'SUCCESS',
          badgeBg: isDark ? 'rgba(16, 185, 129, 0.14)' : 'rgba(16, 185, 129, 0.1)',
          badgeBorder: isDark ? 'rgba(16, 185, 129, 0.28)' : 'rgba(16, 185, 129, 0.2)',
          defaultBtnText: language === 'id' ? 'Selesai' : 'Done',
        };
      case 'error':
        return {
          color: '#EF4444',
          badgeText: language === 'id' ? 'GAGAL' : 'ERROR',
          badgeBg: isDark ? 'rgba(239, 68, 68, 0.14)' : 'rgba(239, 68, 68, 0.1)',
          badgeBorder: isDark ? 'rgba(239, 68, 68, 0.28)' : 'rgba(239, 68, 68, 0.2)',
          defaultBtnText: language === 'id' ? 'Tutup' : 'Dismiss',
        };
      case 'warning':
        return {
          color: '#F59E0B',
          badgeText: language === 'id' ? 'PERINGATAN' : 'WARNING',
          badgeBg: isDark ? 'rgba(245, 158, 11, 0.14)' : 'rgba(245, 158, 11, 0.1)',
          badgeBorder: isDark ? 'rgba(245, 158, 11, 0.28)' : 'rgba(245, 158, 11, 0.2)',
          defaultBtnText: language === 'id' ? 'Mengerti' : 'Understood',
        };
      case 'info':
      default:
        return {
          color: '#3B82F6',
          badgeText: language === 'id' ? 'INFO' : 'INFO',
          badgeBg: isDark ? 'rgba(59, 130, 246, 0.14)' : 'rgba(59, 130, 246, 0.1)',
          badgeBorder: isDark ? 'rgba(59, 130, 246, 0.28)' : 'rgba(59, 130, 246, 0.2)',
          defaultBtnText: language === 'id' ? 'Oke' : 'OK',
        };
    }
  };

  const config = getTypeConfig(currentAlert.type);
  const actionText = translateCopy(currentAlert.actionLabel || config.defaultBtnText);
  const titleText = translateCopy(currentAlert.title);
  const messageText = currentAlert.message ? translateCopy(currentAlert.message) : '';

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleDismiss}
        />

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#1C2620' : '#FFFFFF',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0',
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {/* Top Progress countdown bar */}
          <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F1F5F9' }]}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  backgroundColor: config.color,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          <View style={styles.contentContainer}>
            {/* Clean category pill without tacky icons */}
            <View style={[styles.badgePill, { backgroundColor: config.badgeBg, borderColor: config.badgeBorder }]}>
              <Text style={[styles.badgeText, { color: config.color }]}>
                {config.badgeText}
              </Text>
            </View>

            {/* Alert Title */}
            <Text
              style={[
                styles.title,
                { color: isDark ? '#F8FAFC' : '#0F172A' },
              ]}
              numberOfLines={2}
            >
              {titleText}
            </Text>

            {/* Alert Message */}
            {messageText ? (
              <Text
                style={[
                  styles.message,
                  { color: isDark ? '#94A3B8' : '#475569' },
                ]}
              >
                {messageText}
              </Text>
            ) : null}

            {/* Dismiss / Action Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: config.color,
                },
              ]}
              onPress={handleDismiss}
              accessibilityRole="button"
              accessibilityLabel={actionText}
            >
              <Text style={styles.actionBtnText}>{actionText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  progressTrack: {
    height: 3,
    width: '100%',
  },
  progressBar: {
    height: '100%',
  },
  contentContainer: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  actionBtn: {
    width: '100%',
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
