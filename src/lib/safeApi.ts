/**
 * Fast Safe Fetch with hard timeout guard (default 800ms).
 * Guarantees that any server or backend fetch call NEVER hangs the browser's
 * connection pool or freezes user interactions on deployed hosting (e.g. Firebase Hosting).
 */
export async function safeFetch(
  url: string, 
  optionsOrTimeout?: RequestInit | number, 
  timeoutMs?: number
): Promise<Response | null> {
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    return null;
  }

  let options: RequestInit = {};
  let timeout = 800;

  if (typeof optionsOrTimeout === 'number') {
    timeout = optionsOrTimeout;
  } else if (optionsOrTimeout) {
    options = optionsOrTimeout;
    if (typeof timeoutMs === 'number') {
      timeout = timeoutMs;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    try { controller.abort(); } catch (_) {}
  }, timeout);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timer);
    return res;
  } catch (_) {
    clearTimeout(timer);
    return null;
  }
}

/**
 * Fast Safe JSON Fetch - parses JSON safely with timeout guard
 */
export async function safeFetchJson<T = any>(
  url: string, 
  optionsOrTimeout?: RequestInit | number, 
  timeoutMs?: number
): Promise<T | null> {
  try {
    const res = await safeFetch(url, optionsOrTimeout, timeoutMs);
    if (res && res.ok) {
      return (await res.json()) as T;
    }
  } catch (_) {}
  return null;
}
