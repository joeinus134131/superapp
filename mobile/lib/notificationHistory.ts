import { EncryptedStorage } from './secureStorage';
import { getData, STORAGE_KEYS } from './storage';
import { DeviceEventEmitter } from 'react-native';
export interface AppNotification { id: string; title: string; body: string; receivedAt: string; readAt?: string; route?: string }
const KEY = 'whenya_notification_history_v1'; // Local-only; never uploaded as a module snapshot.
const routes = new Set(['/(app)/', '/(app)/tasks', '/(app)/habits', '/(app)/finance', '/(app)/journal', '/(app)/goals', '/(app)/calendar', '/(app)/pomodoro']);
export function notificationRoute(value: unknown) { return typeof value === 'string' && routes.has(value) ? value : undefined; }
export async function readNotificationHistory(owner?: string): Promise<AppNotification[]> {
  const data = await EncryptedStorage.getItem(KEY, { owner });
  if (data !== null && !Array.isArray(data)) throw new Error('Invalid notification history');
  return (data || []).filter(item => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.body === 'string' && !Number.isNaN(new Date(item.receivedAt).getTime())).map(item => ({ ...item, route: notificationRoute(item.route) }));
}
let queue = Promise.resolve();
function serial<T>(work: () => Promise<T>): Promise<T> { const job = queue.then(work); queue = job.then(() => {}, () => {}); return job; }
export function recordNotification(item: Omit<AppNotification, 'readAt'>, expectedOwner?: string) {
  return serial(async () => {
    const owner = await getData(STORAGE_KEYS.CURRENT_USER, true);
    if (!owner) return false;
    if (expectedOwner && owner !== expectedOwner) throw new Error('Account changed');
    const history = await readNotificationHistory(owner);
    if (history.some(row => row.id === item.id)) return false;
    const next = [{ ...item, route: notificationRoute(item.route) }, ...history].slice(0, 100);
    await EncryptedStorage.setItem(KEY, next, { owner, skipSync: true });
    DeviceEventEmitter.emit('whenya:notifications-updated'); return true;
  });
}
export function markNotificationsRead(id?: string) {
  return serial(async () => {
    const owner = await getData(STORAGE_KEYS.CURRENT_USER, true);
    const next = (await readNotificationHistory(owner)).map(item => !item.readAt && (!id || item.id === id) ? { ...item, readAt: new Date().toISOString() } : item);
    await EncryptedStorage.setItem(KEY, next, { owner, skipSync: true });
    DeviceEventEmitter.emit('whenya:notifications-updated'); return next;
  });
}
