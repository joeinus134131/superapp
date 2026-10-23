import { useCallback, useEffect, useState, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useAuth } from './useAuth';
import { AppNotification, readNotificationHistory, markNotificationsRead } from '../lib/notificationHistory';
export function useNotificationHistory() {
  const { user } = useAuth(); const [items, setItems] = useState<AppNotification[]>([]);
  const currentOwner = useRef(user?.id); currentOwner.current = user?.id;
  const request = useRef(0);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(false);
  const refresh = useCallback(async () => {
    const account = user?.id, ticket = ++request.current;
    const active = () => currentOwner.current === account && request.current === ticket;
    setLoading(true); setError(false);
    try { const items = await readNotificationHistory(account); if (active()) setItems(items); } catch { if (active()) setError(true); }
    finally { if (active()) setLoading(false); }
  }, [user?.id]);
  useEffect(() => {
    setItems([]); refresh();
    const sub = DeviceEventEmitter.addListener('whenya:notifications-updated', refresh);
    return () => { request.current++; sub.remove(); };
  }, [refresh]);
  const markRead = async (id?: string) => { const account = user?.id; const items = await markNotificationsRead(id); if (account === currentOwner.current) setItems(items); };
  return { items, loading, error, refresh, markRead, unread: items.filter(item => !item.readAt).length };
}
