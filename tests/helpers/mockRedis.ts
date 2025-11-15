/**
 * Mock Redis implementation for testing
 * Simulates Upstash Redis behavior in tests
 */

interface RedisEntry {
  value: any;
  expiresAt: number | null;
}

export class MockRedisClient {
  private store: Map<string, RedisEntry> = new Map();

  async get(key: string): Promise<any> {
    const entry = this.store.get(key);

    // Check if expired
    if (entry && entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry?.value || null;
  }

  async set(key: string, value: any, options?: { ex?: number }): Promise<void> {
    const expiresAt = options?.ex ? Date.now() + options.ex * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async incr(key: string): Promise<number> {
    const entry = this.store.get(key);

    // Check if expired
    if (entry && entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      this.store.set(key, { value: 1, expiresAt: null });
      return 1;
    }

    const currentValue = entry?.value || 0;
    const newValue = Number(currentValue) + 1;

    this.store.set(key, {
      value: newValue,
      expiresAt: entry?.expiresAt || null
    });

    return newValue;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;

    entry.expiresAt = Date.now() + seconds * 1000;
    return true;
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async flushAll(): Promise<void> {
    this.store.clear();
  }

  // Check internal state (useful for testing)
  _getStore(): Map<string, RedisEntry> {
    return this.store;
  }

  _getStoreSize(): number {
    return this.store.size;
  }

  _getEntry(key: string): RedisEntry | undefined {
    return this.store.get(key);
  }
}

/**
 * Factory function to create a mock Redis client
 */
export function createMockRedis(): MockRedisClient {
  return new MockRedisClient();
}

/**
 * Environment setup for tests using mock Redis
 */
export function setupMockRedisEnv(): void {
  process.env.UPSTASH_REDIS_REST_URL = 'http://localhost:8079';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'mock-token';
}

/**
 * Cleanup mock Redis environment
 */
export function cleanupMockRedisEnv(): void {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
}
