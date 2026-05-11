import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// We use dynamic require to avoid errors in Expo Go on Android
const getNotifications = () => {
  try {
    const isExpoGo = Constants.appOwnership === 'expo';
    const isAndroid = Platform.OS === 'android';
    // Skip loading the library entirely on Android Expo Go to avoid the loud error
    if (isAndroid && isExpoGo) return null;
    return require('expo-notifications');
  } catch (e) {
    return null;
  }
};

const Notifications = getNotifications();

// Configure how notifications are handled when the app is foregrounded
if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.log('[Notifications] Failed to set notification handler.');
  }
}

export async function registerForPushNotificationsAsync() {
  // Alias for backward compatibility with stale build caches
  return setupNotifications();
}

export async function setupNotifications() {
  let token;

  if (Notifications && Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8b5cf6',
      });
    } catch (e) {
      console.log('[Notifications] Failed to set notification channel.');
    }
  }

  if (Notifications && Device.isDevice) {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('[Notifications] Permission not granted.');
        return;
      }
    } catch (e) {
      console.log('[Notifications] Skipping permission check (likely Expo Go limitation).');
      return;
    }

    try {
      // Get projectId from expo config (required for SDK 50+)
      const projectId = 
        Constants?.expoConfig?.extra?.eas?.projectId ?? 
        Constants?.easConfig?.projectId;

      // EXPO GO / SDK 53+ FIX: 
      // If we are in Expo Go, remote push notifications are not supported anymore.
      // We also check if projectId is a valid UUID string to avoid 400 error.
      const isExpoGo = Constants.appOwnership === 'expo';
      const isAndroid = Platform.OS === 'android';
      const isValidUuid = typeof projectId === 'string' && projectId.length > 10;

      // CRITICAL: On Android Expo Go, calling getExpoPushTokenAsync will throw an error immediately
      if (Notifications && projectId && !isExpoGo && isValidUuid) {
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: projectId
        })).data;
      } else {
        // Skip fetching token in Expo Go or if ID is invalid
        const reason = isExpoGo ? 'Expo Go detected' : 'Invalid/Missing projectId';
        console.log(`[Notifications] Skipping remote token fetch (${reason}).`);
      }
    } catch (e) {
      // Silencing the 400 error warning if it's still triggered
      if (!e.toString().includes('400')) {
        console.warn('Error fetching push token:', e);
      }
    }
  } else {
    console.warn('Must use physical device for Push Notifications');
  }

  return token;
}

/**
 * Schedule a local notification (e.g. for Habit Reminders)
 */
export async function scheduleNotification(title: string, body: string, seconds: number = 1) {
  if (!Notifications) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: { url: '/(app)/' },
    },
    trigger: seconds > 0 ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds } : null,
  });
}

/**
 * Send an immediate notification (useful for AI alerts)
 */
export async function sendImmediateNotification(title: string, body: string) {
  if (!Notifications) {
    console.log('[Notifications] Immediate notification skipped (No library):', title);
    return;
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null, // Immediate
  });
}
