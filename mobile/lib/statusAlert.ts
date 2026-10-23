import { DeviceEventEmitter } from 'react-native';
import { triggerHaptic } from './haptics';

export type StatusAlertType = 'success' | 'error' | 'warning' | 'info';

export interface StatusAlertPayload {
  id?: string;
  type: StatusAlertType;
  title: string;
  message?: string;
  duration?: number; // ms, default 3000ms
  actionLabel?: string;
  onAction?: () => void;
}

export const STATUS_ALERT_EVENT = 'whenya:status-alert';

/**
 * Trigger an interactive status alert popup across mobile screens.
 */
export const showStatusAlert = (payload: StatusAlertPayload) => {
  const alertPayload: StatusAlertPayload = {
    ...payload,
    id: payload.id || `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    duration: payload.duration !== undefined ? payload.duration : 3200,
  };

  // Play matching haptic feedback automatically
  try {
    switch (alertPayload.type) {
      case 'success':
        triggerHaptic('success');
        break;
      case 'error':
        triggerHaptic('error');
        break;
      case 'warning':
        triggerHaptic('warning');
        break;
      default:
        triggerHaptic('light');
        break;
    }
  } catch {
    // Graceful fallback if haptics is not available
  }

  DeviceEventEmitter.emit(STATUS_ALERT_EVENT, alertPayload);
};

export const statusAlert = {
  success: (title: string, message?: string, duration?: number) =>
    showStatusAlert({ type: 'success', title, message, duration }),
  error: (title: string, message?: string, duration?: number) =>
    showStatusAlert({ type: 'error', title, message, duration }),
  warning: (title: string, message?: string, duration?: number) =>
    showStatusAlert({ type: 'warning', title, message, duration }),
  info: (title: string, message?: string, duration?: number) =>
    showStatusAlert({ type: 'info', title, message, duration }),
};
