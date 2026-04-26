// Notification scheduling engine
import { getData, setData, STORAGE_KEYS } from './storage';

let swRegistration = null;
let schedulerInterval = null;

// ===== Service Worker Registration =====
export async function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js');
    console.log('[Notif] Service Worker registered');
    return swRegistration;
  } catch (err) {
    console.error('[Notif] SW registration failed:', err);
    return null;
  }
}

// ===== Permission =====
export async function requestPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  return result;
}

export function getPermissionStatus() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

// ===== Show Notification Now =====
export async function showNotification(title, body, options = {}) {
  if (getPermissionStatus() !== 'granted') {
    const perm = await requestPermission();
    if (perm !== 'granted') return false;
  }

  // Try via Service Worker (works even when tab not focused)
  if (swRegistration) {
    try {
      const reg = await navigator.serviceWorker.ready;
      reg.active.postMessage({
        type: 'SHOW_NOTIFICATION',
        payload: { title, body, ...options },
      });
      return true;
    } catch (e) {
      console.warn('[Notif] SW notification failed, using fallback:', e);
    }
  }

  // Fallback to Notification API
  try {
    new Notification(title, { body, icon: options.icon || '/icon-192.svg', ...options });
    return true;
  } catch (e) {
    console.error('[Notif] Notification failed:', e);
    return false;
  }
}

// ===== Reminder CRUD =====
export async function getReminders() {
  return (await getData(STORAGE_KEYS.REMINDERS)) || [];
}

export async function saveReminders(reminders) {
  await setData(STORAGE_KEYS.REMINDERS, reminders);
}

export async function addReminder(reminder) {
  const reminders = await getReminders();
  const newReminder = {
    id: 'rem_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
    title: reminder.title,
    body: reminder.body || '',
    time: reminder.time, // HH:MM format
    days: reminder.days || [0, 1, 2, 3, 4, 5, 6], // 0=Sun, 6=Sat
    category: reminder.category || 'custom', // habit, task, goal, water, break, custom
    enabled: true,
    url: reminder.url || '/',
    createdAt: new Date().toISOString(),
    lastFired: null,
  };
  reminders.push(newReminder);
  await saveReminders(reminders);
  return newReminder;
}

export async function updateReminder(id, updates) {
  const reminders = await getReminders();
  const idx = reminders.findIndex(r => r.id === id);
  if (idx === -1) return null;
  reminders[idx] = { ...reminders[idx], ...updates };
  await saveReminders(reminders);
  return reminders[idx];
}

export async function deleteReminder(id) {
  const reminders = (await getReminders()).filter(r => r.id !== id);
  await saveReminders(reminders);
}

export async function toggleReminder(id) {
  const reminders = await getReminders();
  const idx = reminders.findIndex(r => r.id === id);
  if (idx === -1) return;
  reminders[idx].enabled = !reminders[idx].enabled;
  await saveReminders(reminders);
  return reminders[idx];
}

// ===== Notification History =====
export async function getNotificationHistory() {
  return (await getData(STORAGE_KEYS.NOTIFICATION_HISTORY)) || [];
}

async function addToHistory(reminder) {
  const history = await getNotificationHistory();
  history.unshift({
    id: 'hist_' + Date.now(),
    reminderId: reminder.id,
    title: reminder.title,
    body: reminder.body,
    category: reminder.category,
    firedAt: new Date().toISOString(),
  });
  // Keep only last 50
  if (history.length > 50) history.length = 50;
  await setData(STORAGE_KEYS.NOTIFICATION_HISTORY, history);
}

// ===== Scheduler =====
export function startScheduler() {
  if (schedulerInterval) return;

  // Check every 30 seconds
  schedulerInterval = setInterval(() => {
    checkAndFireReminders();
  }, 30000);

  // Also check immediately
  checkAndFireReminders();
  console.log('[Notif] Scheduler started');
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

async function checkAndFireReminders() {
  if (getPermissionStatus() !== 'granted') return;

  const reminders = await getReminders();
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const currentDay = now.getDay();
  const todayStr = now.toISOString().split('T')[0];

  for (const reminder of reminders) {
    if (!reminder.enabled) continue;
    if (!reminder.days.includes(currentDay)) continue;
    if (reminder.time !== currentTime) continue;

    // Don't fire again on same day for same minute
    if (reminder.lastFired) {
      const lastFiredDate = new Date(reminder.lastFired);
      const lastFiredStr = lastFiredDate.toISOString().split('T')[0];
      const lastFiredTime = `${String(lastFiredDate.getHours()).padStart(2, '0')}:${String(lastFiredDate.getMinutes()).padStart(2, '0')}`;
      if (lastFiredStr === todayStr && lastFiredTime === currentTime) continue;
    }

    // FIRE! 🔥
    showNotification(
      `${getCategoryEmoji(reminder.category)} ${reminder.title}`,
      reminder.body || getMotivationalBody(reminder.category),
      { url: reminder.url, tag: reminder.id }
    );

    await addToHistory(reminder);
    await updateReminder(reminder.id, { lastFired: now.toISOString() });
  }
}

function getCategoryEmoji(cat) {
  const map = {
    habit: '🔥', task: '✅', goal: '🎯', water: '💧',
    break: '☕', pomodoro: '⏱️', health: '💪', custom: '🔔',
  };
  return map[cat] || '🔔';
}

function getMotivationalBody(category) {
  const messages = {
    habit: 'Waktunya membangun kebiasaan baik! Jangan putus streak-mu! 💪',
    task: 'Ada task yang menunggu diselesaikan! Ayo produktif! 🚀',
    goal: 'Cek progress goal-mu. Setiap langkah kecil mendekatkanmu ke tujuan! 🎯',
    water: 'Sudah minum air? Jaga hidrasi tubuhmu! Minum sekarang! 💧',
    break: 'Istirahat sebentar. Matamu dan otakmu butuh jeda! ☕',
    pomodoro: 'Sesi fokus selesai! Waktunya break sebentar 🎉',
    health: 'Waktunya bergerak! Jaga kesehatan tubuhmu! 💪',
    custom: 'Ini reminder dari SuperApp! ⚡',
  };
  return messages[category] || messages.custom;
}

// ===== Preset Templates =====
export const REMINDER_TEMPLATES = [
  {
    title: '💧 Minum Air',
    body: 'Waktunya minum! Jaga hidrasi tubuhmu dengan minum segelas air sekarang.',
    category: 'water',
    times: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
    url: '/health',
  },
  {
    title: '🔥 Cek Habits',
    body: 'Sudah selesaikan habit hari ini? Jangan putus streak-mu!',
    category: 'habit',
    times: ['07:00', '21:00'],
    url: '/habits',
  },
  {
    title: '✅ Review Tasks',
    body: 'Cek task list-mu. Ada yang bisa diselesaikan sekarang?',
    category: 'task',
    times: ['09:00', '14:00'],
    url: '/tasks',
  },
  {
    title: '🎯 Progress Goals',
    body: 'Review weekly progress goal-mu. Sudah sejauh mana?',
    category: 'goal',
    times: ['19:00'],
    url: '/goals',
  },
  {
    title: '☕ Istirahat Mata',
    body: 'Istirahat 5 menit. Lihat jauh, stretching, minum air.',
    category: 'break',
    times: ['10:30', '14:30', '16:30'],
    url: '/',
  },
  {
    title: '📝 Tulis Jurnal',
    body: 'Luangkan waktu untuk refleksi hari ini. Tulis di jurnal!',
    category: 'custom',
    times: ['21:30'],
    url: '/journal',
  },
  {
    title: '💪 Workout Time',
    body: 'Waktunya olahraga! Jangan skip leg day 😤',
    category: 'health',
    times: ['06:00'],
    url: '/health',
  },
];

// ===== Quick Add from Template =====
export async function addFromTemplate(template, selectedTimes = null) {
  const times = selectedTimes || template.times;
  const added = [];
  for (const time of times) {
    const r = await addReminder({
      title: template.title,
      body: template.body,
      time,
      category: template.category,
      url: template.url,
      days: [0, 1, 2, 3, 4, 5, 6],
    });
    added.push(r);
  }
  return added;
}
