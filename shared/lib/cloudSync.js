// Shared consumers use the same authenticated database transport as their host.
// Platform adapters configure the driver at startup; never call the retired /sync API.
let driver = null;
let timer;
export function setCloudSyncDriver(sync) { driver = sync; }
function runSync() {
  if (!driver) return Promise.reject(new Error('Sinkronisasi cloud belum dikonfigurasi pada platform ini.'));
  return driver();
}
export async function pushToCloud() { return runSync(); }
export async function pullFromCloud() { return runSync(); }
export function triggerAutoSync() {
  clearTimeout(timer);
  timer = setTimeout(() => runSync().catch(error => console.error('[Cloud sync]', error)), 3000);
}
