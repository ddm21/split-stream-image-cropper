import express, { Express } from 'express';
import path from 'path';

/**
 * Creates a test Express app with rate limiting middleware
 * Used to test rate limiter in isolation
 */
export function createTestApp(rateLimiterMiddleware: any): Express {
  const app = express();

  app.use(express.json());

  // Test endpoint with rate limiting
  app.post('/api/test', rateLimiterMiddleware, (req, res) => {
    res.json({ success: true, message: 'Request succeeded' });
  });

  // Test endpoint without rate limiting for comparison
  app.post('/api/test-unprotected', (req, res) => {
    res.json({ success: true, message: 'Unprotected request succeeded' });
  });

  // Health check with rate limiting
  app.get('/api/health', rateLimiterMiddleware, (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return app;
}

/**
 * Utility to make multiple sequential requests and collect responses
 */
export async function makeSequentialRequests(
  app: Express,
  endpoint: string,
  method: 'GET' | 'POST' = 'POST',
  count: number,
  delayMs: number = 0
): Promise<any[]> {
  const request = require('supertest');
  const responses = [];

  for (let i = 0; i < count; i++) {
    try {
      let req = request(app)[method.toLowerCase()](endpoint);
      if (method === 'POST') {
        req = req.send({});
      }
      const res = await req;
      responses.push(res);

      if (delayMs > 0 && i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error: any) {
      responses.push({ status: 500, body: { error: error.message } });
    }
  }

  return responses;
}

/**
 * Utility to make parallel requests from different IPs
 */
export async function makeParallelRequestsFromDifferentIPs(
  app: Express,
  endpoint: string,
  ips: string[],
  count: number
): Promise<Map<string, any[]>> {
  const request = require('supertest');
  const results = new Map<string, any[]>();

  for (const ip of ips) {
    const ipResponses = [];

    for (let i = 0; i < count; i++) {
      try {
        const res = await request(app)
          .post(endpoint)
          .set('X-Forwarded-For', ip)
          .send({});
        ipResponses.push(res);
      } catch (error: any) {
        ipResponses.push({ status: 500, body: { error: error.message } });
      }
    }

    results.set(ip, ipResponses);
  }

  return results;
}
