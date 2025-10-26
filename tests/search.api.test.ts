import 'reflect-metadata';
import express from 'express';
import bodyParser from 'body-parser';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { describe, it, expect, beforeAll } from 'vitest';

let searchRouter: any;
let projectsRouter: any;
let tasksRouter: any;
let commentsRouter: any;
let orgsRouter: any;
let teamsRouter: any;
let usersRouter: any;
let AppDataSource: any;
let Models: any;
let JWT_SECRET = 'dev_secret';

function createTestApp() {
  const app = express();
  app.use(bodyParser.json());
  app.use('/api/search', searchRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/comments', commentsRouter);
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

describe('Search API: filters and RBAC enforcement', () => {
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
  let taskA: any;
  let taskB: any;
  let commentA: any;

  const suffix = Date.now();
  const uniqueQ = `searchq_${suffix}`;

  beforeAll(async () => {
    if (process.env.JWT_SECRET) {
      JWT_SECRET = String(process.env.JWT_SECRET);
    }
    process.env.RESEND_API_KEY = '';

    const searchMod = await import('../dist/routes/search.js');
    searchRouter = searchMod.default;
    const projectsMod = await import('../dist/routes/projects.js');
    projectsRouter = projectsMod.default;
    const tasksMod = await import('../dist/routes/tasks.js');
    tasksRouter = tasksMod.default;
    const commentsMod = await import('../dist/routes/comments.js');
    commentsRouter = commentsMod.default;
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
      .send({ name: `Search Org ${suffix}` });
    expect([200, 201]).toContain(orgRes.status);
    org = orgRes.body;

    // Create team by owner
    const teamRes = await request(app)
      .post(`/api/teams/${org.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: `Search Team ${suffix}` });
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
      .send({ name: `Search Project ${suffix}`, description: `desc ${uniqueQ}`, teamId: team.id });
    expect([200, 201]).toContain(projRes.status);
    project = projRes.body;

    // Create tasks with unique text
    const taskResA = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: `Alpha ${uniqueQ}`, description: `alpha ${uniqueQ}`, projectId: project.id });
    expect([200, 201]).toContain(taskResA.status);
    taskA = taskResA.body;

    const taskResB = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: `Beta ${suffix}`, description: 'other', projectId: project.id });
    expect([200, 201]).toContain(taskResB.status);
    taskB = taskResB.body;

    // Add a comment with query text
    const commentRes = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ taskId: taskA.id, authorId: owner.id, content: `comment ${uniqueQ}` });
    expect([200, 201]).toContain(commentRes.status);
    commentA = commentRes.body;
  });

  it('member can search tasks by q within team', async () => {
    const res = await request(app)
      .get(`/api/search/tasks?q=${encodeURIComponent(uniqueQ)}&teamId=${team.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send();
    expect(res.status).toBe(200);
    const items = Array.isArray(res.body?.items) ? res.body.items : [];
    const found = items.find((it: any) => String(it?.title || '').includes('Alpha'));
    expect(!!found).toBe(true);
  });

  it('outsider cannot search tasks with teamId context', async () => {
    const res = await request(app)
      .get(`/api/search/tasks?q=${encodeURIComponent(uniqueQ)}&teamId=${team.id}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send();
    expect([401, 403]).toContain(res.status);
  });

  it('owner can search projects by date range in team', async () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 1000 * 60 * 60);
    const later = new Date(now.getTime() + 1000 * 60 * 60);
    const res = await request(app)
      .get(
        `/api/search/projects?teamId=${team.id}&from=${encodeURIComponent(earlier.toISOString())}&to=${encodeURIComponent(later.toISOString())}`
      )
      .set('Authorization', `Bearer ${ownerToken}`)
      .send();
    expect(res.status).toBe(200);
    const items = Array.isArray(res.body?.items) ? res.body.items : [];
    const found = items.find((it: any) => Number(it?.id) === Number(project.id));
    expect(!!found).toBe(true);
  });

  it('owner can search comments by projectId and q in team', async () => {
    const res = await request(app)
      .get(
        `/api/search/comments?teamId=${team.id}&projectId=${project.id}&q=${encodeURIComponent(uniqueQ)}`
      )
      .set('Authorization', `Bearer ${ownerToken}`)
      .send();
    expect(res.status).toBe(200);
    const items = Array.isArray(res.body?.items) ? res.body.items : [];
    const found = items.find((it: any) => Number(it?.id) === Number(commentA?.id));
    expect(!!found).toBe(true);
  });
});
