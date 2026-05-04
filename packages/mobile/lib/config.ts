import Constants from 'expo-constants';

/**
 * Centrally manages environment variables for the mobile app.
 * In a production environment, these should be managed via EAS secrets or .env files.
 */

export const CONFIG = {
  SUPABASE_URL: Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  EAS_PROJECT_ID: Constants.expoConfig?.extra?.eas?.projectId || '',
  VERSION: Constants.expoConfig?.version || '1.0.0',
  APP_NAME: Constants.expoConfig?.name || 'SelfOne',
};

export const isDev = __DEV__;
