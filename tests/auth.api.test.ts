import 'reflect-metadata';
import express from 'express';
import bodyParser from 'body-parser';
import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';

let usersRouter: any;
let AppDataSource: any;
let Models: any;

function createTestApp() {
  const app = express();
  app.use(bodyParser.json());
  app.use('/api/users', usersRouter);
  return app;
}

describe('Signup and Login flows', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    // Avoid constructing real email client in compiled modules
    process.env.RESEND_API_KEY = '';
    const usersMod = await import('../dist/routes/users.js');
    usersRouter = usersMod.default;
    const dsMod = await import('../dist/db/data-source.js');
    AppDataSource = dsMod.AppDataSource;
    if (!AppDataSource.isInitialized) {
      await dsMod.initDB();
    }
    const modelsMod = await import('../dist/models/index.js');
    Models = modelsMod;
    app = createTestApp();
  });

  it('rejects missing signup fields via Zod', async () => {
    const res = await request(app)
      .post('/api/users/signup')
      .send({ username: '', email: '', password: '' });
    expect(res.status).toBe(400);
    expect(res.body?.error).toBe('invalid_request');
  });

  it('signs up a new user and prevents duplicates', async () => {
    const suffix = Math.random().toString(36).slice(2, 10);
    const username = `tester_${suffix}`;
    const email = `tester_${suffix}@example.com`;

    const ok = await request(app)
      .post('/api/users/signup')
      .send({ username, email, password: 'secret123' });
    expect([200, 201]).toContain(ok.status);
    expect(ok.body?.id).toBeDefined();

    const dup = await request(app)
      .post('/api/users/signup')
      .send({ username, email, password: 'secret123' });
    expect(dup.status).toBe(409);
  });

  it('logs in with username or email and issues tokens', async () => {
    const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const username = `login_${suffix}`;
    const email = `login_${suffix}@example.com`;

    // Seed user directly via repo to control password hash simplicity
    const repo = AppDataSource.getRepository(Models.User);
    const user = repo.create({
      username,
      usernameLower: username.toLowerCase(),
      email,
      hashedPassword: await (await import('bcryptjs')).default.hash('secret123', 10),
    } as any);
    await repo.save(user);

    const byUser = await request(app)
      .post('/api/users/login')
      .send({ usernameOrEmail: username, password: 'secret123' });
    expect(byUser.status).toBe(200);
    expect(typeof byUser.body?.token).toBe('string');
    expect(typeof byUser.body?.refreshToken).toBe('string');

    const byEmail = await request(app)
      .post('/api/users/login')
      .send({ usernameOrEmail: email.toUpperCase(), password: 'secret123' });
    expect(byEmail.status).toBe(200);
    expect(typeof byEmail.body?.token).toBe('string');
    expect(typeof byEmail.body?.refreshToken).toBe('string');

    const bad = await request(app)
      .post('/api/users/login')
      .send({ usernameOrEmail: username, password: 'wrongpw' });
    expect(bad.status).toBe(401);
  });
});
