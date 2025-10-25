import 'reflect-metadata';
import express from 'express';
import bodyParser from 'body-parser';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { describe, it, expect, beforeAll } from 'vitest';

let attachmentsRouter: any;
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

describe('Attachments API with RBAC', () => {
  let app: ReturnType<typeof createTestApp>;
  let owner: any;
  let member: any;
  let outsider: any;
  let ownerToken: string;
  let memberToken: string;
  let outsiderToken: string;

  let org: any;
  let team: any;
  let project: any;
  let task: any;

  beforeAll(async () => {
    if (process.env.JWT_SECRET) {
      JWT_SECRET = String(process.env.JWT_SECRET);
    }
    process.env.RESEND_API_KEY = '';

    const attachmentsMod = await import('../dist/routes/attachments.js');
    attachmentsRouter = attachmentsMod.default;
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

    const suffix = Date.now();
    owner = await createUser(`owner${suffix}`, `owner${suffix}@example.com`, { verified: true });
    member = await createUser(`member${suffix}`, `member${suffix}@example.com`, { verified: true });
    outsider = await createUser(`outsider${suffix}`, `outsider${suffix}@example.com`, { verified: true });
    ownerToken = issueToken(owner.id);
    memberToken = issueToken(member.id);
    outsiderToken = issueToken(outsider.id);

    // Create org
    const orgRes = await request(app)
      .post('/api/orgs')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: `Attachments Org ${Date.now()}` });
    expect([200, 201]).toContain(orgRes.status);
    org = orgRes.body;

    // Create team by owner
    const teamRes = await request(app)
      .post(`/api/teams/${org.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: `Attachments Team ${Date.now()}` });
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
      .send({ name: `Attachments Project ${Date.now()}`, description: 'attachments test', teamId: team.id });
    expect([200, 201]).toContain(projRes.status);
    project = projRes.body;

    // Create task in project by owner
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Attachment Task', projectId: project.id });
    expect([200, 201]).toContain(taskRes.status);
    task = taskRes.body;
    expect(task?.id).toBeDefined();
  });

  it('owner can upload attachment to task (no teamId)', async () => {
    const content = Buffer.from('hello world');
    const res = await request(app)
      .post('/api/attachments/upload')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        taskId: task.id,
        fileName: 'hello.txt',
        mimeType: 'text/plain',
        size: content.length,
        contentBase64: content.toString('base64'),
      });
    expect(res.status).toBe(201);
    expect(res.body?.id).toBeDefined();
    expect(res.body?.latestVersionNumber).toBe(1);
  });

  it('member cannot upload without teamId (owner-only fallback)', async () => {
    const content = Buffer.from('member attempt');
    const res = await request(app)
      .post('/api/attachments/upload')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        taskId: task.id,
        fileName: 'member.txt',
        mimeType: 'text/plain',
        size: content.length,
        contentBase64: content.toString('base64'),
      });
    expect([401, 403]).toContain(res.status);
  });

  it('member can upload with teamId via RBAC', async () => {
    const content = Buffer.from('team upload');
    const res = await request(app)
      .post('/api/attachments/upload')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        taskId: task.id,
        teamId: team.id,
        fileName: 'team.txt',
        mimeType: 'text/plain',
        size: content.length,
        contentBase64: content.toString('base64'),
      });
    expect(res.status).toBe(201);
    expect(res.body?.id).toBeDefined();
  });

  it('member can add a new version to existing attachment with teamId', async () => {
    // First create a base attachment
    const base = Buffer.from('v1 content');
    const baseRes = await request(app)
      .post('/api/attachments/upload')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ taskId: task.id, teamId: team.id, fileName: 'versioned.txt', mimeType: 'text/plain', size: base.length, contentBase64: base.toString('base64') });
    expect(baseRes.status).toBe(201);
    const att = baseRes.body;

    // Upload v2 to same attachmentId
    const v2 = Buffer.from('v2 content');
    const v2Res = await request(app)
      .post('/api/attachments/upload')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ attachmentId: att.id, teamId: team.id, fileName: 'versioned.txt', mimeType: 'text/plain', size: v2.length, contentBase64: v2.toString('base64') });
    expect(v2Res.status).toBe(201);
    expect(v2Res.body?.latestVersionNumber).toBe(2);

    const list = await request(app)
      .get(`/api/attachments/${att.id}/versions`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send();
    expect(list.status).toBe(200);
    const versions = list.body as any[];
    expect(Array.isArray(versions)).toBe(true);
    expect(versions.length).toBeGreaterThanOrEqual(2);
    expect(versions[0]?.versionNumber).toBe(1);
    expect(versions[1]?.versionNumber).toBe(2);
  });

  it('preview requires owner without teamId; allowed with teamId for member', async () => {
    // Create an attachment as owner
    const buf = Buffer.from('preview me');
    const create = await request(app)
      .post('/api/attachments/upload')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ taskId: task.id, fileName: 'preview.txt', mimeType: 'text/plain', size: buf.length, contentBase64: buf.toString('base64') });
    const att = create.body;

    const deny = await request(app)
      .get(`/api/attachments/${att.id}/preview`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send();
    expect([401, 403]).toContain(deny.status);

    const allow = await request(app)
      .get(`/api/attachments/${att.id}/preview?teamId=${team.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send();
    expect(allow.status).toBe(200);
    expect(String(allow.headers['content-type'] || '')).toMatch(/text\/plain/);
  });

  it('member cannot delete with teamId; admin can delete', async () => {
    // Create attachment as member within team
    const buf = Buffer.from('delete me');
    const create = await request(app)
      .post('/api/attachments/upload')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ taskId: task.id, teamId: team.id, fileName: 'delete.txt', mimeType: 'text/plain', size: buf.length, contentBase64: buf.toString('base64') });
    const att = create.body;

    const deny = await request(app)
      .delete(`/api/attachments/${att.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ teamId: team.id });
    expect(deny.status).toBe(403);
    expect(String(deny.body?.error || '')).toMatch(/insufficient|forbidden/i);

    // Upgrade member to admin
    const promote = await request(app)
      .post(`/api/teams/members/${team.id}/change-role`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: member.id, role: 'admin' });
    expect(promote.status).toBe(200);

    const ok = await request(app)
      .delete(`/api/attachments/${att.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ teamId: team.id });
    expect(ok.status).toBe(200);
    expect(ok.body?.ok).toBe(true);
  });

  it('member can rollback to an earlier version with teamId', async () => {
    const v1 = Buffer.from('initial');
    const baseRes = await request(app)
      .post('/api/attachments/upload')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ taskId: task.id, teamId: team.id, fileName: 'rb.txt', mimeType: 'text/plain', size: v1.length, contentBase64: v1.toString('base64') });
    expect(baseRes.status).toBe(201);
    const att = baseRes.body;

    const v2 = Buffer.from('changed');
    const v2Res = await request(app)
      .post('/api/attachments/upload')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ attachmentId: att.id, teamId: team.id, fileName: 'rb.txt', mimeType: 'text/plain', size: v2.length, contentBase64: v2.toString('base64') });
    expect(v2Res.status).toBe(201);

    const rb = await request(app)
      .post(`/api/attachments/${att.id}/rollback`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ teamId: team.id, versionNumber: 1 });
    expect(rb.status).toBe(200);
    expect(rb.body?.latestVersionNumber).toBe(3);
  });
});