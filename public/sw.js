// SuperApp Service Worker for Push Notifications
const SW_VERSION = '1.0.0';

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installed v' + SW_VERSION);
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activated v' + SW_VERSION);
  event.waitUntil(self.clients.claim());
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const url = data.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window or open new one
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          if (data.url) client.navigate(data.url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  if (type === 'SCHEDULE_NOTIFICATION') {
    const { id, title, body, delay, icon, url, tag } = payload;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: icon || '/icon-192.png',
        badge: '/icon-192.png',
        tag: tag || id,
        data: { id, url: url || '/' },
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: true,
        actions: [
          { action: 'open', title: 'Buka' },
          { action: 'dismiss', title: 'Nanti' },
        ],
      });
    }, delay || 0);
  }

  if (type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, url, tag } = payload;
    self.registration.showNotification(title, {
      body,
      icon: icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag: tag || 'superapp-' + Date.now(),
      data: { url: url || '/' },
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
    });
  }
});

// Periodic check for scheduled notifications (fired from main thread timer)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkReminders());
  }
});

async function checkReminders() {
  // This is triggered by the main thread scheduler
  // The actual scheduling logic runs in the main thread and sends messages to SW
  console.log('[SW] Periodic reminder check');
}
