import React, { createContext, useContext, useState, useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { getData, setData, STORAGE_KEYS } from '../lib/storage';
import { scheduleDailyHabitReminder, cancelDailyHabitReminder } from '../lib/notifications';

export const DEFAULT_DASHBOARD_SHORTCUTS = ['habits', 'journal', 'goals', 'calendar', 'pomodoro'];

interface Settings {
  hideFinanceBalance: boolean;
  autoStartPomodoro: boolean;
  dailyNotification: boolean;
  hapticEnabled: boolean;
  dashboardShortcuts: string[];
}

interface SettingsContextType {
  settings: Settings;
  updateSetting: (key: keyof Settings, value: any) => void;
  loading: boolean;
}

const defaultSettings: Settings = {
  hideFinanceBalance: false,
  autoStartPomodoro: false,
  dailyNotification: true,
  hapticEnabled: true,
  dashboardShortcuts: DEFAULT_DASHBOARD_SHORTCUTS,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    const sub = DeviceEventEmitter.addListener('whenya:data-synced', loadSettings);
    return () => sub.remove();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await getData(STORAGE_KEYS.SETTINGS);
      if (saved) {
        const loadedDailyNotif = Boolean(saved.dailyNotification ?? defaultSettings.dailyNotification);
        setSettings({ 
          ...defaultSettings, 
          ...saved,
          hideFinanceBalance: Boolean(saved.hideFinanceBalance ?? defaultSettings.hideFinanceBalance),
          autoStartPomodoro: Boolean(saved.autoStartPomodoro ?? defaultSettings.autoStartPomodoro),
          dailyNotification: loadedDailyNotif,
          hapticEnabled: Boolean(saved.hapticEnabled ?? defaultSettings.hapticEnabled),
          dashboardShortcuts: Array.isArray(saved.dashboardShortcuts) && saved.dashboardShortcuts.length > 0
            ? saved.dashboardShortcuts
            : defaultSettings.dashboardShortcuts,
        });
        if (loadedDailyNotif) {
          scheduleDailyHabitReminder().catch(() => {});
        }
      } else if (defaultSettings.dailyNotification) {
        scheduleDailyHabitReminder().catch(() => {});
      }
    } catch (e) {
      console.warn('Failed to load settings', e);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof Settings, value: any) => {
    const castedValue = Array.isArray(value)
      ? value
      : typeof value === 'boolean'
        ? value
        : (value === 'true' || value === true);
    const newSettings = { ...settings, [key]: castedValue };
    setSettings(newSettings);
    await setData(STORAGE_KEYS.SETTINGS, newSettings);

    if (key === 'dailyNotification') {
      if (castedValue) {
        scheduleDailyHabitReminder().catch(() => {});
      } else {
        cancelDailyHabitReminder().catch(() => {});
      }
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
