# SplitStream Image Cropper

SplitStream is a high-performance image processing application built with React and TypeScript. It allows users to split large images into vertical chunks of specific heights. All processing happens server-side, enabling support for any image URL without CORS restrictions.

![SplitStream Banner](https://i.ibb.co/FbKTN9hL/demo.webp)

[Example n8n Workflow to Use SplitStream API](https://gist.github.com/ddm21/20146e6d2db88cccaedfb0cbefe5b383)

## 🚀 Features

- **Server-Side Processing**: All image processing happens on the server, eliminating CORS issues and supporting any image URL.
- **Smart Splitting**: Split ultra-high-resolution images into manageable chunks based on pixel height.
- **Image Resizing**: Optional resize parameter to resize images before splitting while maintaining aspect ratio.
- **Backend API**: Includes a Node.js/Express backend with authenticated API for programmatic use (API key required).
- **Download Options**: Download individual chunks or bundle everything into a single ZIP file from the UI.
- **Rate Limiting**: Configurable rate limiting to protect the API from abuse.
- **Modern UI**: Built with Tailwind CSS and responsive design.
- **Theming**: Robust light/dark mode and 6 customizable color themes that persist across sessions.

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript
- **Backend**: Node.js, Express, Jimp
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Utilities**: JSZip (for compression)

## 📦 Running the Application

This project includes a unified server that runs both the frontend UI and the backend API.

1. **Install Node.js**: Ensure you have Node.js (v16+) and npm installed.

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   - Create a new file named `.env` in the root of the project.
   - Set a secure `API_KEY` (required for `/api/v1/process` endpoint).
   - Configure rate limiting (separate limits for image processing and health checks).
   - **(Optional but recommended)** Set up Upstash Redis for distributed rate limiting (required for Vercel/multi-instance deployments).

   **Basic configuration (localhost only):**
   ```env
   # .env file
   API_KEY="your-secret-api-key-here"

   # Rate Limiting - Image Processing (UI and API endpoints)
   RATE_LIMIT_PER_HOUR=10  # Requests per hour per IP for /api/ui/process and /api/v1/process (default: 10)

   # Rate Limiting - Health Check (health check endpoint only)
   HEALTH_CHECK_RATE_LIMIT_PER_HOUR=100  # Requests per hour per IP for /api/health (default: 100)
   ```

   **For production/self-hosted with Upstash Redis (recommended):**
   ```env
   # Core Configuration
   API_KEY="your-secret-api-key-here"

   # Rate Limiting - Processing Endpoints (UI + API share this limit)
   RATE_LIMIT_PER_HOUR=10

   # Rate Limiting - Health Check (separate generous limit for status checks)
   HEALTH_CHECK_RATE_LIMIT_PER_HOUR=100

   # Upstash Redis Configuration (for distributed rate limiting)
   UPSTASH_REDIS_REST_URL="https://your-upstash-url.upstash.io"
   UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
   ```

   **Setting up Upstash Redis:**
   1. Create a free account at [Upstash Console](https://console.upstash.com)
   2. Click "Create Database"
   3. Choose:
      - **Name**: `splitstream-ratelimit` (or your choice)
      - **Region**: Select the region closest to your deployment
      - **Type**: Standard
   4. Click "Create"
   5. After creation, go to your database
   6. Copy these credentials from the "REST API" section:
      - `UPSTASH_REDIS_REST_URL` - The REST endpoint URL
      - `UPSTASH_REDIS_REST_TOKEN` - The API token
   7. Add them to your `.env` file

   **Why Upstash Redis?**
   - **Localhost**: Rate limiting works fine with in-memory storage
   - **Vercel/Serverless**: Each function invocation has fresh memory, so rate limits reset. Redis persists across invocations.
   - **Multi-instance**: If running multiple server instances, Redis keeps rate limits synchronized

4. **Start the server**:
   ```bash
   npm start
   ```
   The application will be available at `http://localhost:3001`. The same server also hosts the API endpoints.

   The server will automatically:
   - Use Upstash Redis if credentials are configured
   - Fall back to in-memory rate limiting if Redis is not available
   - Log which mode is being used on startup

## 🌐 Image URL Support

Since all processing happens server-side, **any image URL is supported**, including:
- Images from MinIO/S3 buckets (even without CORS)
- Images from any public URL
- Images from private servers (as long as the server can access them)
- HTTP and HTTPS URLs

No CORS configuration is required on the image source server!

## 💡 Usage Example

### Using the Web UI

1. Enter your image URL (e.g., `https://your-minio-bucket.com/image.jpg`)
2. Set the chunk height (e.g., `800` pixels)
3. Optionally set a resize width (e.g., `1280` pixels) to resize before splitting
4. Click "Process Image"
5. Download individual chunks or bundle all chunks into a ZIP file

### Using the API

**Example with cURL:**
```bash
curl -X POST https://your-domain.com/api/v1/process \
  -H "Content-Type: application/json" \
  -H "API_KEY: your-api-key-here" \
  -d '{
    "url": "https://example.com/large-image.jpg",
    "chunkHeight": 800,
    "resizeWidth": 1280
  }'
```

**Note:** The API key must match the `API_KEY` value set in your server's environment variables.

## 📖 API Reference

The backend server exposes an authenticated API endpoint for image processing.

> **💡 Tip:** Click the "API Reference" button in the app to see working credentials for testing!

### Authenticated API Endpoint

**Endpoint:** `POST /api/v1/process`

**Authentication:** Requires an `API_KEY` header matching the `API_KEY` in your `.env` file.

**Request Body (JSON):**
```json
{
  "url": "https://example.com/large-image.jpg",
  "chunkHeight": 800,
  "resizeWidth": 1280
}
```

**Parameters:**
- `url` (string, required): Direct URL of the source image to split
- `chunkHeight` (integer, required): Target height for each image chunk in pixels
- `resizeWidth` (integer, optional): Resize image to this width before splitting (maintains aspect ratio)

**Successful Response (JSON):**
The API returns a JSON object containing metadata and an array of chunks, with each image encoded as a Base64 data URI:

```json
{
  "originalUrl": "https://example.com/large-image.jpg",
  "totalWidth": 1920,
  "totalHeight": 2400,
  "chunkHeight": 800,
  "resizeWidth": 1280,
  "chunkCount": 3,
  "processingTimeMs": 1234,
  "chunks": [
    {
      "id": 0,
      "base64": "data:image/png;base64,...",
      "height": 800,
      "yOffset": 0
    },
    // ... more chunks
  ]
}
```

## 🔒 Rate Limiting

The application includes a sophisticated **dual-mode rate limiting system** to protect the API from abuse while maintaining good user experience.

### Two Independent Rate Limiters

1. **Processing Rate Limiter** (10 requests/hour per IP, default)
   - Applies to: `/api/ui/process` (UI) and `/api/v1/process` (API)
   - **Both endpoints share the same quota** - prevents abuse from either UI or API
   - Triggers when actual image processing occurs
   - Tracks via Redis key: `ratelimit:processing:IP`

2. **Health Check Rate Limiter** (100 requests/hour per IP, default)
   - Applies to: `/api/health` endpoint only
   - Separate, generous limit for status checks
   - Allows frequent page refreshes without consuming processing quota
   - Optimized: Only called once per browser session (subsequent refreshes use sessionStorage cache)
   - Tracks via Redis key: `ratelimit:health:IP`

### How It Works

- **Localhost**: Uses in-memory rate limiting (no external dependencies)
- **Production/Vercel**: Uses Upstash Redis for distributed rate limiting across multiple invocations
- **Response**: Returns HTTP 429 (Too Many Requests) when limit is exceeded with a `Retry-After` header
- **IP Detection**: Properly extracts client IP from `X-Forwarded-For` headers (supports proxies and Vercel)

### Rate Limit Headers

All API responses include rate limit information:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1763210091
```

When rate limited (HTTP 429):
```
Retry-After: 3600
```

### Configuration

Configure rate limits via environment variables:
```env
# Image processing endpoints (UI + API share this)
RATE_LIMIT_PER_HOUR=10  # Requests per hour for /api/ui/process and /api/v1/process

# Health check endpoint (separate counter)
HEALTH_CHECK_RATE_LIMIT_PER_HOUR=100  # Requests per hour for /api/health
```

### For More Details

See [RATE_LIMITING.md](./helper-md/RATE_LIMITING.md) for comprehensive documentation on:
- Architecture and design decisions
- Testing rate limiting with Postman/n8n
- Understanding how Redis keys are structured
- Troubleshooting common issues
- Monitoring rate limit status

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License.
