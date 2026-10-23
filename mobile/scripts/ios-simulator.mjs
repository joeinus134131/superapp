import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(path.join(project, 'app.json'), 'utf8')).expo;
const port = Number(process.env.WHENYA_METRO_PORT || 8081);
const deviceName = 'Whenya iPhone';
const require = createRequire(import.meta.url);

function command(args, json = false) {
  const result = spawnSync('xcrun', args, { encoding: 'utf8', timeout: 600000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || `xcrun ${args.join(' ')} failed`);
  return json ? JSON.parse(result.stdout) : result.stdout.trim();
}

async function main() {
  if (process.platform !== 'darwin') throw new Error('iOS Simulator memerlukan macOS dan Xcode.');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('WHENYA_METRO_PORT tidak valid.');
  const runtimes = command(['simctl', 'list', 'runtimes', '--json'], true).runtimes
    .filter(item => item.isAvailable && item.identifier.includes('.iOS-'))
    .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
  if (!runtimes.length) throw new Error('Runtime iOS belum tersedia. Jalankan: xcodebuild -downloadPlatform iOS -architectureVariant arm64');
  const runtime = runtimes[0];
  const devices = command(['simctl', 'list', 'devices', '--json'], true).devices[runtime.identifier] || [];
  let device = devices.find(item => item.name === deviceName && item.isAvailable);
  if (!device) {
    const types = command(['simctl', 'list', 'devicetypes', '--json'], true).devicetypes;
    const type = types.find(item => item.name === 'iPhone 17') || types.findLast(item => item.name.startsWith('iPhone'));
    if (!type) throw new Error('Device type iPhone tidak tersedia di Xcode.');
    device = { udid: command(['simctl', 'create', deviceName, type.identifier, runtime.identifier]), state: 'Shutdown' };
  }
  console.log(`Menjalankan ${deviceName} (${runtime.name}): ${device.udid}`);
  if (device.state !== 'Booted') command(['simctl', 'boot', device.udid]);
  const opened = spawnSync('open', ['-a', 'Simulator', '--args', '-CurrentDeviceUDID', device.udid], { stdio: 'inherit' });
  if (opened.status !== 0) throw new Error('Simulator.app gagal dibuka.');
  // simctl can exit 0 even when the terminal boot status is a migration failure.
  const bootStatus = command(['simctl', 'bootstatus', device.udid, '-b']);
  if (/Migration Failed|isTerminal=YES[^\n]*Failed/i.test(bootStatus)) {
    console.warn('iOS melaporkan Data Migration Failed. Layanan aplikasi akan diperiksa melalui pemasangan dan pembukaan Expo Go; peringatan sistem ini belum dianggap teratasi.');
  }
  const booted = command(['simctl', 'list', 'devices', '--json'], true).devices[runtime.identifier]
    ?.some(item => item.udid === device.udid && item.state === 'Booted');
  if (!booted) throw new Error('Simulator berhenti sebelum aplikasi dapat dibuka. Jalankan launcher lagi setelah perangkat siap.');

  const base = `http://127.0.0.1:${port}`;
  let running = false;
  try {
    const status = await fetch(`${base}/status`, { signal: AbortSignal.timeout(3000) });
    running = (await status.text()).includes('packager-status:running');
  } catch { /* Start Metro below when there is no reachable server. */ }
  if (running) {
    const response = await fetch(`${base}/_expo/open?platform=ios`, { signal: AbortSignal.timeout(5000) });
    const info = await response.json();
    if (!response.ok || info.appId !== config.ios.bundleIdentifier) {
      throw new Error(`Port ${port} dipakai proyek lain atau server tidak mendukung peluncuran. Pilih WHENYA_METRO_PORT lain.`);
    }
    if (info.runtime !== 'expo') throw new Error('Server aktif harus memakai Expo Go (--go).');
    // Use the downloader from this project's pinned Expo CLI, but install on the
    // exact UUID above: the generic open endpoint may select another simulator.
    const expoRoot = path.dirname(require.resolve('expo/package.json'));
    const cliEntry = require.resolve('@expo/cli', { paths: [expoRoot] });
    const cliRoot = cliEntry.slice(0, cliEntry.lastIndexOf('/build/'));
    const { downloadExpoGoAsync } = require(path.join(cliRoot, 'build/src/utils/downloadExpoGoAsync.js'));
    const sdkVersion = `${require('expo/package.json').version.split('.')[0]}.0.0`;
    const appPath = await downloadExpoGoAsync('ios', { sdkVersion });
    const installed = spawnSync('xcrun', ['simctl', 'get_app_container', device.udid, 'host.exp.Exponent', 'app'], { encoding: 'utf8', timeout: 30000 });
    const version = app => spawnSync('/usr/bin/plutil', ['-extract', 'CFBundleShortVersionString', 'raw', '-o', '-', path.join(app, 'Info.plist')], { encoding: 'utf8', timeout: 5000 });
    const cachedVersion = version(appPath);
    const installedVersion = installed.status === 0 ? version(installed.stdout.trim()) : null;
    const matches = cachedVersion.status === 0 && installedVersion?.status === 0 && cachedVersion.stdout.trim() === installedVersion.stdout.trim();
    if (!matches) command(['simctl', 'install', device.udid, appPath]);
    const projectUrl = new URL(info.url);
    projectUrl.hostname = '127.0.0.1';
    command(['simctl', 'openurl', device.udid, projectUrl.toString()]);
    console.log('Whenya dibuka melalui server Expo yang sudah berjalan. Fast Refresh mengikuti perubahan kode.');
    return;
  }
  const child = spawn('pnpm', ['exec', 'expo', 'start', '--go', '--ios', '--localhost', '--port', String(port)], { cwd: project, stdio: 'inherit' });
  child.on('error', error => { console.error(error.message); process.exitCode = 1; });
  child.on('exit', code => { process.exitCode = code ?? 1; });
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
