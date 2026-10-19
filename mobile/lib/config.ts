import Constants from 'expo-constants';

/**
 * Centrally manages environment variables for the mobile app.
 * In a production environment, these should be managed via EAS secrets or .env files.
 */

function getApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  // If explicitly configured to an external domain (e.g. production https://...)
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1') && !envUrl.includes('10.254.29.39')) {
    return envUrl;
  }

  // Di Expo Go, hostUri berisi IP komputer developer (contoh: "10.170.228.39:8081")
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost || (Constants as any).manifest2?.extra?.expoClient?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) {
      return `http://${ip}:8080/api/v1`;
    }
  }

  return envUrl || 'http://localhost:8080/api/v1';
}

export const CONFIG = {
  SUPABASE_URL: Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  EAS_PROJECT_ID: Constants.expoConfig?.extra?.eas?.projectId || process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '',
  VERSION: Constants.expoConfig?.version || '1.0.0',
  APP_NAME: Constants.expoConfig?.name || 'Whenya',
  API_URL: getApiUrl(),
};

export const isDev = __DEV__;

