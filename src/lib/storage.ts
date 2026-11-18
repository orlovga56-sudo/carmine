const PREFIX = 'carmine.v1.'

export function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* quota or private mode — the app still works in memory */
  }
}

export function removeStored(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* noop */
  }
}

export function clearAll(): void {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(PREFIX))
      .forEach((key) => localStorage.removeItem(key))
  } catch {
    /* noop */
  }
}

/* Small TTL cache used for network responses. */
interface Entry { value: unknown; expires: number }
const cache = new Map<string, Entry>()

export function cacheGet<T>(key: string): T | undefined {
  const hit = cache.get(key)
  if (!hit) return undefined
  if (hit.expires < Date.now()) {
    cache.delete(key)
    return undefined
  }
  return hit.value as T
}

export function cacheSet<T>(key: string, value: T, ttlMs = 15 * 60 * 1000): void {
  if (cache.size > 400) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
  cache.set(key, { value, expires: Date.now() + ttlMs })
}
