const cache = new Map<string, { value: unknown; expiresAt: number }>();

export const memcache = {
  get<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry || entry.expiresAt <= Date.now()) {
      cache.delete(key);
      return null;
    }
    return entry.value as T;
  },
  set(key: string, value: unknown, ttlSeconds: number) {
    cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  },
  del(key: string) {
    cache.delete(key);
  },
};
