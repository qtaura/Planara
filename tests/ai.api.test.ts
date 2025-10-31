import 'reflect-metadata';
import express from 'express';
import bodyParser from 'body-parser';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { describe, it, expect, beforeAll } from 'vitest';

let aiRouter: any;
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
  app.use('/api/ai', aiRouter);
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

describe('AI API: context usage and scoping', () => {
  let app: ReturnType<typeof createTestApp>;
  let owner: any;
  let ownerToken: string;
  let org: any;
  let team: any;
  let projectA: any;
  let projectB: any;
  let taskA1: any;

  beforeAll(async () => {
    if (process.env.JWT_SECRET) JWT_SECRET = String(process.env.JWT_SECRET);
    process.env.RESEND_API_KEY = '';

    const aiMod = await import('../dist/routes/ai.js');
    aiRouter = aiMod.default;
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
    Models = await import('../dist/models/index.js');
    if (!AppDataSource.isInitialized) {
      await dsMod.initDB();
    }

    const uniq = Date.now();
    owner = await createUser(`owner_${uniq}`, `owner_${uniq}@example.com`, { verified: true });
    ownerToken = issueToken(owner.id);

    const orgRepo = AppDataSource.getRepository(Models.Organization);
    org = await orgRepo.save(
      orgRepo.create({
        name: 'Org1',
        nameLower: 'org1',
        slug: `org1_${uniq}`,
        ownerUserId: owner.id,
      } as any)
    );

    const teamRepo = AppDataSource.getRepository(Models.Team);
    team = await teamRepo.save(
      teamRepo.create({ name: 'Team1', nameLower: 'team1', slug: `team1_${uniq}`, org } as any)
    );

    const memberRepo = AppDataSource.getRepository(Models.Membership);
    await memberRepo.save(memberRepo.create({ team, org, user: owner, role: 'owner' } as any));

    const projRepo = AppDataSource.getRepository(Models.Project);
    projectA = await projRepo.save(
      projRepo.create({
        name: 'Project A',
        nameLower: 'project a',
        slug: `project-a_${uniq}`,
        owner: owner,
        team,
      } as any)
    );
    projectB = await projRepo.save(
      projRepo.create({
        name: 'Project B',
        nameLower: 'project b',
        slug: `project-b_${uniq}`,
        owner: owner,
        team,
      } as any)
    );

    const taskRepo = AppDataSource.getRepository(Models.Task);
    taskA1 = await taskRepo.save(
      taskRepo.create({
        title: 'A1',
        project: projectA,
        status: 'in-progress',
        priority: 'medium',
      } as any)
    );
    await taskRepo.save(
      taskRepo.create({ title: 'B1', project: projectB, status: 'done', priority: 'low' } as any)
    );

    app = createTestApp();
  });

  it('triage includes signals.context matching provided parameters', async () => {
    const res = await request(app)
      .post('/api/ai/triage/evaluate')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ orgId: org.id, teamId: team.id, projectId: projectA.id, taskId: taskA1.id });

    expect(res.status).toBe(200);
    const signals = res.body?.signals;
    expect(signals?.context).toEqual({
      orgId: org.id,
      projectId: projectA.id,
      teamId: team.id,
      taskId: taskA1.id,
    });
  });

  it('teamInsights filters tasks by projectId and echoes context', async () => {
    const res = await request(app)
      .get(
        `/api/ai/analytics/team-insights?orgId=${org.id}&teamId=${team.id}&projectId=${projectA.id}`
      )
      .set('Authorization', `Bearer ${ownerToken}`)
      .send();

    expect(res.status).toBe(200);
    const metrics = res.body?.metrics || {};
    expect(metrics.context).toEqual({ orgId: org.id, teamId: team.id, projectId: projectA.id });
    // Only tasks from Project A counted
    expect(typeof metrics.total).toBe('number');
    expect(metrics.total).toBeGreaterThanOrEqual(1);
    expect(metrics.total).toBeLessThanOrEqual(1); // exactly one created for project A
  });
});
