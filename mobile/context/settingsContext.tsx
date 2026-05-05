import React, { createContext, useContext, useState, useEffect } from 'react';
import { getData, setData, STORAGE_KEYS } from '../lib/storage';

interface Settings {
  hideFinanceBalance: boolean;
  autoStartPomodoro: boolean;
  dailyNotification: boolean;
  hapticEnabled: boolean;
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
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await getData(STORAGE_KEYS.SETTINGS);
      if (saved) {
        setSettings({ 
          ...defaultSettings, 
          ...saved,
          hideFinanceBalance: Boolean(saved.hideFinanceBalance ?? defaultSettings.hideFinanceBalance),
          autoStartPomodoro: Boolean(saved.autoStartPomodoro ?? defaultSettings.autoStartPomodoro),
          dailyNotification: Boolean(saved.dailyNotification ?? defaultSettings.dailyNotification),
          hapticEnabled: Boolean(saved.hapticEnabled ?? defaultSettings.hapticEnabled),
        });
      }
    } catch (e) {
      console.warn('Failed to load settings', e);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof Settings, value: any) => {
    // Force boolean value for settings that are supposed to be boolean
    const castedValue = typeof value === 'boolean' ? value : (value === 'true' || value === true);
    const newSettings = { ...settings, [key]: castedValue };
    setSettings(newSettings);
    await setData(STORAGE_KEYS.SETTINGS, newSettings);
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
