import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../db/data-source.js";
import { User } from "../models/User.js";
import { EmailVerificationCode } from "../models/EmailVerificationCode.js";
import { EmailService } from "../services/emailService.js";
import crypto from 'crypto';
import { BannedEmail } from "../models/BannedEmail.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { isUsernameDisallowed, disallowedReason, isUsernameFormatValid, sanitizeUsernameToAllowed } from "../services/usernamePolicy.js";
import { recordUsernameRejected, recordSessionEvent, recordTokenAnomaly } from "../services/securityTelemetry.js";
import { Notification } from "../models/Notification.js";
import { SecurityEvent } from "../models/SecurityEvent.js";
import { authenticate } from "../middlewares/auth.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || "dev_refresh_secret";
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);
const MAX_CONCURRENT_SESSIONS = Number(process.env.MAX_CONCURRENT_SESSIONS || 5);

function sanitize(user: User) {
  const { hashedPassword, ...rest } = user as any;
  return rest;
}

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function issueRefreshTokenWithMeta(req: Request, userId: number, opts?: { rotatedFromId?: number; deviceName?: string | null; }) {
  const repo = AppDataSource.getRepository(RefreshToken);
  const jti = crypto.randomUUID();
  const expiresAt = daysFromNow(REFRESH_TTL_DAYS);
  const ua = (req?.headers['user-agent'] || null);
  const ip = (req?.ip || null);
  const deviceName = (opts?.deviceName ?? null);
  const record = repo.create({
    userId,
    jti,
    expiresAt,
    isRevoked: false,
    rotatedFromId: opts?.rotatedFromId ?? null,
    userAgent: typeof ua === 'string' ? ua : null,
    ip: typeof ip === 'string' ? ip : null,
    deviceName,
    lastUsedAt: new Date(),
  } as any);
  await repo.save(record);

  // Enforce concurrent session limit
  const active = await repo
    .createQueryBuilder('rt')
    .where('rt.userId = :userId', { userId })
    .andWhere('rt.isRevoked = false')
    .orderBy('rt.createdAt', 'ASC')
    .getMany();
  if (active.length > MAX_CONCURRENT_SESSIONS) {
    const toRevoke = active.slice(0, active.length - MAX_CONCURRENT_SESSIONS);
    for (const old of toRevoke) {
      await repo.update({ id: old.id }, { isRevoked: true, revokedAt: new Date() } as any);
      await recordSessionEvent({ req, userId, eventType: 'session_limit_enforced', refreshTokenId: old.id, jti: old.jti, deviceName: old.deviceName ?? null });
    }
  }

  const token = jwt.sign({ userId, jti, type: 'refresh' }, REFRESH_SECRET, { expiresIn: `${REFRESH_TTL_DAYS}d` });
  await recordSessionEvent({ req, userId, eventType: 'session_created', refreshTokenId: (record as any).id, jti, deviceName });
  return { refreshToken: token, jti, expiresAt, record };
}

export async function getUsers(req: Request, res: Response) {
  const repo = AppDataSource.getRepository(User);
  const limit = Math.min(Math.max(Number(req.query.limit || 25), 1), 100);
  const offset = Math.max(Number(req.query.offset || 0), 0);
  
  const [users, total] = await repo.findAndCount({
    take: limit,
    skip: offset,
    order: { id: 'DESC' }
  });
  
  res.json({
    items: users.map(sanitize),
    total,
    limit,
    offset,
    hasMore: offset + limit < total
  });
}

export async function signup(req: Request, res: Response) {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email and password are required" });
  }
  // Enforce allowed characters and length before blacklist/conflicts
  if (typeof username === "string" && !isUsernameFormatValid(username)) {
    await recordUsernameRejected({ req, email, username, source: 'signup', reason: 'format_invalid' });
    return res.status(400).json({ error: "Usernames can only include letters, numbers, and underscores — no spaces or special symbols." });
  }
  if (typeof username === "string" && isUsernameDisallowed(username)) {
    await recordUsernameRejected({ req, email, username, source: 'signup' });
    return res.status(400).json({ error: "This username isn’t allowed" });
  }
  // Block signups for banned emails
  const bannedRepo = AppDataSource.getRepository(BannedEmail);
  const banned = await bannedRepo.createQueryBuilder('b')
    .where('LOWER(b.email) = :email', { email: String(email).toLowerCase() })
    .getOne();
  if (banned) {
    return res.status(403).json({ error: "This email is banned from signing up" });
  }
  const repo = AppDataSource.getRepository(User);
  // Case-insensitive checks and set usernameLower
  const usernameLower = String(username).toLowerCase();
  const usernameConflict = await repo.findOne({ where: { usernameLower } });
  const emailConflict = await repo
    .createQueryBuilder('user')
    .where('LOWER(user.email) = :email', { email: String(email).toLowerCase() })
    .getOne();
  if (usernameConflict || emailConflict) {
    return res.status(409).json({ error: "username or email already exists" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = repo.create({ username, usernameLower, email, hashedPassword });
  await repo.save(user);
  res.status(201).json(sanitize(user));
}

export async function login(req: Request, res: Response) {
  const { usernameOrEmail, password } = req.body;
  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: "usernameOrEmail and password are required" });
  }
  const candidate = String(usernameOrEmail);
  // Disallow logins for banned emails
  const bannedRepo = AppDataSource.getRepository(BannedEmail);
  if (candidate.includes('@')) {
    const banned = await bannedRepo.createQueryBuilder('b').where('LOWER(b.email) = :email', { email: candidate.toLowerCase() }).getOne();
    if (banned) return res.status(403).json({ error: "This account is banned" });
  }
  const repo = AppDataSource.getRepository(User);
  // Case-insensitive lookup by email or username
  let user: User | null = null;
  if (candidate.includes('@')) {
    user = await repo
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :email', { email: candidate.toLowerCase() })
      .getOne();
  } else {
    user = await repo.findOne({ where: { usernameLower: candidate.toLowerCase() } });
  }
  if (!user) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  const ok = await bcrypt.compare(password, (user as any).hashedPassword);
  if (!ok) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  const token = jwt.sign({ userId: (user as any).id }, JWT_SECRET, { expiresIn: "15m" });
  const { refreshToken } = await issueRefreshTokenWithMeta(req, (user as any).id);
  res.json({ token, refreshToken, user: sanitize(user) });
}

export async function refresh(req: Request, res: Response) {
  try {
    const refreshToken = String(req.body?.refreshToken || '');
    if (!refreshToken) return res.status(400).json({ error: 'missing refreshToken' });
    const payload = jwt.verify(refreshToken, REFRESH_SECRET) as any;
    if (!payload?.jti || !payload?.userId || payload?.type !== 'refresh') {
      return res.status(401).json({ error: 'invalid refresh token' });
    }
    const repo = AppDataSource.getRepository(RefreshToken);
    const rec = await repo.findOne({ where: { jti: String(payload.jti), userId: Number(payload.userId) } });
    if (!rec) {
      await recordTokenAnomaly({ req, userId: Number(payload.userId), jti: String(payload.jti), reason: 'unknown_jti' });
      return res.status(401).json({ error: 'invalid refresh token' });
    }
    if (rec.isRevoked) {
      await recordTokenAnomaly({ req, userId: Number(payload.userId), refreshTokenId: rec.id, jti: rec.jti, reason: 'revoked_reuse' });
      return res.status(401).json({ error: 'refresh token expired or revoked' });
    }
    if (rec.expiresAt < new Date()) {
      await recordTokenAnomaly({ req, userId: Number(payload.userId), refreshTokenId: rec.id, jti: rec.jti, reason: 'expired_use' });
      return res.status(401).json({ error: 'refresh token expired or revoked' });
    }
    // Update last used
    await repo.update({ id: rec.id }, { lastUsedAt: new Date() } as any);
    // Rotate refresh token
    await repo.update({ id: rec.id }, { isRevoked: true, revokedAt: new Date() } as any);
    const { refreshToken: newRefreshToken, record: newRec } = await issueRefreshTokenWithMeta(req, Number(payload.userId), { rotatedFromId: rec.id, deviceName: rec.deviceName ?? null });
    // Link replacement
    await repo.update({ id: rec.id }, { replacedById: (newRec as any).id } as any);
    // Issue new access token reflecting current verification
    const token = jwt.sign({ userId: Number(payload.userId) }, JWT_SECRET, { expiresIn: "15m" });
    return res.json({ token, refreshToken: newRefreshToken });
  } catch (e) {
    return res.status(401).json({ error: 'invalid or expired refresh token' });
  }
}

export async function listSessions(req: Request, res: Response) {
  try {
    const userId = (req as any).userId as number | undefined;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const repo = AppDataSource.getRepository(RefreshToken);
    const sessions = await repo
      .createQueryBuilder('rt')
      .where('rt.userId = :userId', { userId })
      .orderBy('rt.createdAt', 'DESC')
      .getMany();
    return res.status(200).json({ success: true, sessions });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'failed to list sessions' });
  }
}

export async function revokeSession(req: Request, res: Response) {
  try {
    const userId = (req as any).userId as number | undefined;
    const id = Number(req.body?.id || 0);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    if (!id) return res.status(400).json({ error: 'missing id' });
    const repo = AppDataSource.getRepository(RefreshToken);
    const rec = await repo.findOne({ where: { id } });
    if (!rec || rec.userId !== userId) return res.status(404).json({ error: 'not found' });
    await repo.update({ id }, { isRevoked: true, revokedAt: new Date() } as any);
    await recordSessionEvent({ req, userId, eventType: 'session_revoked', refreshTokenId: rec.id, jti: rec.jti, deviceName: rec.deviceName ?? null });
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'failed to revoke session' });
  }
}

export async function renameSession(req: Request, res: Response) {
  try {
    const userId = (req as any).userId as number | undefined;
    const id = Number(req.body?.id || 0);
    const deviceName = String(req.body?.deviceName || '').slice(0, 255);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    if (!id || !deviceName) return res.status(400).json({ error: 'missing id or deviceName' });
    const repo = AppDataSource.getRepository(RefreshToken);
    const rec = await repo.findOne({ where: { id } });
    if (!rec || rec.userId !== userId) return res.status(404).json({ error: 'not found' });
    await repo.update({ id }, { deviceName } as any);
    await recordSessionEvent({ req, userId, eventType: 'session_renamed', refreshTokenId: rec.id, jti: rec.jti, deviceName });
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'failed to rename session' });
  }
}

export async function revokeOtherSessions(req: Request, res: Response) {
  try {
    const userId = (req as any).userId as number | undefined;
    const keepId = Number(req.body?.keepId || 0);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const repo = AppDataSource.getRepository(RefreshToken);
    const all = await repo.createQueryBuilder('rt').where('rt.userId = :userId', { userId }).andWhere('rt.isRevoked = false').getMany();
    const toRevoke = all.filter((rt) => rt.id !== keepId);
    for (const rec of toRevoke) {
      await repo.update({ id: rec.id }, { isRevoked: true, revokedAt: new Date() } as any);
      await recordSessionEvent({ req, userId, eventType: 'session_revoked', refreshTokenId: rec.id, jti: rec.jti, deviceName: rec.deviceName ?? null });
    }
    return res.status(200).json({ success: true, revokedCount: toRevoke.length });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'failed to revoke sessions' });
  }
}

// Admin: ban a user by email and free their username, but persist ban
export async function adminBanUser(req: Request, res: Response) {
  try {
    const email = String(req.body?.email || '');
    const reason = (req.body?.reason ? String(req.body.reason) : null);
    if (!email || !email.includes('@')) return res.status(400).json({ success: false, error: 'Invalid email' });
    const userRepo = AppDataSource.getRepository(User);
    const bannedRepo = AppDataSource.getRepository(BannedEmail);
    const user = await userRepo.createQueryBuilder('user').where('LOWER(user.email) = :email', { email: email.toLowerCase() }).getOne();
    // Insert ban record
    const bexists = await bannedRepo.createQueryBuilder('b').where('LOWER(b.email) = :email', { email: email.toLowerCase() }).getOne();
    if (!bexists) {
      await bannedRepo.save(bannedRepo.create({ email, reason, createdAt: new Date() }));
    }
    // Delete user row to free username (if exists)
    if (user) {
      await userRepo.delete({ id: (user as any).id });
    }
    // Telemetry: admin_user_banned
    try {
      const evRepo = AppDataSource.getRepository(SecurityEvent);
      await evRepo.save(evRepo.create({
        email,
        userId: (req as any).userId,
        eventType: 'admin_user_banned',
        ip: req.ip,
        metadata: { reason, deletedUser: Boolean(user) },
        createdAt: new Date(),
      } as any));
    } catch {}
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Failed to ban user' });
  }
}

// Admin: change a user's username
export async function adminSetUsername(req: Request, res: Response) {
  try {
    const email = String(req.body?.email || '');
    const newUsername = String(req.body?.newUsername || '');
    if (!email || !email.includes('@') || !newUsername) return res.status(400).json({ success: false, error: 'Invalid input' });
    // Enforce format before blacklist
    if (!isUsernameFormatValid(String(newUsername))) {
      await recordUsernameRejected({ req, email, username: newUsername, source: 'admin_set_username', reason: 'format_invalid' });
      return res.status(400).json({ success: false, error: 'Usernames can only include letters, numbers, and underscores — no spaces or special symbols.' });
    }
    if (isUsernameDisallowed(String(newUsername))) {
      await recordUsernameRejected({ req, email, username: newUsername, source: 'admin_set_username' });
      return res.status(400).json({ success: false, error: 'This username isn’t allowed' });
    }
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.createQueryBuilder('user').where('LOWER(user.email) = :email', { email: email.toLowerCase() }).getOne();
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    const unameLower = newUsername.toLowerCase();
    // Ensure new username is available
    const conflict = await userRepo.findOne({ where: { usernameLower: unameLower } });
    if (conflict && conflict.id !== (user as any).id) return res.status(409).json({ success: false, error: 'Username already taken' });
    const prevUsername = (user as any).username;
    await userRepo.update({ id: (user as any).id }, { username: newUsername, usernameLower: unameLower, usernameChangeCount: ((user as any).usernameChangeCount || 0) + 1 } as any);
    // Telemetry: admin_username_changed
    try {
      const evRepo = AppDataSource.getRepository(SecurityEvent);
      await evRepo.save(evRepo.create({
        email,
        userId: (req as any).userId,
        eventType: 'admin_username_changed',
        ip: req.ip,
        metadata: { targetUserId: (user as any).id, oldUsername: prevUsername, newUsername },
        createdAt: new Date(),
      } as any));
    } catch {}
    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Failed to change username' });
  }
}

export async function inviteToTeam(req: Request, res: Response) {
  try {
    const inviterId = (req as any).userId as number | undefined;
    if (!inviterId) return res.status(401).json({ error: 'unauthorized' });
    const identifier = String(req.body?.identifier || '').trim();
    if (!identifier) return res.status(400).json({ error: 'identifier is required' });

    const userRepo = AppDataSource.getRepository(User);
    const inviter = await userRepo.findOne({ where: { id: inviterId } });
    if (!inviter) return res.status(404).json({ error: 'inviter not found' });

    // Resolve target by username or email
    let target: User | null = null;
    if (identifier.includes('@')) {
      target = await userRepo
        .createQueryBuilder('user')
        .where('LOWER(user.email) = :email', { email: identifier.toLowerCase() })
        .getOne();
    } else {
      target = await userRepo.findOne({ where: { usernameLower: identifier.toLowerCase() } });
    }
    if (!target) return res.status(404).json({ error: 'user not found' });
    if ((target as any).id === inviterId) return res.status(400).json({ error: 'cannot invite yourself' });

    // Ensure there is a real Organization and Team for inviter
    const { Organization } = await import('../models/Organization.js');
    const { Team } = await import('../models/Team.js');
    const { Membership } = await import('../models/Membership.js');
    const orgRepo = AppDataSource.getRepository(Organization);
    const teamRepo = AppDataSource.getRepository(Team);
    const memRepo = AppDataSource.getRepository(Membership);

    // Try to find an existing membership for inviter to derive org/team
    let myMembership = (await memRepo.find({ relations: { user: true, team: true, org: true } }))
      .find(m => (m.user as any)?.id === inviterId);

    if (!myMembership) {
      // Create a simple org/team for inviter
      const orgName = `${(inviter as any).username || 'org'} Team`;
      const orgSlug = String(orgName).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const org = orgRepo.create({ name: orgName, slug: orgSlug, nameLower: orgName.toLowerCase(), ownerUserId: inviterId });
      await orgRepo.save(org);

      const team = teamRepo.create({ name: 'Default Team', slug: 'default', nameLower: 'default', org });
      await teamRepo.save(team);

      myMembership = memRepo.create({ user: inviter as any, org, team, role: 'owner' });
      await memRepo.save(myMembership);
    }

    const teamId = (myMembership.team as any).id as number;

    // If already in same team, short-circuit
    const existingTargetMembership = (await memRepo.find({ relations: { user: true, team: true } }))
      .find(m => (m.team as any)?.id === teamId && (m.user as any)?.id === (target as any).id);
    if (existingTargetMembership) {
      return res.status(409).json({ error: 'user already in your team' });
    }

    const notifRepoModule = await import('../models/Notification.js');
    const notifRepo = AppDataSource.getRepository(notifRepoModule.Notification);
    const notification = notifRepo.create({
      title: 'Team invite',
      message: `${(inviter as any).username || 'A user'} invited you to join their team`,
      type: 'team_invite',
      user: target as any,
      actionUrl: `planara://team-invite?teamId=${teamId}&from=${inviterId}`,
    } as any);
    await notifRepo.save(notification);

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'failed to send invite' });
  }
}

export async function acceptTeamInvite(req: Request, res: Response) {
  try {
    const userId = (req as any).userId as number | undefined;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const inviterId = Number(String((req.query?.from ?? req.body?.from) || ''));
    const teamIdParam = Number(String((req.query?.teamId ?? req.body?.teamId) || ''));

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'user not found' });

    const { Team } = await import('../models/Team.js');
    const { Organization } = await import('../models/Organization.js');
    const { Membership } = await import('../models/Membership.js');
    const teamRepo = AppDataSource.getRepository(Team);
    const orgRepo = AppDataSource.getRepository(Organization);
    const memRepo = AppDataSource.getRepository(Membership);

    let team: any = null;
    if (teamIdParam) {
      team = await teamRepo.findOne({ where: { id: teamIdParam }, relations: { org: true } as any });
    }

    if (!team && inviterId) {
      const inviter = await userRepo.findOne({ where: { id: inviterId } });
      if (!inviter) return res.status(404).json({ error: 'inviter not found' });
      const memberships = await memRepo.find({ relations: { user: true, team: true, org: true } });
      const inviterMem = memberships.find(m => (m.user as any)?.id === inviterId);
      if (inviterMem) {
        team = inviterMem.team;
        (team as any).org = inviterMem.org;
      }
    }

    if (!team) return res.status(400).json({ error: 'missing team context' });

    // Prevent duplicate membership
    const existing = (await memRepo.find({ relations: { user: true, team: true } }))
      .find(m => (m.team as any)?.id === (team as any).id && (m.user as any)?.id === userId);
    if (existing) return res.status(409).json({ error: 'already a member' });

    // Create membership and maintain legacy teamId for backward compatibility
    const org = (team as any).org || (await orgRepo.findOne({ where: { id: (team as any)?.org?.id } }));
    const membership = memRepo.create({ user: user as any, org: org as any, team: team as any, role: 'member' });
    await memRepo.save(membership);

    (user as any).teamId = (team as any).id;
    await userRepo.save(user);

    return res.status(200).json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'failed to accept invite' });
  }
}

export async function updateProfile(req: Request, res: Response) {
  try {
    const authUserId = (req as any).userId as number | undefined;
    const targetId = Number(req.params.id);
    if (!authUserId) return res.status(401).json({ error: 'unauthorized' });
    if (!targetId || targetId !== authUserId) return res.status(403).json({ error: 'forbidden' });

    const { username, email, password, teamId, avatar } = req.body as any;
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { id: targetId } });
    if (!user) return res.status(404).json({ error: 'user not found' });

    const updates: any = {};

    if (typeof username === 'string' && username.trim()) {
      const uname = username.trim();
      if (!isUsernameFormatValid(uname)) {
        return res.status(400).json({ error: 'Usernames can only include letters, numbers, and underscores — no spaces or special symbols.' });
      }
      if (isUsernameDisallowed(uname)) {
        return res.status(400).json({ error: 'This username isn’t allowed' });
      }
      const unameLower = uname.toLowerCase();
      const conflict = await repo.findOne({ where: { usernameLower: unameLower } });
      if (conflict && conflict.id !== (user as any).id) {
        return res.status(409).json({ error: 'username already exists' });
      }
      updates.username = uname;
      updates.usernameLower = unameLower;
      updates.usernameChangeCount = ((user as any).usernameChangeCount || 0) + 1;
    }

    if (typeof email === 'string' && email.trim()) {
      const eml = email.trim();
      if (!eml.includes('@')) {
        return res.status(400).json({ error: 'invalid email' });
      }
      const conflict = await repo
        .createQueryBuilder('user')
        .where('LOWER(user.email) = :email', { email: eml.toLowerCase() })
        .getOne();
      if (conflict && conflict.id !== (user as any).id) {
        return res.status(409).json({ error: 'email already exists' });
      }
      updates.email = eml;
    }

    if (typeof avatar === 'string') {
      updates.avatar = avatar;
    }

    if (typeof teamId === 'number') {
      updates.teamId = Number(teamId);
    }

    if (typeof password === 'string' && password.trim()) {
      const hashed = await bcrypt.hash(password.trim(), 10);
      updates.hashedPassword = hashed;
    }

    await repo.update({ id: (user as any).id }, updates);
    const updated = await repo.findOne({ where: { id: (user as any).id } });
    if (!updated) return res.status(500).json({ error: 'failed to update user' });
    return res.json(sanitize(updated));
  } catch (e) {
    return res.status(500).json({ error: 'failed to update profile' });
  }
}

// Minimal OAuth stubs to satisfy routes; real provider integration can be added later
export async function startOAuth(req: Request, res: Response) {
  try {
    const provider = String(req.params?.provider || '').toLowerCase();
    const origin = String(req.query?.origin || '');
    // Redirect immediately to callback with placeholder data in dev
    const url = new URL(`${req.protocol}://${req.get('host')}/api/users/oauth/${encodeURIComponent(provider)}/callback`);
    if (origin) url.searchParams.set('origin', origin);
    url.searchParams.set('provider', provider);
    res.redirect(url.toString());
  } catch (e) {
    res.status(500).send('OAuth start failed');
  }
}

export async function oauthCallback(req: Request, res: Response) {
  try {
    const provider = String((req.query?.provider || req.params?.provider || '')).toLowerCase();
    const origin = String(req.query?.origin || '');

    // In dev, simply return a small page that posts a message back
    const payload = {
      type: 'oauth',
      provider,
      token: null,
      user: null,
      created: false,
      verificationRequired: true,
    };

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>OAuth Complete</title></head><body><script>
      try {
        var data = ${JSON.stringify(payload)};
        var origin = ${JSON.stringify(origin || '*')};
        if (window.opener && window.opener.postMessage) {
          window.opener.postMessage(data, origin || '*');
        }
        window.close();
      } catch (e) { console.error(e); }
    </script><p>You may close this window.</p></body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) {
    res.status(500).send('OAuth callback failed');
  }
}

// Add: Change email and trigger re-verification
export async function changeEmail(req: Request, res: Response) {
  try {
    const userId = (req as any).userId as number | undefined;
    const newEmailRaw = String(req.body?.newEmail || '').trim();
    if (!userId) return res.status(401).json({ success: false, error: 'unauthorized' });
    if (!newEmailRaw || !newEmailRaw.includes('@')) return res.status(400).json({ success: false, error: 'invalid email' });
    const newEmail = newEmailRaw.toLowerCase();
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, error: 'user not found' });
    // Uniqueness check
    const conflict = await userRepo
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :email', { email: newEmail })
      .getOne();
    if (conflict && conflict.id !== (user as any).id) {
      return res.status(409).json({ success: false, error: 'email already exists' });
    }

    const oldEmail = (user as any).email;
    // Reset verification state and update email
    const verificationSecret = crypto.randomBytes(16).toString('hex');
    await userRepo.update({ id: (user as any).id }, {
      email: newEmail,
      isVerified: false,
      verifyInvalidCount: 0,
      verifyBackoffUntil: null as any,
      verifyLockedUntil: null as any,
      sendBackoffUntil: null as any,
      verificationSecret,
    } as any);

    // Purge existing codes for user
    const codeRepo = AppDataSource.getRepository(EmailVerificationCode);
    await codeRepo.createQueryBuilder()
      .delete()
      .from(EmailVerificationCode)
      .where('userId = :uid', { uid: (user as any).id })
      .execute();

    // Issue new verification code
    const code = crypto.randomInt(100000, 999999).toString();
    const codeHash = crypto.createHmac('sha256', verificationSecret).update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    const rec = codeRepo.create({ userId: (user as any).id, code, codeHash, expiresAt });
    await codeRepo.save(rec);
    await EmailService.sendVerificationCode({ email: newEmail, username: (user as any).username, code });

    // Telemetry: email_changed
    try {
      const evRepo = AppDataSource.getRepository(SecurityEvent);
      await evRepo.save(evRepo.create({ email: newEmail, userId: (user as any).id, eventType: 'email_changed', ip: req.ip, metadata: { oldEmail, newEmail }, createdAt: new Date() } as any));
      await evRepo.save(evRepo.create({ email: newEmail, userId: (user as any).id, eventType: 'code_sent', ip: req.ip, metadata: { expiresAt: expiresAt.toISOString(), reason: 'email_change' }, createdAt: new Date() } as any));
    } catch {}

    return res.status(200).json({ success: true, message: 'Email updated. Verification code sent.', expiresAt: expiresAt.toISOString(), devCode: process.env.RESEND_API_KEY ? undefined : code });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'failed to change email' });
  }
}

// Add: Change password with current password verification
export async function changePassword(req: Request, res: Response) {
  try {
    const userId = (req as any).userId as number | undefined;
    const { currentPassword, newPassword } = req.body;
    
    if (!userId) return res.status(401).json({ success: false, error: 'unauthorized' });
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'currentPassword and newPassword are required' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'newPassword must be at least 6 characters' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, error: 'user not found' });

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, (user as any).hashedPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ success: false, error: 'current password is incorrect' });
    }

    // Hash new password and update
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await userRepo.update({ id: userId }, { hashedPassword: hashedNewPassword } as any);

    // Telemetry: password_changed
    try {
      const evRepo = AppDataSource.getRepository(SecurityEvent);
      await evRepo.save(evRepo.create({ 
        email: (user as any).email, 
        userId, 
        eventType: 'password_changed', 
        ip: req.ip, 
        metadata: { timestamp: new Date().toISOString() }, 
        createdAt: new Date() 
      } as any));
    } catch {}

    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'failed to change password' });
  }
}

// Add: Delete account securely with password verification
export async function deleteAccount(req: Request, res: Response) {
  try {
    const userId = (req as any).userId as number | undefined;
    const { password } = req.body;
    
    if (!userId) return res.status(401).json({ success: false, error: 'unauthorized' });
    if (!password) {
      return res.status(400).json({ success: false, error: 'password is required to delete account' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) return res.status(404).json({ success: false, error: 'user not found' });

    // Verify password before deletion
    const isPasswordValid = await bcrypt.compare(password, (user as any).hashedPassword);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, error: 'incorrect password' });
    }

    const userEmail = (user as any).email;

    // Telemetry: account_deleted (before deletion)
    try {
      const evRepo = AppDataSource.getRepository(SecurityEvent);
      await evRepo.save(evRepo.create({ 
        email: userEmail, 
        userId, 
        eventType: 'account_deleted', 
        ip: req.ip, 
        metadata: { timestamp: new Date().toISOString() }, 
        createdAt: new Date() 
      } as any));
    } catch {}

    // Revoke all refresh tokens
    const refreshRepo = AppDataSource.getRepository(RefreshToken);
    await refreshRepo.update({ userId }, { isRevoked: true, revokedAt: new Date() } as any);

    // Delete verification codes
    const codeRepo = AppDataSource.getRepository(EmailVerificationCode);
    await codeRepo.createQueryBuilder()
      .delete()
      .from(EmailVerificationCode)
      .where('userId = :uid', { uid: userId })
      .execute();

    // Delete the user account
    await userRepo.remove(user);

    return res.status(200).json({ success: true, message: 'Account deleted successfully' });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'failed to delete account' });
  }
}