/**
 * Simple in-memory TTL cache with request deduplication.
 * Entries expire after `ttlMs` milliseconds.
 */
export class TtlCache<T> {
  private readonly cache = new Map<string, { value: T; expiresAt: number }>();
  private readonly inflight = new Map<string, Promise<T>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  delete(key: string): void {
    this.cache.delete(key);
    this.inflight.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.inflight.clear();
  }

  /**
   * Get a cached value or refresh it. Concurrent calls with the same key
   * share a single in-flight promise to avoid thundering-herd DB queries.
   */
  async getOrRefresh(key: string, fn: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const existing = this.inflight.get(key);
    if (existing) return existing;

    const promise = fn()
      .then((value) => {
        this.set(key, value);
        this.inflight.delete(key);
        return value;
      })
      .catch((err) => {
        this.inflight.delete(key);
        throw err;
      });

    this.inflight.set(key, promise);
    return promise;
  }
}
