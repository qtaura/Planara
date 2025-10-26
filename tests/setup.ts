import 'reflect-metadata';
import { beforeAll } from 'vitest';
import { initDB } from '../dist/db/data-source.js';

beforeAll(async () => {
  // Ensure we run in dev mode without real email sending
  process.env.RESEND_API_KEY = '';
  // Loosen rate limits during tests to prevent accidental 429s
  process.env.AUTH_LIMIT_WINDOW = '1000';
  process.env.AUTH_LIMIT_MAX = '1000';
  process.env.STRICT_LIMIT_WINDOW = '1000';
  process.env.STRICT_LIMIT_MAX = '1000';
  process.env.RL_SAMPLE_THRESHOLD = '999999';
  process.env.RL_SAMPLE_INTERVAL = '999999';
  await initDB();
});
