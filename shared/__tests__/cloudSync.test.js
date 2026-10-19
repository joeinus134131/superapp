import { setCloudSyncDriver, pushToCloud, pullFromCloud } from '../lib/cloudSync';
test('shared push and pull use the configured authenticated host driver', async () => {
  const driver = jest.fn(async () => ({ uploaded: 1, downloaded: 2 }));
  setCloudSyncDriver(driver);
  await expect(pushToCloud()).resolves.toEqual({ uploaded: 1, downloaded: 2 });
  await expect(pullFromCloud()).resolves.toEqual({ uploaded: 1, downloaded: 2 });
  expect(driver).toHaveBeenCalledTimes(2);
  setCloudSyncDriver(null);
  await expect(pushToCloud()).rejects.toThrow('belum dikonfigurasi');
});
