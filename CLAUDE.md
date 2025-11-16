# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SplitStream Image Cropper** is a full-stack web application for splitting large images into vertical chunks of specific heights. It features server-side image processing (eliminating CORS issues), an authenticated REST API, and a modern React UI with theming support. Can be deployed to Vercel (serverless) or self-hosted on any Node.js server.

## Quick Commands

### Build, Start, and Test
```bash
npm install              # Install all dependencies
npm start                # Build frontend (Tailwind + esbuild) and start Express server (port 3001)
npm run build            # Build only: compile Tailwind CSS and bundle React frontend
npm test                 # Run Vitest in watch mode
npm run test:run         # Run tests once and exit
npm run test:ui          # Run tests with UI dashboard
```

### Development
- **Frontend**: Vite dev server available on port 3000 (already configured in `vite.config.ts`)
- **Backend**: Express server on port 3001 (serves both UI and API)
- **Quick iteration**: Edit React components (in `/components`, `/contexts`, `App.tsx`), then rebuild with `npm run build` and refresh browser

### Testing Framework

Testing is implemented using **Vitest** with full test-driven development (TDD) approach:

- **Unit tests**: `tests/unit/rateLimiter.test.ts` - Core rate limiter functionality
- **Integration tests**: `tests/integration/rateLimiting.test.ts` - Full API endpoints with rate limiting
- **E2E tests**: `tests/e2e/vercel-rate-limit.test.ts` - Production Vercel deployment testing

Run tests with:
```bash
npm test              # Watch mode (auto-rerun on changes)
npm run test:run      # Run once and exit
npm run test:ui       # Visual test dashboard
```

See `RATE_LIMITING.md` for detailed testing guide and manual testing procedures.

### Environment Setup
Create a `.env` file in the project root:
```env
API_KEY="your-secret-api-key-here"
RATE_LIMIT_PER_HOUR=10  # Optional: requests per hour per IP (default: 10)

# For Vercel production (optional - enables Redis-backed rate limiting):
UPSTASH_REDIS_REST_URL=https://your-upstash-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
```

**Rate Limiting**: See `RATE_LIMITING.md` for detailed setup guide.

## Architecture Overview

### Frontend (React 18 + TypeScript)
- **Entry point**: `index.tsx` (renders to root in `index.html`)
- **Main component**: `App.tsx` (layout and state orchestration)
- **Component structure** (`/components/`):
  - `InputPanel.tsx`: Form for image URL, chunk height, resize width
  - `ResultViewer.tsx`: Displays split chunks, handles individual and ZIP downloads
  - `ApiDocsModal.tsx`: Embedded API documentation and credentials display
  - `Accordion.tsx`: Reusable accordion component for UI structure
- **Theming** (`/contexts/ThemeContext.tsx`):
  - 6 color themes + dark mode toggle
  - Persisted to localStorage
  - Applies theme classes to root element for Tailwind CSS
- **API communication** (`/services/imageProcessor.ts`): Abstracts POST requests to `/api/ui/process`
- **Styling**: Tailwind CSS (compiled to `output.css`), configured in `tailwind.config.js` with dynamic theme colors in safelist
- **Build artifact**: `bundle.js` (ESM format, React dependencies externalized via import map in `index.html`)

### Backend (Express + Jimp)
- **Entry point**: `server.js` (port 3001, unified server for UI + API)
- **Vercel serverless**: Alternative entry point `api/handler.js`
- **Core logic** (`api/imageProcessor.js`):
  - Fetches image from URL (with retry, user-agent headers for Cloudflare detection)
  - Parses with Jimp (pure JavaScript, no native binaries)
  - Optional resize maintaining aspect ratio
  - Splits into vertical chunks by pixel height
  - Encodes chunks as PNG Base64 data URIs
  - Returns JSON with metadata and all chunks
- **Express middleware stack** (in `server.js` and `api/index.js`):
  - Security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy)
  - CORS restricted to: same-origin, localhost:3001, *.vercel.app, custom VERCEL_URL
  - JSON body parsing (10MB limit)
  - **Dual-mode rate limiting** (`api/rateLimiter.js`):
    - **Localhost**: In-memory rate limiter (10 req/hr/IP by default)
    - **Vercel**: Redis-backed (Upstash) for persistence across serverless invocations
    - Uses X-Forwarded-For header for accurate IP detection
  - API key authentication for `/api/v1/process` endpoint
- **Endpoints**:
  - `GET /`: Serves UI (index.html + bundle.js + output.css)
  - `POST /api/ui/process`: Internal endpoint (no auth) for UI requests
  - `POST /api/v1/process`: Authenticated API endpoint (requires `API_KEY` header)
  - `GET /api/health`: Health check endpoint
- **Error handling**: Generic messages returned to clients, detailed errors logged server-side only

### Deployment Architecture
- **Vercel (primary)**:
  - Function timeout: 60s, memory: 1024MB
  - Configured in `vercel.json` with URL rewrites for SPA routing
  - **Rate limiting**: Redis-backed via Upstash (configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`)
  - Persists across serverless function invocations
- **Self-hosted**:
  - Single Node.js process running `server.js`
  - Requires `.env` file with API_KEY and optional Upstash credentials
  - Default: In-memory rate limiting (suitable for single-process deployments)
  - Optional: Configure Upstash for multi-instance deployments
  - Deploy on any platform supporting Node.js (AWS, DigitalOcean, etc.)

## Key Files and Purposes

| File | Purpose |
|------|---------|
| `server.js` | Express server, security middleware, request handling |
| `api/imageProcessor.js` | Image fetching, processing, and chunk generation |
| `api/rateLimiter.js` | Dual-mode rate limiter (in-memory + Redis/Upstash) |
| `api/handler.js` | Vercel serverless entry point |
| `App.tsx` | Main React component, state coordination |
| `components/*.tsx` | UI components (forms, results, modals) |
| `contexts/ThemeContext.tsx` | Theme management (colors, dark mode) |
| `services/imageProcessor.ts` | Frontend API client utility |
| `types.ts` | Shared TypeScript type definitions |
| `index.html` | HTML template with import map for CDN-loaded React dependencies |
| `tailwind.config.js` | Tailwind CSS configuration with theme colors |
| `postcss.config.js` | PostCSS + Tailwind + Autoprefixer pipeline |
| `tsconfig.json` | TypeScript config (ES2022 target, ESNext modules, path aliases) |
| `vercel.json` | Vercel deployment configuration |

## Build System Details

### Frontend Build (`npm run build` - frontend portion):
1. **Tailwind CSS compilation**: `input.css` → `output.css` (applies utility classes and theme colors)
2. **React bundling with esbuild**:
   - Input: `index.tsx` (and dependencies)
   - Output: `bundle.js` (ES module format)
   - Externalized: react, react-dom/client, jszip, lucide-react (loaded from CDN via import map)
   - Reduction in bundle size by ~200KB by not bundling React

### Backend Build (`npm start` - full pipeline):
1. Run frontend build (above)
2. Start Express server on port 3001
3. Server builds/serves index.html with static paths to bundle.js and output.css

### CSS Architecture:
- Input: `input.css` (Tailwind directives)
- Process: PostCSS + Tailwind + Autoprefixer
- Output: `output.css` (included via `<link>` in index.html)
- Theme colors in `tailwind.config.js` safelist for production build

## Security Considerations

See `SECURITY_FIXES.md` for detailed audit. Key points:
- ✅ Environment variables (API_KEY) NOT exposed in frontend bundle
- ✅ Generic error messages to clients; detailed logs server-side only
- ✅ Security headers prevent clickjacking, XSS, MIME-type sniffing
- ✅ CORS restricted (not wildcard)
- ✅ **Rate limiting**: Dual-mode (in-memory + Redis/Upstash)
  - 10 requests per hour per IP (configurable via `RATE_LIMIT_PER_HOUR`)
  - Persists across Vercel serverless invocations with Redis
  - See `RATE_LIMITING.md` for detailed setup
- ✅ API key authentication for `/api/v1/process`
- ✅ Input validation on URLs and parameters

Future recommendations: WAF on Vercel, CSP headers if third-party scripts added, distributed rate limiting monitoring.

## Development Workflow

1. **Code changes**: Edit files in `/components`, `/contexts`, `App.tsx`, `server.js`, etc.
2. **Rebuild**: Run `npm run build` or `npm start` (starts server after build)
3. **Frontend iteration**: React components rebuild automatically if using Vite dev server; otherwise refresh browser after `npm run build`
4. **API testing**: Use cURL or Postman with `API_KEY` header for `/api/v1/process`

## Common Issues and Solutions

- **CORS errors on production**: Check `CORS_ORIGINS` in `server.js` includes your domain
- **Rate limiting too strict**: Increase `RATE_LIMIT_PER_HOUR` in `.env` (default: 10 req/hr/IP)
- **Large images timeout on Vercel**: Increase function timeout in `vercel.json` (currently 60s)
- **Memory errors**: Jimp processes entire image in memory; resize large images before splitting or increase function memory
- **Import map not loading React**: Verify CDN URLs in `index.html` (esm.sh, aistudiocdn.com) are accessible

## Testing Security Fixes

```bash
# Test CORS rejection (should fail from evil.com origin)
curl -H "Origin: https://evil.com" http://localhost:3001/api/health

# Test rate limiting (should block after 10 requests)
for i in {1..15}; do curl -X POST http://localhost:3001/api/ui/process -d '{}'; done

# Test security headers
curl -i http://localhost:3001 | grep -i "X-Frame-Options"

# Test API authentication
curl -X POST http://localhost:3001/api/v1/process \
  -H "Content-Type: application/json" \
  -H "API_KEY: wrong-key" \
  -d '{"url":"https://example.com/image.jpg","chunkHeight":800}'
```

## Integration Points with External Services

- **Image URLs**: Supports any public HTTP/HTTPS URL (S3, MinIO, CDN, etc.)
- **Vercel deployment**: Uses Vercel environment variables and serverless functions
- **CDN for dependencies**: React, ReactDOM, JSZip, Lucide React loaded from esm.sh and aistudiocdn.com
