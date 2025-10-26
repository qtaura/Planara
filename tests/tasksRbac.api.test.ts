import 'reflect-metadata';
import express from 'express';
import bodyParser from 'body-parser';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { describe, it, expect, beforeAll } from 'vitest';

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

describe('RBAC API: task update/delete with team roles', () => {
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
    owner = await createUser(`owner${suffix}`, `owner${suffix}@example.com`, { verified: true });
    member = await createUser(`member${suffix}`, `member${suffix}@example.com`, { verified: true });
    outsider = await createUser(`outsider${suffix}`, `outsider${suffix}@example.com`, {
      verified: true,
    });
    ownerToken = issueToken(owner.id);
    memberToken = issueToken(member.id);
    outsiderToken = issueToken(outsider.id);

    // Create org
    const orgRes = await request(app)
      .post('/api/orgs')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: `RBAC Org ${Date.now()}` });
    expect([200, 201]).toContain(orgRes.status);
    org = orgRes.body;

    // Create team by owner
    const teamRes = await request(app)
      .post(`/api/teams/${org.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: `RBAC Team ${Date.now()}` });
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
      .send({ name: `RBAC Project ${Date.now()}`, description: 'rbac test', teamId: team.id });
    expect([200, 201]).toContain(projRes.status);
    project = projRes.body;

    // Create task in project by owner (controller enforces owner for personal, RBAC for team via middleware)
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'RBAC Task', projectId: project.id });
    expect([200, 201]).toContain(taskRes.status);
    task = taskRes.body;
    expect(task?.id).toBeDefined();
  });

  it('member can mark task done within team via RBAC update', async () => {
    const res = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ status: 'done', teamId: team.id });
    expect(res.status).toBe(200);
    expect(res.body?.status).toBe('done');
  });

  it('outsider cannot update task with teamId context', async () => {
    const res = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ status: 'done', teamId: team.id });
    expect(res.status).toBe(403);
    expect(String(res.body?.error || '')).toMatch(
      /not_a_member|not a member|forbidden|insufficient/i
    );
  });

  it('member cannot delete task; requires admin minimum', async () => {
    const res = await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ teamId: team.id });
    expect([401, 403]).toContain(res.status);
  });

  it('owner promotes member to admin, then admin deletes task', async () => {
    const promote = await request(app)
      .post(`/api/teams/members/${team.id}/change-role`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: member.id, role: 'admin' });
    expect(promote.status).toBe(200);

    const del = await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ teamId: team.id });
    expect(del.status).toBe(200);
    expect(del.body?.ok || del.body?.success).toBeTruthy();
  });
});
