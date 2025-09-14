// Simple in-memory cache for frequently accessed data
class SimpleCache {
  constructor(ttl = 300000) {
    // Default 5 minutes TTL
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    const expiry = Date.now() + this.ttl;
    this.cache.set(key, { value, expiry });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Create cache instances
const servicesCache = new SimpleCache(60000); // 1 minute for services
const connectionsCache = new SimpleCache(300000); // 5 minutes for connections

// Cleanup expired entries every 5 minutes
setInterval(() => {
  servicesCache.cleanup();
  connectionsCache.cleanup();
}, 300000);

module.exports = {
  servicesCache,
  connectionsCache,
  SimpleCache,
};
