/**
 * Lightweight in-memory + localStorage cache with QuotaExceededError protection
 * and Stale-While-Revalidate (SWR) capabilities.
 */

const memoryCache = new Map<string, { data: any; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<any>>();

const CACHE_PREFIX = 'am_cache_v1_';

export const cacheService = {
  /**
   * Synchronously reads from memory or localStorage.
   * Returns fallback if key is not present or invalid.
   */
  get<T>(key: string, fallback: T): T {
    const mem = memoryCache.get(key);
    if (mem !== undefined) {
      return mem.data as T;
    }

    if (typeof window === 'undefined') return fallback;

    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      // Hydrate memory cache
      memoryCache.set(key, { data: parsed, timestamp: Date.now() });
      return parsed as T;
    } catch {
      return fallback;
    }
  },

  /**
   * Safely writes to memory and localStorage with QuotaExceededError handling.
   */
  set<T>(key: string, data: T): void {
    memoryCache.set(key, { data, timestamp: Date.now() });

    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
    } catch (e: any) {
      // If quota exceeded, clear older non-essential cache keys
      if (e?.name === 'QuotaExceededError' || e?.code === 22) {
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(CACHE_PREFIX) && !k.includes('teams')) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
          localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
        } catch {
          // If still failing, keep in memory only
        }
      }
    }
  },

  /**
   * Removes an entry from both memory and localStorage.
   */
  remove(key: string): void {
    memoryCache.delete(key);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(CACHE_PREFIX + key);
      } catch {}
    }
  },

  /**
   * Deduplicates concurrent in-flight async requests for the same key.
   */
  dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const existing = inFlightRequests.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = fetcher().finally(() => {
      inFlightRequests.delete(key);
    });

    inFlightRequests.set(key, promise);
    return promise;
  },

  /**
   * Clears the entire application cache.
   */
  clear(): void {
    memoryCache.clear();
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(CACHE_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch {}
    }
  }
};
