import Constants from 'expo-constants'

export interface MobileSupabaseConfig {
  url: string
  anonKey: string
  source: string
}

function readExpoExtra() {
  const extra = Constants.expoConfig?.extra ?? {}

  return {
    url: typeof extra.supabaseUrl === 'string' ? extra.supabaseUrl : '',
    anonKey: typeof extra.supabaseAnonKey === 'string' ? extra.supabaseAnonKey : '',
  }
}

export function getMobileSupabaseConfig(): MobileSupabaseConfig {
  const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
  const envAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
  const extraConfig = readExpoExtra()

  if (envUrl && envAnonKey) {
    return {
      url: envUrl,
      anonKey: envAnonKey,
      source: 'expo-public-env',
    }
  }

  if (extraConfig.url && extraConfig.anonKey) {
    return {
      ...extraConfig,
      source: 'expo-extra',
    }
  }

  return {
    url: envUrl || extraConfig.url || '',
    anonKey: envAnonKey || extraConfig.anonKey || '',
    source: 'missing',
  }
}
