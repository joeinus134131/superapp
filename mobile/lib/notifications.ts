import { getData, STORAGE_KEYS } from './storage';
import { recordNotification, notificationRoute } from './notificationHistory';
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
    const reason = !Notifications
      ? 'notifications library unavailable'
      : 'running on a simulator';
    console.log(`[Notifications] Remote push skipped (${reason}).`);
  }

  return token;
}

/**
 * Request notification permissions from user
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (e) {
    console.warn('[Notifications] Error requesting permission:', e);
    return false;
  }
}

/**
 * Schedule a local notification (e.g. for Habit Reminders)
 */
export async function scheduleNotification(title: string, body: string, seconds: number = 1) {
  if (!Notifications) return;
  const owner = await getData(STORAGE_KEYS.CURRENT_USER, true);
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      channelId: 'default',
      data: { url: '/(app)/', historyOwner: owner },
    },
    trigger: seconds > 0 ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds } : null,
  });
}

/**
 * Schedules a reminder for a task deadline.
 */
export async function scheduleTaskReminder(task: { id: string; title: string; deadline?: string; category?: string }): Promise<string | null> {
  if (!Notifications || !task.deadline) return null;
  try {
    const dueTime = new Date(task.deadline).getTime();
    if (isNaN(dueTime)) return null;

    const now = Date.now();
    const diffSec = Math.floor((dueTime - now) / 1000);
    // Only schedule if in future (at least 5 seconds from now)
    if (diffSec < 5) return null;

    const owner = await getData(STORAGE_KEYS.CURRENT_USER, true);
    await cancelTaskReminder(task.id);

    const identifier = `task-${task.id}`;
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: `Pengingat Tugas: ${task.title}`,
        body: task.category ? `Kategori: ${task.category}. Waktunya menyelesaikan tugas ini!` : `Waktunya menyelesaikan tugas ini!`,
        sound: true,
        channelId: 'default',
        data: {
          url: '/(app)/tasks',
          taskId: task.id,
          historyId: `task-hist-${task.id}-${Date.now()}`,
          historyOwner: owner,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: diffSec,
      },
    });

    return identifier;
  } catch (error) {
    console.warn('[Notifications] Failed to schedule task reminder:', error);
    return null;
  }
}

/**
 * Cancel a scheduled task reminder
 */
export async function cancelTaskReminder(taskId: string): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(`task-${taskId}`);
  } catch (e) {
    // Silent fail if not found
  }
}

/**
 * Schedule daily habit check-in reminder
 */
export async function scheduleDailyHabitReminder(hour = 20, minute = 0): Promise<string | null> {
  if (!Notifications) return null;
  try {
    const owner = await getData(STORAGE_KEYS.CURRENT_USER, true);
    const identifier = 'daily-habit-reminder';
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: 'Evaluasi Kebiasaan Hari Ini',
        body: 'Luangkan 1 menit untuk menandai kebiasaan positif yang sudah kamu selesaikan hari ini.',
        sound: true,
        channelId: 'default',
        data: {
          url: '/(app)/habits',
          historyId: `daily-habit-${Date.now()}`,
          historyOwner: owner,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    return identifier;
  } catch (e) {
    console.warn('[Notifications] Failed to schedule daily habit reminder:', e);
    return null;
  }
}

/**
 * Cancel daily habit reminder
 */
export async function cancelDailyHabitReminder(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync('daily-habit-reminder');
  } catch (e) {}
}

/**
 * Send a quick test notification to demonstrate local notifications on device
 */
export async function sendTestNotification(delaySeconds = 3): Promise<boolean> {
  const owner = await getData(STORAGE_KEYS.CURRENT_USER, true);
  const title = 'Uji Coba Notifikasi Whenya';
  const body = 'Sistem notifikasi lokal Anda berhasil aktif dan berjalan normal!';
  const id = `test-notification-${Date.now()}`;

  // Record to in-app notification center history immediately
  await recordNotification({
    id,
    title,
    body,
    receivedAt: new Date(Date.now() + delaySeconds * 1000).toISOString(),
    route: '/(app)/',
  }, owner);

  if (!Notifications) return true;

  try {
    await requestNotificationPermissions();
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        channelId: 'default',
        data: {
          historyId: id,
          historyOwner: owner,
          url: '/(app)/',
        },
      },
      trigger: delaySeconds > 0 ? {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: delaySeconds,
      } : null,
    });
    return true;
  } catch (e) {
    console.warn('[Notifications] Test notification error:', e);
    return false;
  }
}

/**
 * Send an immediate notification (useful for AI alerts)
 */
export async function sendImmediateNotification(title: string, body: string, options: { id?: string; route?: string; owner?: string } = {}) {
  const id = options.id || `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const owner = options.owner || await getData(STORAGE_KEYS.CURRENT_USER, true);
  const inserted = await recordNotification({ id, title, body, receivedAt: new Date().toISOString(), route: notificationRoute(options.route) }, owner);
  if (!inserted || !Notifications) return;
  await Notifications.scheduleNotificationAsync({ content: { title, body, sound: true, channelId: 'default', data: { historyId: id, historyOwner: owner, url: options.route } }, trigger: null });
}

export function subscribeNotificationHistory() {
  if (!Notifications) return () => {};
  const receive = (notification: any) => {
    const content = notification?.request?.content;
    if (!content || (!content.title && !content.body)) return;
    // Ignore account-less OS payloads; they cannot be safely attributed after sign-in changes.
    if (typeof content.data?.historyOwner !== 'string') return;
    recordNotification({ id: String(content.data?.historyId || notification.request.identifier), title: content.title || '', body: content.body || '',
      receivedAt: new Date(notification.date || Date.now()).toISOString(), route: notificationRoute(content.data?.url),
    }, content.data.historyOwner).catch(error => console.warn('[Notification history]', error instanceof Error ? error.message : 'Could not save'));
  };
  const received = Notifications.addNotificationReceivedListener(receive);
  const response = Notifications.addNotificationResponseReceivedListener((event: any) => receive(event.notification));
  Notifications.getLastNotificationResponseAsync().then((event: any) => { if (event) receive(event.notification); }).catch(() => {});
  return () => { received.remove(); response.remove(); };
}
