import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const values = {};
for (const file of ['.env', '.env.local']) {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) continue;
  for (const line of fs.readFileSync(target, 'utf8').split('\n')) {
    const match = line.match(/^\s*(EXPO_PUBLIC_SUPABASE_URL|EXPO_PUBLIC_SUPABASE_ANON_KEY)\s*=\s*(.*?)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || values.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || values.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const issues = [];
if (!url || !/^https:\/\/[^/]+\.supabase\.co\/?$/.test(url)) issues.push('EXPO_PUBLIC_SUPABASE_URL belum valid.');
if (!anonKey) issues.push('EXPO_PUBLIC_SUPABASE_ANON_KEY belum tersedia.');
if (anonKey?.startsWith('sb_secret_')) issues.push('Secret key tidak boleh dipakai pada EXPO_PUBLIC_*; gunakan publishable/anon key.');
try { if (JSON.parse(Buffer.from(anonKey?.split('.')[1] || '', 'base64url')).role === 'service_role') issues.push('Service-role key tidak boleh masuk ke aplikasi.'); } catch { /* Publishable keys are not JWTs. */ }
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
if (app.scheme !== 'selfone') issues.push('Scheme app harus cocok dengan callback selfone://auth/callback.');
if (!fs.existsSync(path.join(root, 'app/auth/callback.tsx'))) issues.push('Route /auth/callback belum tersedia.');
for (const name of ['expo-web-browser', 'expo-dev-client', 'expo-secure-store']) {
  try { require.resolve(name); } catch { issues.push(`Dependency ${name} belum terpasang.`); }
}
if (!issues.length && !process.argv.includes('--offline')) {
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/auth/v1/settings`, { headers: { apikey: anonKey }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) issues.push(`Pengaturan Supabase tidak dapat dibaca (HTTP ${response.status}).`);
    else {
      const settings = await response.json();
      for (const provider of ['google']) {
        const enabled = settings.external?.[provider] === true;
        console.log(`${provider}: ${enabled ? 'aktif' : 'belum aktif'}`);
        if (!enabled) issues.push(`Aktifkan dan konfigurasi provider ${provider} di Supabase.`);
      }
    }
  } catch { issues.push('Pengaturan provider tidak dapat dijangkau. Cek jaringan lalu coba lagi.'); }
}
console.log('Callback aplikasi: selfone://auth/callback');
console.log('Redirect recovery: selfone://auth/callback?intent=recovery');
if (issues.length) {
  console.error(issues.map(issue => `- ${issue}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(process.argv.includes('--offline') ? 'Konfigurasi lokal lulus; provider belum diperiksa.' : 'Pemeriksaan lokal/provider lulus. Redirect allowlist dan login nyata tetap harus diverifikasi pada development build.');
}
