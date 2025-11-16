# Rate Limiting Architecture & Implementation Guide

## Overview

SplitStream implements a **sophisticated dual-layer rate limiting system** designed to:

1. **Prevent API abuse** while protecting server resources
2. **Maintain good UX** by not penalizing page refreshes
3. **Ensure fair limiting** across UI and API clients
4. **Work seamlessly** on localhost, Vercel, and multi-instance deployments

### Two Independent Rate Limiters

**Processing Rate Limiter** (10 requests/hour per IP, default)
- Applies to: `/api/ui/process` (UI) and `/api/v1/process` (API)
- Both endpoints share the same quota
- Only incremented when actual image processing occurs
- Prevents bypass via UI/API switching

**Health Check Rate Limiter** (100 requests/hour per IP, default)
- Applies to: `/api/health` endpoint only
- Separate, generous limit for status checks
- Allows page refreshes without consuming processing quota
- Frontend optimized: Only called once per browser session

## How It Works

### Architecture Overview

```
Request arrives
    ↓
Is processing endpoint? (/api/ui/process, /api/v1/process)
    ├─ Yes → processingRateLimiter (10/hour)
    └─ Health check? (/api/health)
        └─ Yes → healthCheckRateLimiter (100/hour)
    ↓
Extract Client IP (X-Forwarded-For → req.ip → remoteAddress)
    ↓
Redis available?
    ├─ Yes → Check Redis: ratelimit:TYPE:IP
    └─ No → Check In-Memory Map
    ↓
Increment counter (atomic operation)
    ↓
Counter > Limit?
    ├─ Yes → Return HTTP 429
    └─ No → Pass to handler
```

### Mode 1: In-Memory (Localhost)

Used when Redis is not configured.

**Characteristics**:
- Tracks requests per IP in a JavaScript `Map`
- Window: 1 hour (3600 seconds)
- Per-request overhead: <1ms
- Suitable for local development and testing
- **Limitation**: Resets when server restarts; fails on Vercel (each invocation gets fresh memory)

**When to Use**:
- Local development (`npm start`)
- Single-process deployments
- Testing

### Mode 2: Redis-Backed (Vercel/Production)

Used when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are configured.

**Characteristics**:
- Stores counters in Upstash Redis (serverless-friendly)
- Atomic operations (using INCR command)
- Per-request overhead: ~10-50ms (network latency)
- Persists across serverless function invocations
- Automatically expires entries after 1 hour (TTL)

**When to Use**:
- Production/Vercel deployments
- Multi-instance deployments
- High-volume environments

### Key Implementation Details

#### Redis Key Structure

Separate namespaces prevent quota mixing:

```
ratelimit:processing:203-0-113-45    → 5 (5 image processes)
ratelimit:health:203-0-113-45        → 1 (1 health check)
```

IP addresses are sanitized (`:` and `.` replaced with `-`) for Redis compatibility.

#### IP Detection Priority

1. `X-Forwarded-For` header (leftmost IP) - Set by proxies/Vercel
2. `req.ip` - Express property
3. `req.connection.remoteAddress` - Socket property
4. `'unknown'` - Fallback

This ensures accurate tracking even through proxies.

#### Frontend Optimization

Health check only runs once per browser session using `sessionStorage`:

```typescript
// App.tsx
const hasCheckedThisSession = sessionStorage.getItem('splitstream_health_checked');
if (hasCheckedThisSession) {
  // Skip API call, use cached 'online' status
  setBackendStatus('online');
  return;
}
// First load: make API call and cache result
```

**Result**: Page refreshes don't trigger `/api/health` calls, so processing quota stays intact.

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

### Environment Variables

**Processing Rate Limit** (Image processing endpoints):
```env
RATE_LIMIT_PER_HOUR=10  # Default: 10 requests/hour per IP
```

**Health Check Rate Limit** (Status check endpoint):
```env
HEALTH_CHECK_RATE_LIMIT_PER_HOUR=100  # Default: 100 requests/hour per IP
```

**Redis Configuration** (Optional but recommended for production):
```env
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"
```

### Configuration Examples

**Localhost Development**:
```env
RATE_LIMIT_PER_HOUR=10
HEALTH_CHECK_RATE_LIMIT_PER_HOUR=100
# Redis config optional; uses in-memory if not provided
```

**Production (Generous Limits)**:
```env
RATE_LIMIT_PER_HOUR=50
HEALTH_CHECK_RATE_LIMIT_PER_HOUR=200
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"
```

**Strict Rate Limiting**:
```env
RATE_LIMIT_PER_HOUR=5
HEALTH_CHECK_RATE_LIMIT_PER_HOUR=50
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"
```

### Fallback Behavior

If Redis connection fails:

1. Logs warning: `"[Rate Limiter] Failed to connect to Redis, falling back to in-memory"`
2. Automatically switches to in-memory rate limiting
3. Still functions but only within single process
4. **⚠️ Not recommended for production**: Each Vercel invocation has fresh memory

## Response Headers

### Successful Request (HTTP 200)

All successful requests include rate limit information:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 8
X-RateLimit-Reset: 1700432400
Content-Type: application/json

{
  "originalUrl": "...",
  "chunks": [...]
}
```

- `X-RateLimit-Limit`: Total limit (10 for processing, 100 for health)
- `X-RateLimit-Remaining`: Requests left in current window
- `X-RateLimit-Reset`: Unix timestamp when counter resets

### Rate Limited Response (HTTP 429)

When rate limit exceeded:

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1700432400
Retry-After: 3600
Content-Type: application/json

{
  "error": "Too many requests. Please try again later.",
  "retryAfter": 3600
}
```

- `Retry-After`: Seconds to wait before retrying
- `X-RateLimit-Reset`: When the counter will reset

## Testing

### Test 1: Verify Processing Rate Limit (Browser)

1. Open the app
2. Process image, check success
3. Repeat 9 more times (total 10 successful)
4. 11th attempt should return HTTP 429

**Expected Result**:
- Requests 1-10: Success (200 OK)
- Request 11: Rate limited (429)

### Test 2: Verify Processing Rate Limit (Postman/API)

```bash
# Set up request
POST http://localhost:3001/api/v1/process
Header: API_KEY=your-key
Body: {"url": "...", "chunkHeight": 800}

# Send 11 times quickly
for i in {1..11}; do
  curl -X POST \
    -H "Content-Type: application/json" \
    -H "API_KEY: your-key" \
    -d '{"url": "https://example.com/image.jpg", "chunkHeight": 800}' \
    http://localhost:3001/api/v1/process
done
```

**Expected**: First 10 succeed (200), 11th gets 429

### Test 3: Verify Health Check Has Separate Limit

```bash
# Run 101 health checks
for i in {1..101}; do
  echo -n "Check $i: "
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3001/api/health
done
```

**Expected Result**:
- Checks 1-100: Success (200 OK)
- Check 101: Rate limited (429)

### Test 4: Page Refresh Doesn't Consume Processing Quota

1. Open browser DevTools → Application tab
2. Clear sessionStorage
3. Open app (observe health check call)
4. Check Redis: `ratelimit:health:IP` = 1
5. Refresh page 10 times
6. Check Redis: `ratelimit:health:IP` still = 1 (no increase!)
7. Process one image
8. Check Redis: `ratelimit:processing:IP` = 1

**Expected**: Health check counter unchanged after refreshes

### Test 5: Shared Quota Between UI and API

**Setup**: Get your IP first
```bash
# Localhost: probably 127.0.0.1 or ::1
# Remote: Check X-Forwarded-For header in response
```

**Test**:
1. Process 5 images via browser
2. Make 5 API calls via Postman from same IP
3. Total should be 10 (both share same limit)
4. 11th request (UI or API) should get 429

**Verification in Redis**:
```bash
redis-cli -h your-redis -a your-token
GET ratelimit:processing:YOUR-IP
# Output: "10"
```

### Test 6: IP Detection Works Through Proxies

When deployed on Vercel:
```bash
curl -H "X-Forwarded-For: 203.0.113.45" \
  https://your-app.vercel.app/api/health
```

**Verification**:
- Redis key should use sanitized IP: `ratelimit:health:203-0-113-45`
- Multiple requests from same IP increment same counter

## Troubleshooting

### IPs Not Appearing in Redis

**Symptoms**: After many API calls, no `ratelimit:*` keys in Redis

**Checklist**:
1. Verify Redis is connected:
   ```bash
   # Check server startup logs
   npm start
   # Should show: "[Rate Limiter] Using Upstash Redis for rate limiting"
   ```

2. Verify rate limiter middleware is applied:
   ```javascript
   // server.js should have:
   app.post('/api/v1/process', processingRateLimiter, apiKeyAuth, async ...)
   ```

3. Check Redis credentials:
   ```bash
   # Verify env vars are set
   echo $UPSTASH_REDIS_REST_URL
   echo $UPSTASH_REDIS_REST_TOKEN
   ```

4. Test Redis connection:
   ```bash
   redis-cli -h your-redis-url -a your-token
   PING
   # Should respond: "PONG"
   ```

### Health Check Called Every Refresh

**Symptoms**: sessionStorage caching not working; health check incremented on every refresh

**Debug**:
```javascript
// In browser console
sessionStorage.getItem('splitstream_health_checked')
// Should return 'true' after first load
```

**Solution**:
```javascript
// Clear and refresh
sessionStorage.clear()
// Refresh page
// Check console: should only see one health check request
```

### API Works in Browser, Not in Postman

**Symptoms**: Browser requests rate limited correctly, but Postman calls bypass limit

**Cause**: Missing `processingRateLimiter` middleware on `/api/v1/process`

**Fix**:
```javascript
// ✅ Correct - rate limiter BEFORE apiKeyAuth
app.post('/api/v1/process', processingRateLimiter, apiKeyAuth, async (req, res) => {...})

// ❌ Wrong - missing rate limiter
app.post('/api/v1/process', apiKeyAuth, async (req, res) => {...})
```

### Rate Limit Reset Doesn't Happen

**Symptoms**: After hitting limit, requests never succeed again

**Cause**: Usually TTL not set on Redis key

**Check**:
```bash
redis-cli -h your-redis -a your-token
TTL ratelimit:processing:YOUR-IP
# Should return seconds remaining (not -1)
```

**Fix**: Ensure Redis key TTL is set to 3600:
```javascript
// In rateLimiter.js - should already do this
if (count === 1) {
  await redisClient.expire(redisKey, 3600); // 1 hour TTL
}
```

### Different Limits on Different Requests

**Symptoms**: Some IPs show different limit values

**Likely Causes**:
1. Mixed limits (processing vs health check endpoints)
   - Health check: 100/hour
   - Processing: 10/hour
   - **This is expected and correct**

2. Different IPs due to proxy
   - Browser: One IP (user's real IP)
   - API: Different IP (server's outgoing IP)
   - **Fix**: Ensure same IP for testing

3. Stale local limits (if using in-memory fallback)
   - Restart server to clear
   - **Better**: Use Upstash Redis

### Load Testing with Apache Bench

```bash
# Install Apache Bench if not available
# macOS: brew install httpd
# Ubuntu: sudo apt-get install apache2-utils

ab -n 50 -c 10 http://localhost:3001/api/health

# Should see mix of 200 and 429 responses
```

## Production Deployment (Vercel)

### Step 1: Create Upstash Redis Database

1. Go to [Upstash Console](https://console.upstash.com)
2. Click "Create Database"
3. Fill in:
   - **Name**: `splitstream-ratelimit`
   - **Region**: Closest to your deployment
   - **Type**: Standard (Free)
4. Click "Create"

### Step 2: Get Credentials

1. Open your database
2. Click "REST API"
3. Copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Step 3: Add to Vercel

1. Go to Vercel project settings
2. **Settings** → **Environment Variables**
3. Add:
   ```
   UPSTASH_REDIS_REST_URL = <your-url>
   UPSTASH_REDIS_REST_TOKEN = <your-token>
   RATE_LIMIT_PER_HOUR = 10
   HEALTH_CHECK_RATE_LIMIT_PER_HOUR = 100
   ```
4. Set for **Production** and **Preview**
5. Redeploy

### Step 4: Verify

After deployment:
```bash
# Make 11 requests
for i in {1..11}; do
  curl https://your-app.vercel.app/api/health
done

# 11th should return 429
```

## Rate Limiting Not Working on Vercel

**Symptoms**: No rate limiting; requests keep succeeding past limit

**Checklist**:

1. Verify environment variables:
   ```bash
   vercel env list
   # Should show UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
   ```

2. Check Vercel logs:
   ```bash
   vercel logs --follow
   # Should show: "[Rate Limiter] Using Upstash Redis for rate limiting"
   # If not, shows: "[Rate Limiter] Using in-memory rate limiter" → Redis not connected
   ```

3. Verify Redis database is active
   - Log into Upstash console
   - Check database status (should be "Active")

4. Test Redis connection:
   ```bash
   redis-cli -h your-redis-url -a your-token
   PING
   # Should respond "PONG"
   ```

## Implementation Details

### File Structure

```
api/rateLimiter.js
├── Configuration Constants
│   ├── PROCESSING_RATE_LIMIT_MAX_REQUESTS (default: 10)
│   └── HEALTH_CHECK_RATE_LIMIT_MAX_REQUESTS (default: 100)
├── In-Memory Storage
│   └── inMemoryRateLimitMap (JavaScript Map)
├── Core Functions
│   ├── extractClientIP(req) - Extract IP from headers/request
│   ├── sanitizeIP(ip) - Replace : and . with - for Redis
│   ├── checkInMemoryRateLimit(ip, type) - In-memory check
│   ├── checkRedisRateLimit(ip, type) - Redis check
│   └── createRateLimiter(type) - Factory function
├── Exported Middleware
│   ├── processingRateLimiter - For /api/ui/process, /api/v1/process
│   └── healthCheckRateLimiter - For /api/health
└── Utility Functions
    ├── getRateLimitStatus(ip) - Check current usage
    └── clearAllLimits() - Clear all limits (testing)

server.js / api/index.js
├── Route: GET /api/health → healthCheckRateLimiter
├── Route: POST /api/ui/process → processingRateLimiter
└── Route: POST /api/v1/process → processingRateLimiter + apiKeyAuth

App.tsx
└── useEffect with sessionStorage optimization
```

### Rate Limiter Selection Logic

```javascript
// In route definitions
app.get('/api/health', healthCheckRateLimiter, handler)
app.post('/api/ui/process', processingRateLimiter, handler)
app.post('/api/v1/process', processingRateLimiter, apiKeyAuth, handler)
```

Each middleware independently:
1. Extracts client IP
2. Chooses appropriate limit (10 or 100)
3. Checks Redis or in-memory store
4. Increments counter
5. Returns 429 if exceeded, else continues

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
