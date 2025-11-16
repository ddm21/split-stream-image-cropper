require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { splitImageApi } = require('./api/imageProcessor.js');
const { processingRateLimiter, healthCheckRateLimiter } = require('./api/rateLimiter.js');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---

// Security headers
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// CORS - restrict to same origin only (client should be on same domain)
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    // Also allow same-origin requests
    if (!origin || origin === 'http://localhost:3001' || (process.env.VERCEL_URL && origin === `https://${process.env.VERCEL_URL}`)) {
      callback(null, true);
    } else {
      // For Vercel, allow vercel deployment URL
      if (origin && origin.includes('vercel.app')) {
        callback(null, true);
      } else {
        // Reject cross-origin requests
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true
}));

// Parse JSON bodies (as sent by API clients)
app.use(express.json({ limit: '10mb' }));

// API Key Authentication Middleware
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.header('API_KEY');
  if (!process.env.API_KEY) {
    // Don't expose that API_KEY is misconfigured - log internally only
    console.error('API_KEY is not set in the environment variables.');
    return res.status(500).json({ error: 'Server error: API key not configured.' });
  }
  if (!apiKey || apiKey !== process.env.API_KEY) {
    // Don't reveal whether the key exists or is wrong
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};


// --- API Routes ---

// Health check endpoint - must be before other routes
app.get('/api/health', healthCheckRateLimiter, (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!process.env.API_KEY
  });
});

// UI endpoint - uses API key from environment internally (no API key required from client)
app.post('/api/ui/process', processingRateLimiter, async (req, res) => {
  // Check if API key is configured (silent fail if not)
  if (!process.env.API_KEY) {
    console.error('API_KEY not configured - UI endpoint cannot function');
    return res.status(500).json({ error: 'Server error. Please try again later.' });
  }

  const { url, chunkHeight, resizeWidth } = req.body;

  // Input validation
  if (!url || !chunkHeight) {
    return res.status(400).json({ error: 'Missing required parameters: url, chunkHeight' });
  }

  // Validate URL format
  try {
    const urlObj = new URL(url);
    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return res.status(400).json({ error: 'Invalid URL protocol. Only http and https are allowed.' });
    }
  } catch (error) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  const height = parseInt(chunkHeight, 10);
  if (isNaN(height) || height <= 0 || height > 10000) {
    return res.status(400).json({ error: 'Invalid chunkHeight: must be between 1 and 10000 pixels.' });
  }

  const width = resizeWidth ? parseInt(resizeWidth, 10) : null;
  if (width !== null && (isNaN(width) || width <= 0 || width > 10000)) {
    return res.status(400).json({ error: 'Invalid resizeWidth: must be between 1 and 10000 pixels.' });
  }

  try {
    console.log(`[UI] Processing image from URL: ${url}`);
    // Use the same processing logic as the authenticated endpoint
    const result = await splitImageApi(url, height, width);
    res.json(result);
  } catch (error) {
    // Log error details internally for debugging
    console.error('[UI] Error processing image:', error.message);

    // Provide more informative errors to client based on the error type
    let userMessage = 'Failed to process image. Please try again later.';

    if (error.message.includes('HTTP')) {
      userMessage = 'Could not access the image URL. The server returned an error. Check if the URL is publicly accessible.';
    } else if (error.message.includes('Invalid content type')) {
      userMessage = 'The URL does not point to a valid image file.';
    } else if (error.message.includes('timeout')) {
      userMessage = 'The image took too long to download. Please try a smaller image or different URL.';
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('DNS')) {
      userMessage = 'Could not resolve the domain. Please check the URL.';
    } else if (error.message.includes('ECONNREFUSED')) {
      userMessage = 'Connection refused by the server. The URL may be temporarily unavailable.';
    }

    res.status(500).json({ error: userMessage });
  }
});

// Authenticated API endpoint (for programmatic use - requires API_KEY header)
// Rate limiting applied before API key auth so all requests are counted
app.post('/api/v1/process', processingRateLimiter, apiKeyAuth, async (req, res) => {
  const { url, chunkHeight, resizeWidth } = req.body;

  // Input validation
  if (!url || !chunkHeight) {
    return res.status(400).json({ error: 'Missing required parameters: url, chunkHeight' });
  }

  // Validate URL format
  try {
    const urlObj = new URL(url);
    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return res.status(400).json({ error: 'Invalid URL protocol. Only http and https are allowed.' });
    }
  } catch (error) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  const height = parseInt(chunkHeight, 10);
  if (isNaN(height) || height <= 0 || height > 10000) {
    return res.status(400).json({ error: 'Invalid chunkHeight: must be between 1 and 10000 pixels.' });
  }

  const width = resizeWidth ? parseInt(resizeWidth, 10) : null;
  if (width !== null && (isNaN(width) || width <= 0 || width > 10000)) {
    return res.status(400).json({ error: 'Invalid resizeWidth: must be between 1 and 10000 pixels.' });
  }

  try {
    console.log(`[API] Processing image from URL: ${url}`);
    const result = await splitImageApi(url, height, width);
    res.json(result);
  } catch (error) {
    // Log error details internally for debugging
    console.error('[API] Error processing image:', error.message);

    // Provide more informative errors based on the error type
    let userMessage = 'Failed to process image. Please try again later.';

    if (error.message.includes('HTTP')) {
      userMessage = 'Could not access the image URL. The server returned an error. Check if the URL is publicly accessible.';
    } else if (error.message.includes('Invalid content type')) {
      userMessage = 'The URL does not point to a valid image file.';
    } else if (error.message.includes('timeout')) {
      userMessage = 'The image took too long to download. Please try a smaller image or different URL.';
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('DNS')) {
      userMessage = 'Could not resolve the domain. Please check the URL.';
    } else if (error.message.includes('ECONNREFUSED')) {
      userMessage = 'Connection refused by the server. The URL may be temporarily unavailable.';
    }

    res.status(500).json({ error: userMessage });
  }
});

// --- Static Frontend Serving ---
// Serve static files (bundle.js, output.css, etc.) from the root directory
app.use(express.static(path.join(__dirname), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Serve bundle.js and output.css explicitly to ensure they're accessible
app.get('/bundle.js', (req, res, next) => {
  const filePath = path.join(__dirname, 'bundle.js');
  res.sendFile(filePath, {
    headers: {
      'Content-Type': 'application/javascript'
    }
  }, (err) => {
    if (err) {
      console.error('Error serving bundle.js:', err);
      res.status(404).send('bundle.js not found. Make sure build completed successfully.');
    }
  });
});

app.get('/output.css', (req, res, next) => {
  const filePath = path.join(__dirname, 'output.css');
  res.sendFile(filePath, {
    headers: {
      'Content-Type': 'text/css'
    }
  }, (err) => {
    if (err) {
      console.error('Error serving output.css:', err);
      res.status(404).send('output.css not found. Make sure build completed successfully.');
    }
  });
});

// The "catchall" handler: for any request that doesn't match an API route or a static file,
// send back the React app's index.html file. This is crucial for single-page apps.
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});


// --- Server Startup ---
// For local development
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`SplitStream server with UI and API listening on http://localhost:${PORT}`);
    const PROCESSING_RATE_LIMIT = parseInt(process.env.RATE_LIMIT_PER_HOUR, 10) || 10;
    const HEALTH_CHECK_RATE_LIMIT = parseInt(process.env.HEALTH_CHECK_RATE_LIMIT_PER_HOUR, 10) || 100;
    console.log(`Processing rate limit: ${PROCESSING_RATE_LIMIT} requests per hour per IP`);
    console.log(`Health check rate limit: ${HEALTH_CHECK_RATE_LIMIT} requests per hour per IP (separate counter)`);
  });
}

// Export for Vercel and other use cases
module.exports = app;
