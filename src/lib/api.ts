import Constants from 'expo-constants';

/**
 * In Expo Go, `fetch('/api/...')` needs an absolute URL pointing at the dev
 * server's host, since there's no same-origin page to resolve a relative
 * path against.
 */
export function getApiUrl(path: string): string {
  const hostUri = Constants.expoConfig?.hostUri;
  return hostUri ? `http://${hostUri}${path}` : path;
}

/**
 * `AbortSignal.timeout()` isn't implemented in the Hermes engine this app
 * ships with, so time out fetches manually via AbortController instead.
 */
export async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}
