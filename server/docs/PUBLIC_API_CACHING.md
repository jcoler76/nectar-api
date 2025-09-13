Public API Response Caching

Summary
- Adds a gateway-level response cache for SQL procedure endpoints in `server/routes/publicApi.js`.
- Uses Redis if configured, with NodeCache fallback.

Enable
- Set `PUBLIC_API_CACHE_ENABLED=true` in `server/.env`.
- Optionally set `PUBLIC_API_CACHE_TTL_SECONDS` (default 30 seconds).

Behavior
- Caches successful responses for GET requests by default.
- To cache non-GET requests, pass `?cache=true` and optionally `&cache_ttl=10` (seconds, max 3600).
- Cache key includes: service id, procedure name, parameters, environment, and legacy/modern response mode.

Invalidation
- Not yet exposed via API. Flush Redis keys with prefix `api-cache:` or restart the app for memory cache.

Notes
- Respect data freshness: use short TTLs for frequently changing data.
- Logs cache hits at debug level in non-production environments.

