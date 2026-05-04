import { useState, useCallback, useEffect } from 'react';
import { getData, setData, STORAGE_KEYS } from '../lib/storage';
import { generateId } from '../lib/helpers';
import * as Haptics from 'expo-haptics';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM
  endTime: string;    // HH:MM
  category: string;
  color: string;
  notes: string;
  isAllDay: boolean;
  createdAt: string;
}

export function useCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getData(STORAGE_KEYS.EVENTS);
      if (data && Array.isArray(data)) {
        setEvents(data);
      }
    } catch (e) {
      console.error('Failed to load events:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const saveEvents = async (newEvents: CalendarEvent[]) => {
    setEvents(newEvents);
    await setData(STORAGE_KEYS.EVENTS, newEvents);
  };

  const addEvent = async (form: Omit<CalendarEvent, 'id' | 'createdAt'>) => {
    const newEvent: CalendarEvent = {
      ...form,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...events, newEvent];
    await saveEvents(updated);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return newEvent;
  };

  const updateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    const updated = events.map(e => e.id === id ? { ...e, ...updates } : e);
    await saveEvents(updated);
  };

  const deleteEvent = async (id: string) => {
    const updated = events.filter(e => e.id !== id);
    await saveEvents(updated);
  };

  return {
    events,
    loading,
    addEvent,
    updateEvent,
    deleteEvent,
    refreshEvents: loadEvents
  };
}
