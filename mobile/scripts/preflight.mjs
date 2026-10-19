import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const envPath = path.join(rootDir, '.env.local');
const appJsonPath = path.join(rootDir, 'app.json');
const target = process.argv[2] || 'general';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .reduce((acc, line) => {
      const [key, ...rest] = line.split('=');
      acc[key] = rest.join('=').trim();
      return acc;
    }, {});
}

function resolveSupabaseConfig() {
  const envConfig = readEnvFile(envPath);
  const appJson = readJson(appJsonPath);
  const extra = appJson.expo?.extra || {};

  return {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL || envConfig.EXPO_PUBLIC_SUPABASE_URL || extra.supabaseUrl || '',
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || envConfig.EXPO_PUBLIC_SUPABASE_ANON_KEY || extra.supabaseAnonKey || '',
    source: process.env.EXPO_PUBLIC_SUPABASE_URL
      ? 'process-env'
      : envConfig.EXPO_PUBLIC_SUPABASE_URL
        ? '.env.local'
        : extra.supabaseUrl
          ? 'app.json extra'
          : 'missing',
  };
}

function checkInstalledDependencies() {
  const packageJson = readJson(packageJsonPath);
  const deps = packageJson.dependencies || {};

  const missing = Object.keys(deps).filter((name) => {
    try {
      require.resolve(name, { paths: [rootDir] });
      return false;
    } catch (e) {
      if (e.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
        return false;
      }
      try {
        require.resolve(`${name}/package.json`, { paths: [rootDir] });
        return false;
      } catch {
        return true;
      }
    }
  });

  return missing;
}

async function checkSupabase(url, anonKey) {
  if (!url || !anonKey) {
    return {
      ok: false,
      message: 'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY',
    };
  }

  if (!/^https:\/\/.+\.supabase\.co$/i.test(url)) {
    return {
      ok: false,
      message: 'Supabase URL format is invalid',
    };
  }

  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    if (!response.ok) {
      return {
        ok: false,
        message: `Supabase responded with HTTP ${response.status}`,
      };
    }

    return {
      ok: true,
      message: 'Supabase is reachable',
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Unknown network error',
    };
  }
}

function commandExists(command) {
  const result = spawnSync('which', [command], { encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
}

function resolveAndroidSdkPath() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(process.env.HOME || '', 'Library/Android/sdk'),
    path.join(process.env.HOME || '', 'Android/Sdk'),
  ].filter(Boolean);

  for (const sdkPath of candidates) {
    if (fs.existsSync(sdkPath)) {
      return sdkPath;
    }
  }

  return '';
}

function getAdbPath(sdkPath) {
  const platform = process.platform === 'win32' ? 'adb.exe' : 'adb';
  const candidates = [
    commandExists('adb'),
    sdkPath ? path.join(sdkPath, 'platform-tools', platform) : '',
  ].filter(Boolean);

  for (const adbPath of candidates) {
    if (fs.existsSync(adbPath) || adbPath.includes('/adb') || adbPath.endsWith('adb.exe')) {
      return adbPath;
    }
  }

  return '';
}

function checkAndroidTooling() {
  const sdkPath = resolveAndroidSdkPath();
  const adbPath = getAdbPath(sdkPath);
  const issues = [];

  if (!sdkPath) {
    issues.push('Android SDK tidak ditemukan. Set ANDROID_HOME atau install SDK ke ~/Library/Android/sdk');
  }

  if (!adbPath) {
    issues.push('adb tidak ditemukan. Pastikan platform-tools terinstall dan masuk PATH');
  }

  return {
    ok: issues.length === 0,
    sdkPath,
    adbPath,
    issues,
  };
}

async function main() {
  console.log('Running SuperApp mobile preflight...');

  const missingDeps = checkInstalledDependencies();
  if (missingDeps.length > 0) {
    console.error('\nMissing installed packages:');
    for (const dep of missingDeps) {
      console.error(`- ${dep}`);
    }
    process.exit(1);
  }

  if (target === 'android') {
    const android = checkAndroidTooling();
    if (!android.ok) {
      console.error('\nAndroid tooling check failed:');
      for (const issue of android.issues) {
        console.error(`- ${issue}`);
      }
      if (!android.sdkPath) {
        console.error('- Install Android Studio, then install Android SDK + Platform Tools from SDK Manager');
      }
      process.exit(1);
    }

    console.log(`Android SDK: ${android.sdkPath}`);
    console.log(`adb: ${android.adbPath}`);
  }

  const config = resolveSupabaseConfig();
  console.log(`Supabase config source: ${config.source}`);

  const supabaseResult = await checkSupabase(config.url, config.anonKey);
  if (!supabaseResult.ok) {
    console.error(`Supabase check failed: ${supabaseResult.message}`);
    process.exit(1);
  }

  console.log('Preflight passed. Mobile dependencies and Supabase connection look ready.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
