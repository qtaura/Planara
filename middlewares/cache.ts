import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface CacheEntry {
  data: any;
  etag: string;
  timestamp: number;
  headers: Record<string, string>;
}

// In-memory cache - in production, use Redis or similar
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function generateETag(data: any): string {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  return `"${crypto.createHash('md5').update(content).digest('hex')}"`;
}

function getCacheKey(req: Request): string {
  const { method, originalUrl, query } = req;
  const userId = (req as any).userId || 'anonymous';
  const teamId = (req as any).teamId || 'no-team';

  // Include relevant query params and user context in cache key
  const keyData = {
    method,
    url: originalUrl,
    query,
    userId,
    teamId,
  };

  return crypto.createHash('sha256').update(JSON.stringify(keyData)).digest('hex');
}

function isExpired(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp > CACHE_TTL;
}

export function cacheMiddleware(options: { ttl?: number; skipCache?: boolean } = {}) {
  const ttl = options.ttl || CACHE_TTL;

  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET' || options.skipCache) {
      return next();
    }

    const cacheKey = getCacheKey(req);
    const cachedEntry = cache.get(cacheKey);

    // Check if we have a valid cached entry
    if (cachedEntry && !isExpired(cachedEntry)) {
      const clientETag = req.headers['if-none-match'];

      // If client has the same ETag, return 304 Not Modified
      if (clientETag === cachedEntry.etag) {
        return res.status(304).end();
      }

      // Return cached response with ETag
      res.set('ETag', cachedEntry.etag);
      res.set('Cache-Control', `max-age=${Math.floor(ttl / 1000)}`);

      // Set any additional headers that were cached
      Object.entries(cachedEntry.headers).forEach(([key, value]) => {
        res.set(key, value);
      });

      return res.json(cachedEntry.data);
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = function (data: any) {
      const etag = generateETag(data);

      // Store in cache
      const entry: CacheEntry = {
        data,
        etag,
        timestamp: Date.now(),
        headers: {
          'Content-Type': 'application/json',
        },
      };
      cache.set(cacheKey, entry);

      // Set response headers
      res.set('ETag', etag);
      res.set('Cache-Control', `max-age=${Math.floor(ttl / 1000)}`);

      return originalJson(data);
    };

    next();
  };
}

// Utility to invalidate cache entries by pattern
export function invalidateCache(pattern?: string) {
  if (!pattern) {
    cache.clear();
    return;
  }

  const regex = new RegExp(pattern);
  for (const [key] of cache) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
}

// Cleanup expired entries periodically
setInterval(() => {
  for (const [key, entry] of cache) {
    if (isExpired(entry)) {
      cache.delete(key);
    }
  }
}, 60 * 1000); // Clean up every minute

// Export cache stats for monitoring
export function getCacheStats() {
  const now = Date.now();
  let expired = 0;
  let active = 0;

  for (const entry of cache.values()) {
    if (isExpired(entry)) {
      expired++;
    } else {
      active++;
    }
  }

  return {
    total: cache.size,
    active,
    expired,
    hitRate: 0, // TODO: Implement hit rate tracking
  };
}