import 'reflect-metadata';
import express from 'express';
import bodyParser from 'body-parser';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { describe, it, expect, beforeAll } from 'vitest';

let attachmentsRouter: any;
let retentionRouter: any;
let projectsRouter: any;
let tasksRouter: any;
let orgsRouter: any;
let teamsRouter: any;
let usersRouter: any;
let AppDataSource: any;
let Models: any;
let JWT_SECRET = 'dev_secret';

function createTestApp() {
  const app = express();
  app.use(bodyParser.json());
  app.use('/api/attachments', attachmentsRouter);
  app.use('/api/retention', retentionRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/orgs', orgsRouter);
  app.use('/api/teams', teamsRouter);
  app.use('/api/users', usersRouter);
  return app;
}

async function createUser(username: string, email: string, { verified = true } = {}) {
  const repo = AppDataSource.getRepository(Models.User);
  const user = repo.create({
    username,
    usernameLower: username.toLowerCase(),
    email,
    hashedPassword: 'test',
    isVerified: !!verified,
  } as any);
  await repo.save(user);
  return user as any;
}

function issueToken(userId: number) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });
}

describe('Retention policies: admin routes and trimming behavior', () => {
  let app: ReturnType<typeof createTestApp>;
  let admin: any;
  let owner: any;
  let member: any;
  let adminToken: string;
  let ownerToken: string;
  let memberToken: string;
  let org: any;
  let team: any;
  let project: any;
  let attachmentId: number | null = null;

  beforeAll(async () => {
    if (process.env.JWT_SECRET) {
      JWT_SECRET = String(process.env.JWT_SECRET);
    }
    process.env.RESEND_API_KEY = '';
    process.env.ADMIN_UNLOCK_TOKEN = 'test_admin_token';

    const attachmentsMod = await import('../dist/routes/attachments.js');
    attachmentsRouter = attachmentsMod.default;
    const retentionMod = await import('../dist/routes/retention.js');
    retentionRouter = retentionMod.default;
    const projectsMod = await import('../dist/routes/projects.js');
    projectsRouter = projectsMod.default;
    const tasksMod = await import('../dist/routes/tasks.js');
    tasksRouter = tasksMod.default;
    const orgsMod = await import('../dist/routes/organizations.js');
    orgsRouter = orgsMod.default;
    const teamsMod = await import('../dist/routes/teams.js');
    teamsRouter = teamsMod.default;
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

    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    // Ensure admin user exists and reuse if already present to avoid unique constraint
    const userRepo = AppDataSource.getRepository(Models.User);
    const existingAdmin = await userRepo.findOne({ where: { email: 'hello@planara.org' } } as any);
    admin =
      existingAdmin ||
      (await createUser(`admin${suffix}`, 'hello@planara.org', { verified: true }));
    owner = await createUser(`owner${suffix}`, `owner${suffix}@example.com`, { verified: true });
    member = await createUser(`member${suffix}`, `member${suffix}@example.com`, { verified: true });
    adminToken = issueToken(admin.id);
    ownerToken = issueToken(owner.id);
    memberToken = issueToken(member.id);

    // Create org
    const orgRes = await request(app)
      .post('/api/orgs')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: `Retention Org ${Date.now()}` });
    expect([200, 201]).toContain(orgRes.status);
    org = orgRes.body;

    // Create team by owner
    const teamRes = await request(app)
      .post(`/api/teams/${org.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: `Retention Team ${Date.now()}` });
    expect([200, 201]).toContain(teamRes.status);
    team = teamRes.body;

    // Invite member and accept
    const invite = await request(app)
      .post('/api/users/auth/team/invite')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ identifier: member.email });
    expect(invite.status).toBe(200);

    const accept = await request(app)
      .post('/api/users/auth/team/accept')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ from: owner.id, teamId: team.id });
    expect(accept.status).toBe(200);

    // Create project within team context
    const projRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: `Retention Project ${Date.now()}`,
        description: 'retention test',
        teamId: team.id,
      });
    expect([200, 201]).toContain(projRes.status);
    project = projRes.body;
  });

  it('admin can create, list, update, and delete policies', async () => {
    // Create project policy
    const createRes = await request(app)
      .post('/api/retention/admin/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-admin-token', process.env.ADMIN_UNLOCK_TOKEN as string)
      .send({ scope: 'project', projectId: project.id, maxVersions: 2 });
    if (createRes.status >= 400) {
      // Log error details to aid debugging

      console.error('create policy error:', createRes.body);
    }
    expect([200, 201]).toContain(createRes.status);
    const policy = createRes.body;
    expect(policy?.projectId).toBe(project.id);

    // List
    const listRes = await request(app)
      .get('/api/retention/admin/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-admin-token', process.env.ADMIN_UNLOCK_TOKEN as string);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.find((p: any) => p.id === policy.id)).toBeTruthy();

    // Update
    const updateRes = await request(app)
      .put(`/api/retention/admin/policies/${policy.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-admin-token', process.env.ADMIN_UNLOCK_TOKEN as string)
      .send({ keepDays: 7 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.keepDays).toBe(7);

    // Delete
    const delRes = await request(app)
      .delete(`/api/retention/admin/policies/${policy.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-admin-token', process.env.ADMIN_UNLOCK_TOKEN as string);
    expect(delRes.status).toBe(200);
    expect(delRes.body?.success).toBe(true);
  });

  it('applies maxVersions trimming on upload', async () => {
    // Recreate policy with maxVersions=2
    const createRes = await request(app)
      .post('/api/retention/admin/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-admin-token', process.env.ADMIN_UNLOCK_TOKEN as string)
      .send({ scope: 'project', projectId: project.id, maxVersions: 2 });
    if (createRes.status >= 400) {
      console.error('create policy error:', createRes.body);
    }
    expect([200, 201]).toContain(createRes.status);

    // Member uploads 3 versions under team context
    const base = Buffer.from('v1 content');
    const v1Res = await request(app)
      .post('/api/attachments/upload')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        projectId: project.id,
        teamId: team.id,
        fileName: 'ret.txt',
        mimeType: 'text/plain',
        size: base.length,
        contentBase64: base.toString('base64'),
      });
    expect(v1Res.status).toBe(201);
    const att = v1Res.body;
    attachmentId = att.id;

    const v2 = Buffer.from('v2 content');
    const v2Res = await request(app)
      .post('/api/attachments/upload')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        projectId: project.id,
        teamId: team.id,
        attachmentId: att.id,
        fileName: 'ret.txt',
        mimeType: 'text/plain',
        size: v2.length,
        contentBase64: v2.toString('base64'),
      });
    expect(v2Res.status).toBe(201);

    const v3 = Buffer.from('v3 content');
    const v3Res = await request(app)
      .post('/api/attachments/upload')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        projectId: project.id,
        teamId: team.id,
        attachmentId: att.id,
        fileName: 'ret.txt',
        mimeType: 'text/plain',
        size: v3.length,
        contentBase64: v3.toString('base64'),
      });
    expect(v3Res.status).toBe(201);

    // Versions should be trimmed to 2 (keeping latests)
    const list = await request(app)
      .get(`/api/attachments/${att.id}/versions`)
      .set('Authorization', `Bearer ${memberToken}`)
      .query({ teamId: team.id });
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.length).toBe(2);
    const numbers = list.body.map((v: any) => v.versionNumber);
    expect(numbers).toContain(3);
  });

  // Age-based keepDays trimming tested via service; omitted in API tests
});
