import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../db/data-source.js';
import { Membership } from '../models/Membership.js';
import { SecurityEvent } from '../models/SecurityEvent.js';

const ROLE_ORDER: Record<string, number> = { viewer: 0, member: 1, admin: 2, owner: 3 };

export type RBACResource = 'project' | 'task' | 'comment' | 'file';
export type RBACAction = 'read' | 'create' | 'update' | 'delete';

// Permission matrix: which minimum role can perform each action per resource
const RBAC_MATRIX: Record<RBACResource, Record<RBACAction, keyof typeof ROLE_ORDER>> = {
  project: { read: 'viewer', create: 'admin', update: 'admin', delete: 'admin' },
  task: { read: 'viewer', create: 'member', update: 'member', delete: 'admin' },
  comment: { read: 'viewer', create: 'member', update: 'member', delete: 'member' },
  file: { read: 'viewer', create: 'member', update: 'member', delete: 'admin' },
};

export function getUserRoleForTeam(userId: number, teamId: number): Promise<string | null> {
  const memRepo = AppDataSource.getRepository(Membership);
  return memRepo.find({ relations: { user: true, team: true, org: true } }).then((memberships) => {
    const m = memberships.find(
      (mm) => (mm.team as any)?.id === teamId && (mm.user as any)?.id === userId
    );
    return m?.role || null;
  });
}

export function authorize(opts: {
  userId?: number;
  teamId?: number;
  resource: RBACResource;
  action: RBACAction;
}): Promise<{ allowed: boolean; role?: string | null; reason?: string }> {
  const { userId, teamId, resource, action } = opts;
  if (!userId) return Promise.resolve({ allowed: false, reason: 'unauthorized' });
  const minRole = RBAC_MATRIX[resource]?.[action];
  if (!minRole) return Promise.resolve({ allowed: false, reason: 'unknown_resource_or_action' });
  if (!teamId) {
    // Without team context, fallback to owner-only checks handled in controllers
    return Promise.resolve({ allowed: true, role: null });
  }
  return getUserRoleForTeam(userId, teamId).then((role) => {
    if (!role) return { allowed: false, role, reason: 'not_a_member' };
    const ok = (ROLE_ORDER[role] ?? -1) >= ROLE_ORDER[minRole];
    return { allowed: ok, role, reason: ok ? undefined : 'insufficient_role' };
  });
}

async function logPermission(
  req: Request,
  data: {
    userId: number | null;
    teamId: number | null;
    resource: RBACResource;
    action: RBACAction;
    outcome: 'allowed' | 'denied';
    reason?: string;
  }
) {
  try {
    const repo = AppDataSource.getRepository(SecurityEvent);
    const ev = repo.create({
      email: null,
      userId: data.userId ?? null,
      eventType: data.outcome === 'allowed' ? 'permission_check' : 'permission_denied',
      ip: req?.ip || null,
      metadata: {
        resource: data.resource,
        action: data.action,
        teamId: data.teamId,
        path: req?.originalUrl || null,
        ua: req?.headers['user-agent'] || null,
        reason: data.reason || null,
      },
      createdAt: new Date(),
    });
    await repo.save(ev);
  } catch {}
}

export function requirePermission(resource: RBACResource, action: RBACAction) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId as number | undefined;
    const teamId =
      Number(
        (req.params as any).teamId || (req.query as any)?.teamId || (req.body as any)?.teamId || 0
      ) || undefined;
    const result = await authorize({ userId, teamId, resource, action });
    if (!result.allowed) {
      await logPermission(req, {
        userId: userId ?? null,
        teamId: teamId ?? null,
        resource,
        action,
        outcome: 'denied',
        reason: result.reason,
      });
      return res
        .status(result.reason === 'unauthorized' ? 401 : 403)
        .json({ error: result.reason || 'forbidden' });
    }
    await logPermission(req, {
      userId: userId ?? null,
      teamId: teamId ?? null,
      resource,
      action,
      outcome: 'allowed',
    });
    return next();
  };
}

export { ROLE_ORDER, RBAC_MATRIX };

export function requireTeamRole(minRole: 'viewer' | 'member' | 'admin' | 'owner') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId as number | undefined;
      if (!userId) return res.status(401).json({ error: 'unauthorized' });
      const teamId = Number(
        (req.params as any).teamId || (req.query as any)?.teamId || (req.body as any)?.teamId || 0
      );
      if (!teamId) return res.status(400).json({ error: 'teamId required' });

      const memRepo = AppDataSource.getRepository(Membership);
      const memberships = await memRepo.find({ relations: { user: true, team: true } });
      const m = memberships.find(
        (mm) => (mm.team as any)?.id === teamId && (mm.user as any)?.id === userId
      );
      if (!m) return res.status(403).json({ error: 'not a member' });
      const ok = (ROLE_ORDER[m.role] ?? -1) >= ROLE_ORDER[minRole];
      if (!ok) return res.status(403).json({ error: 'insufficient role' });
      return next();
    } catch (e) {
      return res.status(500).json({ error: 'authorization failed' });
    }
  };
}

export function requireOrgOwner() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId as number | undefined;
      if (!userId) return res.status(401).json({ error: 'unauthorized' });
      const orgId = Number(
        (req.params as any).id || (req.query as any)?.orgId || (req.body as any)?.orgId || 0
      );
      if (!orgId) return res.status(400).json({ error: 'organization id required' });

      const orgRepo = AppDataSource.getRepository(
        require('../models/Organization.js').Organization
      );
      const org = await orgRepo.findOne({ where: { id: orgId } });
      if (!org) return res.status(404).json({ error: 'organization not found' });
      if ((org as any).ownerUserId !== userId)
        return res.status(403).json({ error: 'owner required' });
      return next();
    } catch (e) {
      return res.status(500).json({ error: 'authorization failed' });
    }
  };
}
