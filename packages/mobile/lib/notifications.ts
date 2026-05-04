import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

/**
 * Setup notifications with environment checking.
 * expo-notifications is not supported in Expo Go for Android (SDK 53+)
 */
export const setupNotifications = async () => {
  if (Platform.OS === 'web') return;

  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (Platform.OS === 'android' && isExpoGo) {
    console.warn('Notifications: Skipping setup on Android Expo Go (Not supported in SDK 53+)');
    return;
  }

  try {
    const Notifications = require('expo-notifications');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Notifications: Permission not granted');
      return;
    }

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (error) {
    console.warn('Notifications: Setup error', error);
  }
};

/**
 * Schedule a notification with lazy loading to prevent crashes in Expo Go
 */
export const scheduleNotification = async (title: string, body: string, trigger: any) => {
  if (Platform.OS === 'web') return;

  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (Platform.OS === 'android' && isExpoGo) return;

  try {
    const Notifications = require('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
      },
      trigger,
    });
  } catch (error) {
    console.warn('Notifications: Schedule error', error);
  }
};

export const scheduleMorningBriefing = async (hour = 8, minute = 0) => {
  await scheduleNotification(
    '☀️ Morning Briefing SelfOne',
    'Siapkan harimu! Lihat ringkasan tugas dan target hari ini.',
    {
      hour,
      minute,
      repeats: true,
    }
  );
};
