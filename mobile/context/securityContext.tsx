import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const PIN_KEY = 'superapp_app_pin';

interface SecurityContextType {
  isLocked: boolean;
  hasPIN: boolean;
  isBiometricsEnabled: boolean;
  isSupported: boolean;
  lockApp: () => void;
  unlockApp: (pin: string) => Promise<boolean>;
  setPIN: (pin: string) => Promise<void>;
  clearPIN: () => Promise<void>;
  toggleBiometrics: (enabled: boolean) => Promise<void>;
  authenticateWithBiometrics: () => Promise<boolean>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [hasPIN, setHasPIN] = useState(false);
  const [correctPIN, setCorrectPIN] = useState<string | null>(null);
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const loadSecurity = async () => {
      try {
        const pin = await SecureStore.getItemAsync(PIN_KEY);
        const bioEnabled = await SecureStore.getItemAsync('superapp_bio_enabled');
        
        // Check hardware support
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setIsSupported(hasHardware && isEnrolled);

        if (pin) {
          setHasPIN(true);
          setCorrectPIN(pin);
          setIsLocked(true);
        }
        
        if (bioEnabled === 'true') {
          setIsBiometricsEnabled(true);
        }
      } catch (e) {
        console.error('Failed to load security settings:', e);
      }
    };
    loadSecurity();
  }, []);

  const lockApp = () => {
    if (hasPIN) setIsLocked(true);
  };

  const unlockApp = async (pin: string) => {
    if (pin === correctPIN) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const authenticateWithBiometrics = async () => {
    if (!isBiometricsEnabled) return false;
    
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!hasHardware || !isEnrolled) return false;
      
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock SuperApp',
        fallbackLabel: 'Use PIN',
      });
      
      if (result.success) {
        setIsLocked(false);
        return true;
      }
    } catch (e) {
      console.error('Biometric authentication failed:', e);
    }
    return false;
  };

  const toggleBiometrics = async (enabled: boolean) => {
    try {
      await SecureStore.setItemAsync('superapp_bio_enabled', enabled ? 'true' : 'false');
      setIsBiometricsEnabled(enabled);
    } catch (e) {
      console.error('Failed to save biometric setting:', e);
    }
  };

  const setPIN = async (pin: string) => {
    try {
      await SecureStore.setItemAsync(PIN_KEY, pin);
      setCorrectPIN(pin);
      setHasPIN(true);
    } catch (e) {
      console.error('Failed to save PIN to SecureStore:', e);
    }
  };

  const clearPIN = async () => {
    try {
      await SecureStore.deleteItemAsync(PIN_KEY);
      await SecureStore.deleteItemAsync('superapp_bio_enabled');
      setCorrectPIN(null);
      setHasPIN(false);
      setIsLocked(false);
      setIsBiometricsEnabled(false);
    } catch (e) {
      console.error('Failed to clear security settings:', e);
    }
  };

  return (
    <SecurityContext.Provider value={{ 
      isLocked, hasPIN, isBiometricsEnabled, isSupported,
      lockApp, unlockApp, setPIN, clearPIN, 
      toggleBiometrics, authenticateWithBiometrics 
    }}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) throw new Error('useSecurity must be used within SecurityProvider');
  return context;
};
