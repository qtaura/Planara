import 'reflect-metadata';
import express from 'express';
import bodyParser from 'body-parser';
import request from 'supertest';
import jwt from 'jsonwebtoken';
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

async function createUser(email: string) {
  const repo = AppDataSource.getRepository(Models.User);
  const user = repo.create({
    username: email.split('@')[0],
    usernameLower: email.split('@')[0].toLowerCase(),
    email,
    hashedPassword: 'test',
    isVerified: true,
  } as any);
  await repo.save(user);
  return user as any;
}

describe('Change email workflow', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    process.env.RESEND_API_KEY = '';
    const usersMod = await import('../dist/routes/users.js');
    usersRouter = usersMod.default;
    const dsMod = await import('../dist/db/data-source.js');
    AppDataSource = dsMod.AppDataSource;
    const modelsMod = await import('../dist/models/index.js');
    Models = modelsMod;
    app = createTestApp();
  });

  it('updates email, resets verification, issues code, and logs events', async () => {
    const oldEmail = `old-${Date.now()}@example.com`;
    const user = await createUser(oldEmail);
    const token = jwt.sign({ userId: (user as any).id }, process.env.JWT_SECRET || 'dev_secret', {
      expiresIn: '15m',
    });

    const newEmail = `new-${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/users/change-email')
      .set('Authorization', `Bearer ${token}`)
      .send({ newEmail });
    expect(res.status).toBe(200);
    expect(res.body?.success).toBe(true);
    expect(String(res.body?.message || '')).toMatch(/Email updated/i);

    // Verify user record updated and verification reset
    const userRepo = AppDataSource.getRepository(Models.User);
    const updated = await userRepo.findOne({ where: { id: (user as any).id } });
    expect(updated?.email).toBe(newEmail.toLowerCase());
    expect(updated?.isVerified).toBe(false);

    // Verify a verification code record exists
    const codeRepo = AppDataSource.getRepository(Models.EmailVerificationCode);
    const codeRec = await codeRepo.findOne({ where: { userId: (user as any).id } });
    expect(codeRec).toBeTruthy();
    expect(typeof (codeRec as any)?.code).toBe('string');

    // Verify security events recorded: email_changed and code_sent
    const evRepo = AppDataSource.getRepository(Models.SecurityEvent);
    const events = await evRepo.find({ where: { userId: (user as any).id } });
    const types = new Set(events.map((e: any) => e.eventType));
    expect(types.has('email_changed')).toBe(true);
    expect(types.has('code_sent')).toBe(true);
  });
});