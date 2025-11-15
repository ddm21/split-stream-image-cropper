import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.API_KEY = 'test-api-key-12345';
  process.env.RATE_LIMIT_PER_HOUR = '10';
});

afterAll(() => {
  // Cleanup
});

beforeEach(() => {
  // Reset before each test
  // Clear any rate limit state
  if (global.gc) {
    global.gc();
  }
});

afterEach(() => {
  // Cleanup after each test
});
