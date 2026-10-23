import { authFetch } from '../lib/authFetch';
const original = global.fetch;
beforeEach(() => jest.useFakeTimers());
afterEach(() => { jest.useRealTimers(); global.fetch = original; });
test('stalled auth requests are aborted instead of blocking login indefinitely', async () => {
  global.fetch = jest.fn((url, options) => new Promise((resolve, reject) => { options.signal.addEventListener('abort', () => reject(new Error('aborted'))); }));
  const result = authFetch('https://auth.test'); const check = expect(result).rejects.toThrow('aborted');
  await jest.advanceTimersByTimeAsync(10000); await check; expect(jest.getTimerCount()).toBe(0);
});
test('caller cancellation propagates and successful requests clear the timeout', async () => {
  const controller = new AbortController();
  global.fetch = jest.fn(async (url, options) => { expect(options.signal.aborted).toBe(true); return { ok: false }; });
  controller.abort(); await authFetch('https://auth.test', { signal: controller.signal }); expect(jest.getTimerCount()).toBe(0);
});
