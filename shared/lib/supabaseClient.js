import { createClient } from '@supabase/supabase-js';

let runtimeConfig = {
  url: '',
  anonKey: '',
  source: 'unconfigured',
};

let clientCache = null;
let clientCacheKey = '';

function readEnvConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

  return {
    url,
    anonKey,
    source: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? 'next-public-env'
      : process.env.EXPO_PUBLIC_SUPABASE_URL
        ? 'expo-public-env'
        : 'unconfigured',
  };
}

function buildIssues(url, anonKey) {
  const issues = [];

  if (!url) {
    issues.push('SUPABASE_URL is missing');
  } else if (!/^https:\/\/.+\.supabase\.co$/i.test(url)) {
    issues.push('SUPABASE_URL must be a valid https://<project>.supabase.co URL');
  }

  if (!anonKey) {
    issues.push('SUPABASE_ANON_KEY is missing');
  }

  return issues;
}

function resolveConfig() {
  const envConfig = readEnvConfig();
  const merged = {
    url: runtimeConfig.url || envConfig.url,
    anonKey: runtimeConfig.anonKey || envConfig.anonKey,
    source: runtimeConfig.url || runtimeConfig.anonKey ? runtimeConfig.source : envConfig.source,
  };

  const issues = buildIssues(merged.url, merged.anonKey);

  return {
    ...merged,
    hasKey: Boolean(merged.anonKey),
    isConfigured: issues.length === 0,
    issues,
  };
}

function getClientOptions() {
  return {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
      detectSessionInUrl: false,
    },
  };
}

export function configureSupabaseRuntime(config = {}) {
  runtimeConfig = {
    url: config.url || '',
    anonKey: config.anonKey || '',
    source: config.source || 'runtime',
  };
  clientCache = null;
  clientCacheKey = '';
}

export function getSupabaseConfigStatus() {
  const config = resolveConfig();

  return {
    url: config.url,
    hasKey: config.hasKey,
    isConfigured: config.isConfigured,
    issues: config.issues,
    source: config.source,
    maskedUrl: config.url ? `${config.url.slice(0, 24)}...` : 'EMPTY',
  };
}

export function getSupabaseClient() {
  const config = resolveConfig();
  const cacheKey = `${config.url}::${config.anonKey}`;

  if (!clientCache || clientCacheKey !== cacheKey) {
    clientCache = createClient(
      config.url || 'https://placeholder.supabase.co',
      config.anonKey || 'placeholder_key',
      getClientOptions()
    );
    clientCacheKey = cacheKey;
  }

  return clientCache;
}

export async function checkSupabaseConnection() {
  const config = resolveConfig();

  if (!config.isConfigured) {
    return {
      ok: false,
      code: 'CONFIG_INVALID',
      message: config.issues.join(', '),
      details: config,
    };
  }

  try {
    const response = await fetch(`${config.url}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        code: 'SUPABASE_UNREACHABLE',
        message: `Supabase responded with HTTP ${response.status}`,
        details: config,
      };
    }

    return {
      ok: true,
      code: 'OK',
      message: 'Supabase connection is ready',
      details: config,
    };
  } catch (error) {
    return {
      ok: false,
      code: 'NETWORK_ERROR',
      message: error instanceof Error ? error.message : 'Unknown network error',
      details: config,
    };
  }
}

export function assertSupabaseReady() {
  const status = getSupabaseConfigStatus();

  if (!status.isConfigured) {
    throw new Error(`Supabase is not configured: ${status.issues.join(', ')}`);
  }

  return status;
}

export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      return getSupabaseClient()[prop];
    },
  }
);
