/**
 * Dual-mode Rate Limiter for SplitStream
 *
 * Supports two modes:
 * 1. Redis-backed (Upstash) - For Vercel serverless, persists across invocations
 * 2. In-memory fallback - For localhost development
 *
 * Automatically detects environment and uses appropriate mode.
 */

const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_PER_HOUR, 10) || 10;

// In-memory rate limiter for fallback/localhost
const inMemoryRateLimitMap = new Map();

let redisClient = null;
let useRedis = false;
let rateLimiterInitialized = false;

/**
 * Initialize Redis connection if configured
 */
async function initializeRedis() {
  if (rateLimiterInitialized) {
    return;
  }

  rateLimiterInitialized = true;

  // Check if Redis credentials are provided
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      // Dynamically import @upstash/redis only if available
      const { Redis } = await import('@upstash/redis');
      redisClient = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });

      // Test connection
      await redisClient.ping();
      useRedis = true;
      console.log('[Rate Limiter] Using Upstash Redis for rate limiting');
    } catch (error) {
      console.warn('[Rate Limiter] Failed to connect to Redis, falling back to in-memory:', error.message);
      useRedis = false;
    }
  } else {
    console.log('[Rate Limiter] Using in-memory rate limiter (Redis not configured)');
  }
}

/**
 * Extract client IP from request
 * Supports X-Forwarded-For header (used by Vercel/proxies)
 */
function extractClientIP(req) {
  // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
  // We want the leftmost (original client)
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  return req.ip || req.connection?.remoteAddress || 'unknown';
}

/**
 * Sanitize IP for use as Redis key
 * Redis keys cannot contain certain characters
 */
function sanitizeIP(ip) {
  // Replace colons (IPv6) and dots (IPv4) with dashes for safety
  return ip.replace(/[:.]/g, '-');
}

/**
 * Check rate limit using in-memory store
 */
function checkInMemoryRateLimit(clientIP) {
  const now = Date.now();
  const limiterKey = `ratelimit:${clientIP}`;

  if (!inMemoryRateLimitMap.has(limiterKey)) {
    inMemoryRateLimitMap.set(limiterKey, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetTime: now + RATE_LIMIT_WINDOW };
  }

  const limiter = inMemoryRateLimitMap.get(limiterKey);

  // Check if window has expired
  if (now > limiter.resetTime) {
    limiter.count = 1;
    limiter.resetTime = now + RATE_LIMIT_WINDOW;
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetTime: now + RATE_LIMIT_WINDOW };
  }

  // Check if limit exceeded
  if (limiter.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: limiter.resetTime,
      retryAfter: Math.ceil((limiter.resetTime - now) / 1000),
    };
  }

  // Increment count
  limiter.count++;
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - limiter.count,
    resetTime: limiter.resetTime,
  };
}

/**
 * Check rate limit using Redis
 */
async function checkRedisRateLimit(clientIP) {
  try {
    const now = Date.now();
    const sanitizedIP = sanitizeIP(clientIP);
    const redisKey = `ratelimit:${sanitizedIP}`;

    // Atomically increment counter
    const count = await redisClient.incr(redisKey);

    // If this is the first request in this window, set TTL
    if (count === 1) {
      await redisClient.expire(redisKey, 60); // 60 second TTL
    }

    const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - count);
    const resetTime = now + RATE_LIMIT_WINDOW;

    if (count > RATE_LIMIT_MAX_REQUESTS) {
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter: 60 - (Math.floor((Date.now() % 60000) / 1000)),
      };
    }

    return {
      allowed: true,
      remaining,
      resetTime,
    };
  } catch (error) {
    console.error('[Rate Limiter] Redis error, falling back to in-memory:', error.message);
    // Fall back to in-memory on Redis error
    useRedis = false;
    return checkInMemoryRateLimit(clientIP);
  }
}

/**
 * Main rate limiter middleware
 */
const rateLimiter = async (req, res, next) => {
  try {
    // Initialize Redis on first call
    if (!rateLimiterInitialized) {
      await initializeRedis();
    }

    const clientIP = extractClientIP(req);
    let result;

    if (useRedis && redisClient) {
      result = await checkRedisRateLimit(clientIP);
    } else {
      result = checkInMemoryRateLimit(clientIP);
    }

    // Add rate limit info to response headers
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));
    res.setHeader('X-RateLimit-Reset', Math.floor(result.resetTime / 1000));

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter);
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: result.retryAfter,
      });
    }

    next();
  } catch (error) {
    console.error('[Rate Limiter] Unexpected error:', error);
    // On unexpected error, allow request but log it
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS);
    next();
  }
};

/**
 * Cleanup function (useful for tests)
 */
function clearAllLimits() {
  inMemoryRateLimitMap.clear();
}

/**
 * Get current rate limit status for an IP (for testing/monitoring)
 */
async function getRateLimitStatus(clientIP) {
  if (useRedis && redisClient) {
    try {
      const sanitizedIP = sanitizeIP(clientIP);
      const count = await redisClient.get(`ratelimit:${sanitizedIP}`);
      return {
        mode: 'redis',
        ip: clientIP,
        count: count || 0,
        limit: RATE_LIMIT_MAX_REQUESTS,
      };
    } catch (error) {
      return { error: error.message };
    }
  } else {
    const limiterKey = `ratelimit:${clientIP}`;
    const limiter = inMemoryRateLimitMap.get(limiterKey);
    return {
      mode: 'in-memory',
      ip: clientIP,
      count: limiter?.count || 0,
      limit: RATE_LIMIT_MAX_REQUESTS,
      resetTime: limiter?.resetTime,
    };
  }
}

module.exports = {
  rateLimiter,
  clearAllLimits,
  getRateLimitStatus,
  initializeRedis,
  // Exported for testing
  __internal: {
    checkInMemoryRateLimit,
    checkRedisRateLimit,
    extractClientIP,
    sanitizeIP,
  },
};
