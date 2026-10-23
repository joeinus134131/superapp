jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { appOwnership: 'standalone' } }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(async () => 'native-id'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval', DAILY: 'daily', DATE: 'date' },
}));
jest.mock('../lib/storage', () => ({ STORAGE_KEYS: { CURRENT_USER: 'user' }, getData: jest.fn(async () => 'one') }));
jest.mock('../lib/notificationHistory', () => ({ recordNotification: jest.fn(async () => true), notificationRoute: value => value === '/(app)/tasks' || value === '/(app)/' || value === '/(app)/habits' ? value : undefined }));
import * as Native from 'expo-notifications';
import { recordNotification } from '../lib/notificationHistory';
import {
  sendImmediateNotification,
  subscribeNotificationHistory,
  scheduleTaskReminder,
  cancelTaskReminder,
  scheduleDailyHabitReminder,
  sendTestNotification,
  requestNotificationPermissions
} from '../lib/notifications';

beforeEach(() => jest.clearAllMocks());

test('received content and true timestamp are recorded with the account binding', async () => {
  const stop = subscribeNotificationHistory();
  const receive = Native.addNotificationReceivedListener.mock.calls[0][0];
  receive({ request: { identifier: 'push-one', content: { title: 'Actual event', body: 'Actual message', data: { historyOwner: 'one', url: '/(app)/tasks' } } }, date: Date.UTC(2026, 9, 22, 5) });
  expect(recordNotification).toHaveBeenCalledWith(expect.objectContaining({ id: 'push-one', title: 'Actual event', body: 'Actual message', receivedAt: '2026-10-22T05:00:00.000Z', route: '/(app)/tasks' }), 'one'); stop();
});

test('unattributed OS payload is not copied into the currently signed-in account', () => {
  const stop = subscribeNotificationHistory();
  Native.addNotificationReceivedListener.mock.calls[0][0]({ request: { identifier: 'old', content: { title: 'Other account', body: 'Unknown recipient', data: {} } } });
  expect(recordNotification).not.toHaveBeenCalled(); stop();
});

test('coach notification is persisted before native delivery and forwards a stable deduplication id', async () => {
  await sendImmediateNotification('Actual coach title', 'Actual coach message', { id: 'coach-42', owner: 'one' });
  expect(recordNotification).toHaveBeenCalledWith(expect.objectContaining({ id: 'coach-42', title: 'Actual coach title', body: 'Actual coach message' }), 'one');
  expect(Native.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({ content: expect.objectContaining({ data: expect.objectContaining({ historyId: 'coach-42', historyOwner: 'one' }) }) }));
  recordNotification.mockResolvedValueOnce(false); await sendImmediateNotification('Actual coach title', 'Actual coach message', { id: 'coach-42', owner: 'one' });
  expect(Native.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
});

test('scheduleTaskReminder cancels existing and schedules notification for future deadline', async () => {
  const future = new Date(Date.now() + 3600 * 1000).toISOString();
  const id = await scheduleTaskReminder({ id: 'task-101', title: 'Beli Buku', deadline: future, category: 'Personal' });
  expect(id).toBe('task-task-101');
  expect(Native.cancelScheduledNotificationAsync).toHaveBeenCalledWith('task-task-101');
  expect(Native.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
    identifier: 'task-task-101',
    content: expect.objectContaining({
      title: 'Pengingat Tugas: Beli Buku',
      channelId: 'default',
    }),
  }));
});

test('cancelTaskReminder cancels task notification by identifier', async () => {
  await cancelTaskReminder('task-101');
  expect(Native.cancelScheduledNotificationAsync).toHaveBeenCalledWith('task-task-101');
});

test('scheduleDailyHabitReminder schedules daily notification', async () => {
  const id = await scheduleDailyHabitReminder(20, 0);
  expect(id).toBe('daily-habit-reminder');
  expect(Native.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
    identifier: 'daily-habit-reminder',
    trigger: expect.objectContaining({ type: 'daily', hour: 20, minute: 0 }),
  }));
});

test('sendTestNotification records notification and schedules with 3s delay', async () => {
  const ok = await sendTestNotification(3);
  expect(ok).toBe(true);
  expect(recordNotification).toHaveBeenCalledWith(expect.objectContaining({
    title: 'Uji Coba Notifikasi Whenya',
  }), 'one');
  expect(Native.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
    content: expect.objectContaining({
      title: 'Uji Coba Notifikasi Whenya',
      channelId: 'default',
    }),
    trigger: expect.objectContaining({
      type: 'timeInterval',
      seconds: 3,
    }),
  }));
});

test('requestNotificationPermissions returns true when granted', async () => {
  const granted = await requestNotificationPermissions();
  expect(granted).toBe(true);
});
