import 'reflect-metadata';
import { describe, it, expect, beforeAll } from 'vitest';

let AppDataSource: any;
let Models: any;
let authorize: any;
let RBAC_MATRIX: any;

describe('RBAC unit: matrix and authorize basics', () => {
  beforeAll(async () => {
    const dsMod = await import('../dist/db/data-source.js');
    AppDataSource = dsMod.AppDataSource;
    if (!AppDataSource.isInitialized) {
      await dsMod.initDB();
    }
    const modelsMod = await import('../dist/models/index.js');
    Models = modelsMod;
    const rbacMod = await import('../dist/middlewares/rbac.js');
    authorize = rbacMod.authorize;
    RBAC_MATRIX = rbacMod.RBAC_MATRIX;
  });

  it('RBAC matrix has expected minimum roles', () => {
    expect(RBAC_MATRIX.task.read).toBe('viewer');
    expect(RBAC_MATRIX.task.create).toBe('member');
    expect(RBAC_MATRIX.task.update).toBe('member');
    expect(RBAC_MATRIX.task.delete).toBe('admin');
    expect(RBAC_MATRIX.project.create).toBe('admin');
  });

  it('authorize denies when unauthenticated', async () => {
    const res = await authorize({ userId: undefined, teamId: 1, resource: 'task', action: 'read' });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('unauthorized');
  });

  it('authorize allows fallback when no teamId is provided', async () => {
    // create a user to have a valid id
    const userRepo = AppDataSource.getRepository(Models.User);
    const user = userRepo.create({
      username: `ut_${Date.now()}`,
      email: `u_${Date.now()}@example.com`,
      hashedPassword: 'x',
      isVerified: true,
    } as any);
    await userRepo.save(user);

    const res = await authorize({ userId: user.id, resource: 'task', action: 'update' });
    expect(res.allowed).toBe(true);
    expect(res.role).toBeNull();
  });

  it('authorize denies not_a_member when teamId provided but no membership', async () => {
    const userRepo = AppDataSource.getRepository(Models.User);
    const teamRepo = AppDataSource.getRepository(Models.Team);
    const orgRepo = AppDataSource.getRepository(Models.Organization);

    const user = userRepo.create({
      username: `nonmem_${Date.now()}`,
      email: `nm_${Date.now()}@example.com`,
      hashedPassword: 'x',
      isVerified: true,
    } as any);
    await userRepo.save(user);

    const org = orgRepo.create({
      name: `Org ${Date.now()}`,
      slug: `org-${Date.now()}`,
      nameLower: `org-${Date.now()}`,
      ownerUserId: user.id,
    } as any);
    await orgRepo.save(org);

    const team = teamRepo.create({
      name: `Team ${Date.now()}`,
      slug: `team-${Date.now()}`,
      nameLower: `team-${Date.now()}`,
      organization: org,
    } as any);
    await teamRepo.save(team);

    const res = await authorize({
      userId: user.id,
      teamId: team.id,
      resource: 'task',
      action: 'update',
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('not_a_member');
  });

  it('member can update tasks but cannot delete; admin can delete', async () => {
    const userRepo = AppDataSource.getRepository(Models.User);
    const teamRepo = AppDataSource.getRepository(Models.Team);
    const orgRepo = AppDataSource.getRepository(Models.Organization);
    const memRepo = AppDataSource.getRepository(Models.Membership);

    const user = userRepo.create({
      username: `mem_${Date.now()}`,
      email: `m_${Date.now()}@example.com`,
      hashedPassword: 'x',
      isVerified: true,
    } as any);
    await userRepo.save(user);

    const org = orgRepo.create({
      name: `Org ${Date.now()}`,
      slug: `org-${Date.now()}`,
      nameLower: `org-${Date.now()}`,
      ownerUserId: user.id,
    } as any);
    await orgRepo.save(org);

    const team = teamRepo.create({
      name: `Team ${Date.now()}`,
      slug: `team-${Date.now()}`,
      nameLower: `team-${Date.now()}`,
      organization: org,
    } as any);
    await teamRepo.save(team);

    const mem = memRepo.create({ user, org, team, role: 'member' } as any);
    await memRepo.save(mem);

    const upd = await authorize({
      userId: user.id,
      teamId: team.id,
      resource: 'task',
      action: 'update',
    });
    expect(upd.allowed).toBe(true);
    expect(upd.role).toBe('member');

    const delDenied = await authorize({
      userId: user.id,
      teamId: team.id,
      resource: 'task',
      action: 'delete',
    });
    expect(delDenied.allowed).toBe(false);
    expect(delDenied.reason).toBe('insufficient_role');

    mem.role = 'admin';
    await memRepo.save(mem);
    const delOk = await authorize({
      userId: user.id,
      teamId: team.id,
      resource: 'task',
      action: 'delete',
    });
    expect(delOk.allowed).toBe(true);
    expect(delOk.role).toBe('admin');
  });
});
