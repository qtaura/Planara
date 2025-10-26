import 'reflect-metadata';
import express from 'express';
import bodyParser from 'body-parser';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { describe, it, expect, beforeAll } from 'vitest';

let commentsRouter: any;
let projectsRouter: any;
let tasksRouter: any;
let usersRouter: any;
let AppDataSource: any;
let Models: any;
let JWT_SECRET = 'dev_secret';

function createTestApp() {
  const app = express();
  app.use(bodyParser.json());
  app.use('/api/comments', commentsRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/tasks', tasksRouter);
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

describe('Comments API: mentions, replies, reactions', () => {
  let app: ReturnType<typeof createTestApp>;
  let owner: any;
  let commenter: any;
  let ownerToken: string;
  let commenterToken: string;
  let project: any;
  let task: any;

  beforeAll(async () => {
    if (process.env.JWT_SECRET) {
      JWT_SECRET = String(process.env.JWT_SECRET);
    }
    process.env.RESEND_API_KEY = '';

    const commentsMod = await import('../dist/routes/comments.js');
    commentsRouter = commentsMod.default;
    const projectsMod = await import('../dist/routes/projects.js');
    projectsRouter = projectsMod.default;
    const tasksMod = await import('../dist/routes/tasks.js');
    tasksRouter = tasksMod.default;
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
    commenter = await createUser(`commenter${suffix}`, `commenter${suffix}@example.com`, {
      verified: true,
    });
    ownerToken = issueToken(owner.id);
    commenterToken = issueToken(commenter.id);

    // Create a project owned by owner
    const projRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: `CommentsProj ${suffix}`, description: 'Test comments project' });
    expect([200, 201]).toContain(projRes.status);
    project = projRes.body;

    // Create a task in the project
    const taskRes = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: `Task ${suffix}`, projectId: project.id });
    expect([200, 201]).toContain(taskRes.status);
    task = taskRes.body;
  });

  it('creates a root comment with @mention and lists comments', async () => {
    const content = `Hello @${owner.username}, check this.`;
    const res = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${commenterToken}`)
      .send({ taskId: task.id, authorId: commenter.id, content });
    expect([200, 201]).toContain(res.status);
    const comment = res.body;
    expect(comment?.id).toBeDefined();
    expect(Array.isArray(comment?.mentions)).toBe(true);
    expect(comment.mentions).toContain(owner.username.toLowerCase());
    expect(comment?.threadId || comment?.thread?.id).toBeDefined();

    const list = await request(app)
      .get(`/api/comments?taskId=${task.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send();
    expect(list.status).toBe(200);
    const comments = Array.isArray(list.body) ? list.body : [];
    const found = comments.find((c: any) => c.id === comment.id);
    expect(!!found).toBe(true);
  });

  it('creates a reply and enforces max depth', async () => {
    // Create root
    const rootRes = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${commenterToken}`)
      .send({ taskId: task.id, authorId: commenter.id, content: 'Root' });
    expect([200, 201]).toContain(rootRes.status);
    const root = rootRes.body;

    // Reply depth 1
    const r1 = await request(app)
      .post(`/api/comments/${root.id}/replies`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ parentCommentId: root.id, authorId: owner.id, content: 'Reply 1' });
    expect([200, 201]).toContain(r1.status);
    const c1 = r1.body;

    // Reply depth 2
    const r2 = await request(app)
      .post(`/api/comments/${c1.id}/replies`)
      .set('Authorization', `Bearer ${commenterToken}`)
      .send({ parentCommentId: c1.id, authorId: commenter.id, content: 'Reply 2' });
    expect([200, 201]).toContain(r2.status);
    const c2 = r2.body;

    // Reply depth 3
    const r3 = await request(app)
      .post(`/api/comments/${c2.id}/replies`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ parentCommentId: c2.id, authorId: owner.id, content: 'Reply 3' });
    expect([200, 201]).toContain(r3.status);

    // Attempt depth 4 (should fail)
    const r4 = await request(app)
      .post(`/api/comments/${r3.body.id}/replies`)
      .set('Authorization', `Bearer ${commenterToken}`)
      .send({ parentCommentId: r3.body.id, authorId: commenter.id, content: 'Reply 4' });
    expect(r4.status).toBe(400);
    expect(String(r4.body?.error || '')).toMatch(/max thread depth/i);
  });

  it('adds and removes reactions', async () => {
    const cRes = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ taskId: task.id, authorId: owner.id, content: 'React here' });
    expect([200, 201]).toContain(cRes.status);
    const c = cRes.body;

    const add = await request(app)
      .post(`/api/comments/${c.id}/reactions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ type: 'thumbs_up', op: 'add' });
    expect(add.status).toBe(200);
    expect(Number(add.body?.reactions?.thumbs_up || 0)).toBeGreaterThanOrEqual(1);

    const remove = await request(app)
      .post(`/api/comments/${c.id}/reactions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ type: 'thumbs_up', op: 'remove' });
    expect(remove.status).toBe(200);
    expect(Number(remove.body?.reactions?.thumbs_up || 0)).toBeGreaterThanOrEqual(0);
  });
});
