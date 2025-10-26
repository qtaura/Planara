import 'reflect-metadata';
import express from 'express';
import bodyParser from 'body-parser';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { describe, it, expect, beforeAll } from 'vitest';

let orgsRouter: any;
let teamsRouter: any;
let usersRouter: any;
let AppDataSource: any;
let Models: any;
let JWT_SECRET = 'dev_secret';

function createTestApp() {
  const app = express();
  app.use(bodyParser.json());
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

describe('Organizations, Teams, Invites and RBAC API', () => {
  let app: ReturnType<typeof createTestApp>;
  let owner: any;
  let member: any;
  let outsider: any;
  let ownerToken: string;
  let memberToken: string;
  let outsiderToken: string;

  let org: any;
  let team: any;

  beforeAll(async () => {
    // Ensure consistent secret for signing
    if (process.env.JWT_SECRET) {
      JWT_SECRET = String(process.env.JWT_SECRET);
    }
    // Avoid constructing real email client in compiled modules
    process.env.RESEND_API_KEY = '';

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

    // Seed users
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    owner = await createUser(`owner${suffix}`, `owner${suffix}@example.com`, { verified: true });
    member = await createUser(`member${suffix}`, `member${suffix}@example.com`, { verified: true });
    outsider = await createUser(`outsider${suffix}`, `outsider${suffix}@example.com`, {
      verified: true,
    });
    ownerToken = issueToken(owner.id);
    memberToken = issueToken(member.id);
    outsiderToken = issueToken(outsider.id);
  });

  it('creates organization as verified user and lists it', async () => {
    const res = await request(app)
      .post('/api/orgs')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: `Acme Org ${Date.now()}` });
    expect([200, 201]).toContain(res.status);
    org = res.body;
    expect(org?.id).toBeDefined();
    expect(org?.ownerUserId).toBe(owner.id);

    const list = await request(app)
      .get('/api/orgs')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send();
    expect(list.status).toBe(200);
    const found = (Array.isArray(list.body) ? list.body : []).find((o: any) => o.id === org.id);
    expect(!!found).toBe(true);
  });

  it('prevents non-owner from creating team in org', async () => {
    const attempt = await request(app)
      .post(`/api/teams/${org.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name: `Team Fail ${Date.now()}` });
    expect(attempt.status).toBe(403);
    expect(String(attempt.body?.error || '')).toMatch(/owner required/i);
  });

  it('creates a team in org by owner, and lists teams', async () => {
    const create = await request(app)
      .post(`/api/teams/${org.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: `Core Team ${Date.now()}` });
    expect([200, 201]).toContain(create.status);
    team = create.body;
    expect(team?.id).toBeDefined();

    const list = await request(app)
      .get(`/api/teams/${org.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send();
    expect(list.status).toBe(200);
    const hasTeam = (Array.isArray(list.body) ? list.body : []).some((t: any) => t.id === team.id);
    expect(hasTeam).toBe(true);
  });

  it('lists members requires team membership; owner sees self as owner', async () => {
    const ok = await request(app)
      .get(`/api/teams/members/${team.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send();
    expect(ok.status).toBe(200);
    const items = Array.isArray(ok.body?.items) ? ok.body.items : [];
    expect(items.length).toBeGreaterThanOrEqual(1);
    const me = items.find((m: any) => m?.user?.id === owner.id);
    expect(me?.role).toBe('owner');

    const denied = await request(app)
      .get(`/api/teams/members/${team.id}`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send();
    expect(denied.status).toBe(403);
    expect(String(denied.body?.error || '')).toMatch(/not a member/i);
  });

  it('invite user to team and accept invite to create membership', async () => {
    const invite = await request(app)
      .post('/api/users/auth/team/invite')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ identifier: member.email });
    expect(invite.status).toBe(200);
    expect(invite.body?.success).toBe(true);

    const accept = await request(app)
      .post('/api/users/auth/team/accept')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ from: owner.id, teamId: team.id });
    expect(accept.status).toBe(200);
    expect(accept.body?.success).toBe(true);

    const members = await request(app)
      .get(`/api/teams/members/${team.id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send();
    expect(members.status).toBe(200);
    const list = Array.isArray(members.body?.items) ? members.body.items : [];
    const hasMember = list.some((m: any) => m?.user?.id === member.id);
    expect(hasMember).toBe(true);
  });

  it('owner can promote member to admin; admin cannot demote last owner', async () => {
    const promote = await request(app)
      .post(`/api/teams/members/${team.id}/change-role`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ userId: member.id, role: 'admin' });
    expect(promote.status).toBe(200);
    expect(promote.body?.success).toBe(true);

    const failDemote = await request(app)
      .post(`/api/teams/members/${team.id}/change-role`)
      .set('Authorization', `Bearer ${memberToken}`) // now admin
      .send({ userId: owner.id, role: 'member' });
    expect([400, 403]).toContain(failDemote.status);
    expect(String(failDemote.body?.error || '')).toMatch(
      /cannot demote the last owner|insufficient role/i
    );
  });

  it('owner can transfer ownership; previous owner becomes admin', async () => {
    const transfer = await request(app)
      .post(`/api/teams/members/${team.id}/transfer-ownership`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ newOwnerUserId: member.id });
    expect(transfer.status).toBe(200);
    expect(transfer.body?.success).toBe(true);

    const members = await request(app)
      .get(`/api/teams/members/${team.id}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send();
    expect(members.status).toBe(200);
    const list = Array.isArray(members.body?.items) ? members.body.items : [];
    const nowOwner = list.find((m: any) => m?.user?.id === member.id);
    const prevOwner = list.find((m: any) => m?.user?.id === owner.id);
    expect(nowOwner?.role).toBe('owner');
    expect(prevOwner?.role).toBe('admin');
  });

  it('last owner cannot leave the team', async () => {
    // Admin attempts to leave: allowed
    const adminLeave = await request(app)
      .post(`/api/teams/members/${team.id}/leave`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send();
    expect(adminLeave.status).toBe(200);
    expect(adminLeave.body?.success).toBe(true);

    // Now member is the only owner; leaving should be blocked
    const ownerLeave = await request(app)
      .post(`/api/teams/members/${team.id}/leave`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send();
    expect(ownerLeave.status).toBe(400);
    expect(String(ownerLeave.body?.error || '')).toMatch(/cannot leave as the last owner/i);
  });
});