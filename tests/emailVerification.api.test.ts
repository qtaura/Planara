import 'reflect-metadata';
import express from 'express';
import bodyParser from 'body-parser';
import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';

let usersRouter: any;
let AppDataSource: any;
let User: any;

function createTestApp() {
  const app = express();
  app.use(bodyParser.json());
  app.use('/api/users', usersRouter);
  return app;
}

async function createUser(email: string) {
  const repo = AppDataSource.getRepository(User);
  const user = repo.create({
    username: email.split('@')[0],
    usernameLower: email.split('@')[0].toLowerCase(),
    email,
    hashedPassword: 'test',
  } as any);
  await repo.save(user);
  return user as any;
}

describe('Email verification API rate limits', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    // Ensure no real email client is constructed in compiled modules
    process.env.RESEND_API_KEY = '';
    const usersMod = await import('../dist/routes/users.js');
    usersRouter = usersMod.default;
    const dsMod = await import('../dist/db/data-source.js');
    AppDataSource = dsMod.AppDataSource;
    const modelsMod = await import('../dist/models/index.js');
    User = modelsMod.User;
    app = createTestApp();
  });

  it('blocks resend within 60s via per-email limiter', async () => {
    const email = `limit-send-${Date.now()}@example.com`;
    await createUser(email);

    // First send succeeds
    const res1 = await request(app)
      .post('/api/users/auth/send-code')
      .send({ email });
    expect(res1.status).toBe(200);
    expect(res1.body?.success).toBe(true);

    // Immediate second send should be blocked by perEmailSendLimiter (429)
    const res2 = await request(app)
      .post('/api/users/auth/send-code')
      .send({ email });
    expect(res2.status).toBe(429);
    expect(res2.body?.success).toBe(false);
    expect(String(res2.body?.error || '')).toMatch(/wait/i);
  });

  it('enforces per-email verify attempts limiter after 5 failures', async () => {
    const email = `limit-verify-${Date.now()}@example.com`;
    await createUser(email);

    // Issue a code so the user has an active record
    const send = await request(app).post('/api/users/auth/send-code').send({ email });
    expect(send.status).toBe(200);

    // Make 5 incorrect verification attempts
    for (let i = 0; i < 5; i++) {
      const bad = await request(app)
        .post('/api/users/auth/verify-code')
        .send({ email, code: '000000' });
      expect([400, 429]).toContain(bad.status);
      if (bad.status === 429) {
        // If rate limiter kicks in sooner due to IP limiter, break and assert
        expect(String(bad.body?.error || '')).toMatch(/Too many verification attempts|try again/i);
        return;
      }
      expect(bad.body?.success).toBe(false);
    }

    // 6th attempt should be blocked by perEmailVerifyLimiter
    const blocked = await request(app)
      .post('/api/users/auth/verify-code')
      .send({ email, code: '000000' });
    expect(blocked.status).toBe(429);
    expect(blocked.body?.success).toBe(false);
    expect(String(blocked.body?.error || '')).toMatch(/Too many verification attempts|try again/i);
  });

  it('verifies successfully with dev code and updates status', async () => {
    const email = `verify-success-${Date.now()}@example.com`;
    await createUser(email);

    const send = await request(app).post('/api/users/auth/send-code').send({ email });
    expect(send.status).toBe(200);
    // Dev environment returns devCode in body
    const devCode = String(send.body?.devCode || '');
    expect(devCode).toMatch(/^\d{6}$/);

    const verify = await request(app)
      .post('/api/users/auth/verify-code')
      .send({ email, code: devCode });
    expect(verify.status).toBe(200);
    expect(verify.body?.success).toBe(true);

    const status = await request(app)
      .get(`/api/users/auth/verification-status/${encodeURIComponent(email)}`)
      .send();
    expect(status.status).toBe(200);
    expect(status.body?.success).toBe(true);
    expect(status.body?.user?.isVerified).toBe(true);
  });
});