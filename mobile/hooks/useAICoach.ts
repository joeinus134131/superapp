import { useEffect } from 'react';
import { sendImmediateNotification } from '../lib/notifications';
import { CONFIG } from '../lib/config';
import { getData, STORAGE_KEYS } from '../lib/storage';

export function useAICoach() {
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const token = await getData(STORAGE_KEYS.SESSION_TOKEN) || 'dummy-token';
        const res = await fetch(`${CONFIG.API_URL}/coach/messages`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            const latestMsg = json.data[json.data.length - 1];
            
            // Show Local Notification on the phone
            sendImmediateNotification(`SelfOne Coach: ${latestMsg.title}`, latestMsg.body);

            // Mark as read immediately so it doesn't spam
            await fetch(`${CONFIG.API_URL}/coach/messages/read`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ message_ids: [latestMsg.id] })
            });
          }
        }
      } catch (e) {
        // Silently ignore fetch errors in background
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, []);
}
