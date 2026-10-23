// Keep authentication requests bounded on both Hermes and browsers without
// relying on AbortSignal.timeout, which is not present in every native runtime.
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (init.signal?.aborted) abort();
  init.signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 10000);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); init.signal?.removeEventListener('abort', abort); }
}
