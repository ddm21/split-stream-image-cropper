# Rate Limiting Guide

## Overview

SplitStream Image Cropper implements dual-mode rate limiting to protect against abuse:

- **Localhost/Development**: In-memory rate limiter (no external dependencies)
- **Vercel/Production**: Redis-backed rate limiter (Upstash Redis) for serverless persistence

## Rate Limit Rules

- **Default limit**: 10 requests per hour per IP
- **Window**: 3600 seconds (1 hour)
- **Applies to**:
  - `/api/ui/process` - UI form submissions
  - `/api/v1/process` - Authenticated API calls
  - `/api/health` - Health check endpoint

## How It Works

### Mode 1: In-Memory (Localhost)

Used when `UPSTASH_REDIS_REST_URL` is not configured.

- Tracks requests per IP in a JavaScript `Map`
- Window: 1 hour (3600 seconds)
- Suitable for local development and testing
- **Limitation**: Only works within a single Node.js process (fails on Vercel serverless)

### Mode 2: Redis-Backed (Vercel/Production)

Used when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are configured.

- Stores rate limit counters in Upstash Redis
- Atomic operations ensure accurate counting
- Persists across serverless function invocations
- Automatically expires entries after 1 hour (3600 seconds)

## Setup

### Localhost Development

No setup required! The rate limiter will use in-memory mode automatically.

```bash
# Start the server
npm start

# Make requests
curl http://localhost:3001/api/health

# After 11 requests in 60 seconds, you'll get:
# HTTP 429 Too Many Requests
```

### Vercel Production Setup

#### Step 1: Create Upstash Redis Database

1. Go to [Upstash Console](https://console.upstash.com)
2. Click "Create Database"
3. Choose:
   - **Name**: "splitstream-ratelimit" (or your choice)
   - **Region**: Closest to your deployment
   - **Type**: Standard
4. Click "Create"

#### Step 2: Get Redis Credentials

After creating the database:

1. Click on your database
2. Copy the connection details:
   - `UPSTASH_REDIS_REST_URL` (REST endpoint URL)
   - `UPSTASH_REDIS_REST_TOKEN` (API token)

#### Step 3: Add to Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

```
UPSTASH_REDIS_REST_URL = <your-upstash-url>
UPSTASH_REDIS_REST_TOKEN = <your-upstash-token>
RATE_LIMIT_PER_MINUTE = 10
```

4. Ensure these are set for **Production** and **Preview** environments
5. Redeploy your application

#### Step 4: Verify

After deployment:

```bash
# Test 11 requests quickly
for i in {1..11}; do
  curl https://your-app.vercel.app/api/health
done

# 11th request should return 429
```

## Configuration

### Rate Limit Per Hour

Customize the rate limit via `RATE_LIMIT_PER_HOUR` environment variable:

```bash
# .env
RATE_LIMIT_PER_HOUR=20
```

- Default: `10` requests per hour
- Valid range: `1` to `1000`
- If invalid or missing, defaults to `10`

### Fallback Behavior

If Redis connection fails:

1. Logs a warning: `"[Rate Limiter] Failed to connect to Redis..."`
2. Automatically falls back to in-memory mode
3. Rate limiting still works but only within that serverless invocation
4. Not recommended for production use with fallback

## Response Headers

All requests include rate limit information:

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1763210091
```

When rate limited (HTTP 429):

```http
Retry-After: 42
Content-Type: application/json

{
  "error": "Too many requests. Please try again later.",
  "retryAfter": 42
}
```

- `Retry-After`: Seconds to wait before retrying
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Testing

### Unit Tests

```bash
npm test
```

Tests are in:
- `tests/unit/rateLimiter.test.ts` - Unit tests
- `tests/integration/rateLimiting.test.ts` - Integration tests
- `tests/e2e/vercel-rate-limit.test.ts` - E2E tests (requires `VERCEL_URL` env var)

### Manual Testing

#### Localhost

```bash
# Start server
npm start

# Run 15 requests quickly
for i in {1..15}; do
  echo -n "Request $i: "
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/health
done

# Expected output:
# Requests 1-10: 200
# Requests 11-15: 429
```

#### Vercel Production

```bash
# Run 15 requests against production (requires VERCEL_URL)
VERCEL_URL=https://your-app.vercel.app npm run test:run
```

### Load Testing

To verify rate limiting under load:

```bash
# Install Apache Bench (ab) if not available
# macOS: brew install httpd
# Ubuntu: sudo apt-get install apache2-utils

ab -n 20 -c 5 https://your-app.vercel.app/api/health

# Should see:
# - Some requests succeed (HTTP 200)
# - Some requests are rate limited (HTTP 429)
```

## Troubleshooting

### Rate Limiting Not Working on Vercel

**Problem**: Requests are not being blocked after exceeding the limit.

**Solution**:

1. Verify environment variables are set:
   ```bash
   vercel env list
   ```
   Should show `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

2. Check Vercel logs:
   ```bash
   vercel logs --follow
   ```
   Look for: `[Rate Limiter] Using Upstash Redis...`

3. If you see `[Rate Limiter] Using in-memory rate limiter`:
   - Redis credentials are not configured properly
   - Add them to Vercel environment variables

### Redis Connection Timeout

**Problem**: Getting warnings about Redis connection failures.

**Solution**:

1. Verify Upstash credentials are correct
2. Check if Redis database is active in Upstash console
3. Ensure Vercel region is supported by Upstash (most are)

### Different Rate Limits Per Endpoint

Currently, all endpoints share the same rate limit. To customize per-endpoint:

Edit `api/rateLimiter.js` and modify the rate limiter initialization based on `req.path`.

## Architecture

### Rate Limiter Module

Located at: `api/rateLimiter.js`

Key functions:
- `rateLimiter` - Express middleware (exported)
- `checkInMemoryRateLimit()` - In-memory implementation
- `checkRedisRateLimit()` - Redis implementation
- `getRateLimitStatus()` - Get current limit status (for monitoring)
- `clearAllLimits()` - Clear all limits (for testing)

### Flow

```
Request arrives
    ↓
Rate Limiter Middleware
    ↓
Is Redis configured?
    ├─ Yes → Check Redis counter (atomic INCR)
    └─ No → Check in-memory Map
    ↓
Increment counter
    ↓
Counter > Limit?
    ├─ Yes → Return HTTP 429 with Retry-After
    └─ No → Pass to next middleware
```

## Performance

### In-Memory (Localhost)

- **Per-request overhead**: <1ms
- **Memory usage**: ~100 bytes per unique IP tracked
- **Cleanup**: Automatic when window expires

### Redis (Production)

- **Per-request overhead**: ~10-50ms (network latency)
- **Memory usage**: Managed by Upstash
- **Pricing**:
  - Free tier: 10GB data, 100 commands/second
  - Pay-as-you-go: $0.00002 per write command
  - Typical cost: $0.20 per 100K requests

## Security Considerations

✅ **What's Protected**:
- Prevents brute force attacks
- Protects against resource exhaustion
- Per-IP isolation

⚠️ **Limitations**:
- No account-based rate limiting (IP-based only)
- Cannot differentiate between legitimate users behind same proxy
- Doesn't prevent sophisticated distributed attacks (use WAF for this)

## Future Improvements

1. **Account-based rate limiting** (for authenticated users)
2. **Per-endpoint customization** (different limits for different endpoints)
3. **Redis clustering** (for high-scale deployments)
4. **Metrics/monitoring** (track rate limit violations)
5. **Selective rate limiting** (whitelist certain IPs)
6. **Sliding window algorithm** (instead of fixed window)

## References

- [Upstash Redis Docs](https://upstash.com/docs/redis/overview)
- [Express Rate Limit Middleware](https://github.com/nfriedly/express-rate-limit)
- [HTTP 429 Status Code](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429)
- [Rate Limiting Strategies](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
