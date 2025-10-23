import 'reflect-metadata';
import { beforeAll } from 'vitest';
import { initDB } from '../dist/db/data-source.js';

beforeAll(async () => {
  // Ensure we run in dev mode without real email sending
  process.env.RESEND_API_KEY = '';
  await initDB();
});