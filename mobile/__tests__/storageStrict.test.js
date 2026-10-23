jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn() } }));
jest.mock('../lib/databaseSync', () => ({ scheduleDatabaseSync: jest.fn() }));
jest.mock('../lib/authToken', () => ({ getValidAuthToken: jest.fn() }));
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getData, setData, STORAGE_KEYS } from '../lib/storage';
beforeEach(() => { jest.resetAllMocks(); jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => jest.restoreAllMocks());
test('strict read exposes failure so the UI can distinguish unavailable data from empty', async () => {
  AsyncStorage.getItem.mockRejectedValue(new Error('offline storage'));
  await expect(getData(STORAGE_KEYS.TASKS, true)).rejects.toThrow('offline storage');
  await expect(getData(STORAGE_KEYS.TASKS)).resolves.toBeNull();
});
test('strict write rejects failed persistence while legacy callers keep their behavior', async () => {
  AsyncStorage.getItem.mockResolvedValue(null);
  AsyncStorage.setItem.mockRejectedValue(new Error('quota'));
  await expect(setData(STORAGE_KEYS.TASKS, [], true)).rejects.toThrow('quota');
  await expect(setData(STORAGE_KEYS.TASKS, [])).resolves.toBeUndefined();
});
