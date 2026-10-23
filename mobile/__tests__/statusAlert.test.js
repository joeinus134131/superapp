jest.mock('react-native', () => {
  const emitter = new (require('events').EventEmitter)();
  return { Platform: { OS: 'ios' }, DeviceEventEmitter: {
    emit: (name, payload) => emitter.emit(name, payload),
    addListener: (name, listener) => { emitter.on(name, listener); return { remove: () => emitter.off(name, listener) }; },
  } };
});

import { DeviceEventEmitter } from 'react-native';
import { statusAlert, showStatusAlert, STATUS_ALERT_EVENT } from '../lib/statusAlert';
import * as Haptics from 'expo-haptics';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

describe('statusAlert dispatch utility', () => {
  let emitted = [];
  let subscription;

  beforeEach(() => {
    emitted = [];
    jest.clearAllMocks();
    subscription = DeviceEventEmitter.addListener(STATUS_ALERT_EVENT, payload => {
      emitted.push(payload);
    });
  });

  afterEach(() => {
    subscription.remove();
  });

  test('statusAlert.success emits payload and triggers success haptics', () => {
    statusAlert.success('Sinkronisasi Berhasil', 'Data cloud telah diperbarui');

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toEqual(expect.objectContaining({
      type: 'success',
      title: 'Sinkronisasi Berhasil',
      message: 'Data cloud telah diperbarui',
    }));
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
  });

  test('statusAlert.error emits payload and triggers error haptics', () => {
    statusAlert.error('Gagal Menyimpan', 'Terjadi kesalahan sistem');

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toEqual(expect.objectContaining({
      type: 'error',
      title: 'Gagal Menyimpan',
      message: 'Terjadi kesalahan sistem',
    }));
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('error');
  });

  test('statusAlert.warning emits warning payload and warning haptics', () => {
    statusAlert.warning('Konflik Data', 'Pilih salah satu versi');

    expect(emitted).toHaveLength(1);
    expect(emitted[0].type).toBe('warning');
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning');
  });

  test('statusAlert.info emits info payload with light impact haptics', () => {
    statusAlert.info('Tugas Dihapus');

    expect(emitted).toHaveLength(1);
    expect(emitted[0].type).toBe('info');
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  test('showStatusAlert allows custom duration', () => {
    showStatusAlert({
      type: 'success',
      title: 'Custom',
      duration: 5000,
    });

    expect(emitted).toHaveLength(1);
    expect(emitted[0].duration).toBe(5000);
  });
});
