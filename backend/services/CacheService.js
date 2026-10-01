const redis = require('redis');

class CacheService {
  constructor() {
    this.client = null;
    this.memoryCache = new Map();
    this.isRedisConnected = false;
    this.maxCacheSize = 1000;

    // Periodically clean up expired entries
    this.cleanupInterval = setInterval(() => {
      this._pruneExpired();
    }, 10 * 60 * 1000);

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  _pruneExpired() {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.memoryCache.delete(key);
      }
    }
  }

  async connect() {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      console.warn('No REDIS_URL found in .env. Using in-memory fallback cache.');
      return;
    }

    try {
      this.client = redis.createClient({ url: redisUrl });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err.message);
        this.isRedisConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Connected to Redis successfully.');
        this.isRedisConnected = true;
      });

      await this.client.connect();
    } catch (err) {
      console.error('Failed to connect to Redis, using in-memory fallback cache:', err.message);
      this.isRedisConnected = false;
    }
  }

  async get(key) {
    if (this.isRedisConnected && this.client) {
      try {
        const data = await this.client.get(key);
        if (data !== null) {
          return JSON.parse(data);
        }
      } catch (error) {
        console.error(`Redis GET error for key ${key}:`, error);
      }
    }

    // Memory Cache Fallback
    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.memoryCache.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key, value, ttlSeconds = 3600) {
    if (this.isRedisConnected && this.client) {
      try {
        await this.client.setEx(key, ttlSeconds, JSON.stringify(value));
        // Remove memory cache entry if successfully written to Redis
        this.memoryCache.delete(key);
        return;
      } catch (error) {
        console.error(`Redis SET error for key ${key}:`, error);
      }
    }

    // Memory Cache Fallback
    this.memoryCache.delete(key);
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });

    // Enforce size limit for in-memory cache
    if (this.memoryCache.size > this.maxCacheSize) {
      this._pruneExpired();
      if (this.memoryCache.size > this.maxCacheSize) {
        for (const k of this.memoryCache.keys()) {
          if (this.memoryCache.size <= this.maxCacheSize) break;
          this.memoryCache.delete(k);
        }
      }
    }
  }

  async delete(key) {
    if (this.isRedisConnected && this.client) {
      try {
        await this.client.del(key);
      } catch (error) {
        console.error(`Redis DEL error for key ${key}:`, error);
      }
    }
    
    // Always delete from memory cache to avoid stale reads
    this.memoryCache.delete(key);
  }
}

// Export as a singleton
module.exports = new CacheService();
