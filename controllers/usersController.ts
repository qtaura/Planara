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
import { recordUsernameRejected } from "../services/securityTelemetry.js";
import { Notification } from "../models/Notification.js";
import { authenticate } from "../middlewares/auth.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || "dev_refresh_secret";
const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);

function sanitize(user: User) {
  const { hashedPassword, ...rest } = user as any;
  return rest;
}

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function issueRefreshToken(userId: number) {
  const repo = AppDataSource.getRepository(RefreshToken);
  const jti = crypto.randomUUID();
  const expiresAt = daysFromNow(REFRESH_TTL_DAYS);
  const record = repo.create({ userId, jti, expiresAt, isRevoked: false });
  await repo.save(record);
  const token = jwt.sign({ userId, jti, type: 'refresh' }, REFRESH_SECRET, { expiresIn: `${REFRESH_TTL_DAYS}d` });
  return { refreshToken: token, jti, expiresAt };
}

export async function getUsers(_req: Request, res: Response) {
  const repo = AppDataSource.getRepository(User);
  const users = await repo.find();
  res.json(users.map(sanitize));
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
  const ok = await bcrypt.compare(password, user.hashedPassword);
  if (!ok) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  const token = jwt.sign({ userId: (user as any).id }, JWT_SECRET, { expiresIn: "15m" });
  const { refreshToken } = await issueRefreshToken((user as any).id);
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
    if (!rec || rec.isRevoked || rec.expiresAt < new Date()) {
      return res.status(401).json({ error: 'refresh token expired or revoked' });
    }
    // Rotate refresh token
    await repo.update({ id: rec.id }, { isRevoked: true });
    const { refreshToken: newRefreshToken } = await issueRefreshToken(Number(payload.userId));
    // Issue new access token reflecting current verification
    const token = jwt.sign({ userId: Number(payload.userId) }, JWT_SECRET, { expiresIn: "15m" });
    return res.json({ token, refreshToken: newRefreshToken });
  } catch (e) {
    return res.status(401).json({ error: 'invalid or expired refresh token' });
  }
}

export async function updateUser(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { username, email, password, teamId, avatar } = req.body;
  const repo = AppDataSource.getRepository(User);
  const user = await repo.findOne({ where: { id } });
  if (!user) return res.status(404).json({ error: "not found" });

  if (username) {
    // In signup: reject invalid format before blacklist and conflicts
    if (typeof username === "string" && !isUsernameFormatValid(username)) {
      await recordUsernameRejected({ req, email: (user as any).email || null, username, source: 'update', reason: 'format_invalid' });
      return res.status(400).json({ error: "Usernames can only include letters, numbers, and underscores — no spaces or special symbols." });
    }
    if (typeof username === "string" && isUsernameDisallowed(username)) {
      await recordUsernameRejected({ req, email: (user as any).email || null, username, source: 'update' });
      return res.status(400).json({ error: "This username isn’t allowed" });
    }
    const usernameLower = String(username).toLowerCase();
    const conflict = await repo.findOne({ where: { usernameLower } });
    if (conflict && conflict.id !== user.id) {
      return res.status(409).json({ error: "username already exists" });
    }
    user.username = username;
    user.usernameLower = usernameLower;
  }

  if (email) {
    const conflict = await repo.createQueryBuilder('user').where('LOWER(user.email) = :email', { email: String(email).toLowerCase() }).getOne();
    if (conflict && conflict.id !== user.id) {
      return res.status(409).json({ error: "email already exists" });
    }
    user.email = email;
  }

  if (typeof teamId !== "undefined") user.teamId = teamId;
  if (typeof avatar !== "undefined") user.avatar = avatar;
  if (password) user.hashedPassword = await bcrypt.hash(password, 10);

  await repo.save(user);
  res.json(sanitize(user));
}
// Provide backward compatibility for routes importing updateProfile
export const updateProfile = updateUser;

export async function startOAuth(req: Request, res: Response) {
  const provider = String(req.params.provider || '');
  const origin = String((req.query.origin as string) || 'http://localhost:5173');

  if (provider === 'github') {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) return res.status(500).send('GitHub OAuth not configured');
    const redirectUri = `${req.protocol}://${req.get('host')}/api/users/oauth/github/callback`;
    const state = Buffer.from(JSON.stringify({ origin })).toString('base64');
    const authorizeUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('read:user user:email repo')}&state=${encodeURIComponent(state)}`;
    return res.redirect(authorizeUrl);
  }

  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(500).send('Google OAuth not configured');
    const redirectUri = `${req.protocol}://${req.get('host')}/api/users/oauth/google/callback`;
    const state = Buffer.from(JSON.stringify({ origin })).toString('base64');
    const authorizeUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent('openid email profile')}&state=${encodeURIComponent(state)}`;
    return res.redirect(authorizeUrl);
  }

  if (provider === 'slack') {
    const clientId = process.env.SLACK_CLIENT_ID;
    if (!clientId) return res.status(500).send('Slack OAuth not configured');
    const redirectUri = `${req.protocol}://${req.get('host')}/api/users/oauth/slack/callback`;
    const state = Buffer.from(JSON.stringify({ origin })).toString('base64');
    const authorizeUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('identity.basic identity.email')}&state=${encodeURIComponent(state)}`;
    return res.redirect(authorizeUrl);
  }

  return res.status(400).send('unsupported provider');
}

export async function oauthCallback(req: Request, res: Response) {
  try {
    const provider = String(req.params.provider || '');
    const origin = (() => { try { const b = Buffer.from(String(req.query.state || ''), 'base64').toString('utf8'); return JSON.parse(b || '{}')?.origin || 'http://localhost:5173'; } catch { return 'http://localhost:5173'; } })();
    const code = String(req.query.code || '');

    if (provider === 'github') {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;
      if (!clientId || !clientSecret) return res.status(500).send('GitHub OAuth not configured');
      const redirectUri = `${req.protocol}://${req.get('host')}/api/users/oauth/github/callback`;

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri })
      });
      const tokenJson = await tokenRes.json() as any;
      const accessToken = tokenJson?.access_token;
      if (!accessToken) return res.status(400).send('oauth failed');

      const userRes = await fetch('https://api.github.com/user', { headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'Planara' } });
      const ghUser = await userRes.json() as any;
      const emailsRes = await fetch('https://api.github.com/user/emails', { headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'Planara' } });
      const emails = await emailsRes.json() as any[];
      const primaryEmail = (Array.isArray(emails) && emails.find((e: any) => e.primary && e.verified)?.email)
        || (Array.isArray(emails) && emails[0]?.email)
        || `${ghUser.id}@users.noreply.github.com`;

      const repo = AppDataSource.getRepository(User);
      const loginLower = String(ghUser?.login || '').toLowerCase();
      let user = await repo
        .createQueryBuilder('user')
        .where('LOWER(user.email) = :email', { email: String(primaryEmail).toLowerCase() })
        .orWhere('user.usernameLower = :unameLower', { unameLower: loginLower })
        .getOne();
      let created = false;
      if (!user) {
        let base = sanitizeUsernameToAllowed(ghUser?.name || ghUser?.login || `github_${ghUser?.id}`);
        let username = base;
        let suffix = 0;
        while (
          !isUsernameFormatValid(String(username)) ||
          isUsernameDisallowed(String(username)) ||
          (await repo.findOne({ where: { usernameLower: String(username).toLowerCase() } }))
        ) {
          suffix += 1;
          const suffixPart = `_${suffix}`;
          const maxBase = 20 - suffixPart.length;
          username = `${base.slice(0, Math.max(1, maxBase))}${suffixPart}`;
        }
        const hashedPassword = await bcrypt.hash(`oauth:github:${ghUser?.id}:${Date.now()}`, 10);
        user = repo.create({ username, usernameLower: String(username).toLowerCase(), email: primaryEmail, hashedPassword });
        await repo.save(user);
        created = true;
      }

      // Gate by email verification
      if (!(user as any).isVerified) {
        const codeRepo = AppDataSource.getRepository(EmailVerificationCode);
        // Invalidate existing codes
        await codeRepo.update({ userId: (user as any).id, isUsed: false }, { isUsed: true });
        const vcode = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);
        const rec = codeRepo.create({ userId: (user as any).id, code: vcode, expiresAt });
        await codeRepo.save(rec);
        await EmailService.sendVerificationCode({ email: (user as any).email, username: (user as any).username, code: vcode });
        const payload = { verificationRequired: true, email: (user as any).email, user: sanitize(user as any), created, provider: 'github' };
        const html = `<!doctype html><html><body><script>const data=${JSON.stringify(payload)};const origin=${JSON.stringify(origin)};try{window.opener&&window.opener.postMessage({type:'oauth',verificationRequired:true,email:data.email,user:data.user,created:data.created,provider:data.provider},origin);}catch(e){}window.close();</script></body></html>`;
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
      }

      const token = jwt.sign({ userId: (user as any).id }, JWT_SECRET, { expiresIn: '7d' });
      const payload = { token, user: sanitize(user as any), created, provider: 'github', accessToken };
      const html = `<!doctype html><html><body><script>const data=${JSON.stringify(payload)};const origin=${JSON.stringify(origin)};try{window.opener&&window.opener.postMessage({type:'oauth',token:data.token,user:data.user,created:data.created,provider:data.provider,accessToken:data.accessToken},origin);}catch(e){}window.close();</script></body></html>`;
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }

    if (provider === 'google') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) return res.status(500).send('Google OAuth not configured');
      const redirectUri = `${req.protocol}://${req.get('host')}/api/users/oauth/google/callback`;

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri, grant_type: 'authorization_code' }).toString(),
      });
      const tokenJson = await tokenRes.json() as any;
      const accessToken = tokenJson.access_token as string | undefined;
      if (!accessToken) return res.status(400).send('oauth failed');

      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
      const gUser = await userRes.json() as any;
      const primaryEmail = gUser?.email || `${gUser?.sub}@users.noreply.google.com`;

      const repo = AppDataSource.getRepository(User);
      const nameLower = String(gUser?.name || '').toLowerCase();
      let user = await repo
        .createQueryBuilder('user')
        .where('LOWER(user.email) = :email', { email: String(primaryEmail).toLowerCase() })
        .orWhere('user.usernameLower = :unameLower', { unameLower: nameLower })
        .getOne();
      let created = false;
      if (!user) {
        let base = sanitizeUsernameToAllowed(gUser?.name || (primaryEmail?.split('@')[0]) || `google_${gUser?.sub}`);
        let username = base;
        let suffix = 0;
        while (
          !isUsernameFormatValid(String(username)) ||
          isUsernameDisallowed(String(username)) ||
          (await repo.findOne({ where: { usernameLower: String(username).toLowerCase() } }))
        ) {
          suffix += 1;
          const suffixPart = `_${suffix}`;
          const maxBase = 20 - suffixPart.length;
          username = `${base.slice(0, Math.max(1, maxBase))}${suffixPart}`;
        }
        const hashedPassword = await bcrypt.hash(`oauth:google:${gUser?.sub}:${Date.now()}`, 10);
        user = repo.create({ username, usernameLower: String(username).toLowerCase(), email: primaryEmail, hashedPassword });
        await repo.save(user);
        created = true;
      }

      // Gate by email verification
      if (!(user as any).isVerified) {
        const codeRepo = AppDataSource.getRepository(EmailVerificationCode);
        await codeRepo.update({ userId: (user as any).id, isUsed: false }, { isUsed: true });
        const vcode = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);
        const rec = codeRepo.create({ userId: (user as any).id, code: vcode, expiresAt });
        await codeRepo.save(rec);
        await EmailService.sendVerificationCode({ email: (user as any).email, username: (user as any).username, code: vcode });
        const payload = { verificationRequired: true, email: (user as any).email, user: sanitize(user as any), created, provider: 'google' };
        const html = `<!doctype html><html><body><script>const data=${JSON.stringify(payload)};const origin=${JSON.stringify(origin)};try{window.opener&&window.opener.postMessage({type:'oauth',verificationRequired:true,email:data.email,user:data.user,created:data.created,provider:data.provider},origin);}catch(e){}window.close();</script></body></html>`;
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
      }

      const token = jwt.sign({ userId: (user as any).id }, JWT_SECRET, { expiresIn: '7d' });
      const payload = { token, user: sanitize(user as any), created };
      const html = `<!doctype html><html><body><script>const data=${JSON.stringify(payload)};const origin=${JSON.stringify(origin)};try{window.opener&&window.opener.postMessage({type:'oauth',token:data.token,user:data.user,created:data.created},origin);}catch(e){}window.close();</script></body></html>`;
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }

    if (provider === 'slack') {
      const clientId = process.env.SLACK_CLIENT_ID;
      const clientSecret = process.env.SLACK_CLIENT_SECRET;
      if (!clientId || !clientSecret) return res.status(500).send('Slack OAuth not configured');
      const redirectUri = `${req.protocol}://${req.get('host')}/api/users/oauth/slack/callback`;

      const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }).toString(),
      });
      const tokenJson = await tokenRes.json() as any;
      const accessToken = tokenJson?.authed_user?.access_token || tokenJson?.access_token;
      if (!accessToken) return res.status(400).send('oauth failed');

      const userRes = await fetch('https://slack.com/api/users.identity', { headers: { Authorization: `Bearer ${accessToken}` } });
      const sUserJson = await userRes.json() as any;
      if (!sUserJson?.ok) return res.status(400).send('oauth failed');
      const sUser = sUserJson.user || {};
      const primaryEmail = sUser?.email || `${sUser?.id}@users.noreply.slack.com`;

      const repo = AppDataSource.getRepository(User);
      const nameLower = String(sUser?.name || '').toLowerCase();
      let user = await repo
        .createQueryBuilder('user')
        .where('LOWER(user.email) = :email', { email: String(primaryEmail).toLowerCase() })
        .orWhere('user.usernameLower = :unameLower', { unameLower: nameLower })
        .getOne();
      let created = false;
      if (!user) {
        let base = sanitizeUsernameToAllowed(sUser?.name || (primaryEmail?.split('@')[0]) || `slack_${sUser?.id}`);
        let username = base;
        let suffix = 0;
        while (
          !isUsernameFormatValid(String(username)) ||
          isUsernameDisallowed(String(username)) ||
          (await repo.findOne({ where: { usernameLower: String(username).toLowerCase() } }))
        ) {
          suffix += 1;
          const suffixPart = `_${suffix}`;
          const maxBase = 20 - suffixPart.length;
          username = `${base.slice(0, Math.max(1, maxBase))}${suffixPart}`;
        }
        const hashedPassword = await bcrypt.hash(`oauth:slack:${sUser?.id}:${Date.now()}`, 10);
        user = repo.create({ username, usernameLower: String(username).toLowerCase(), email: primaryEmail, hashedPassword });
        await repo.save(user);
        created = true;
      }

      // Gate by email verification
      if (!(user as any).isVerified) {
        const codeRepo = AppDataSource.getRepository(EmailVerificationCode);
        await codeRepo.update({ userId: (user as any).id, isUsed: false }, { isUsed: true });
        const vcode = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);
        const rec = codeRepo.create({ userId: (user as any).id, code: vcode, expiresAt });
        await codeRepo.save(rec);
        await EmailService.sendVerificationCode({ email: (user as any).email, username: (user as any).username, code: vcode });
        const payload = { verificationRequired: true, email: (user as any).email, user: sanitize(user as any), created, provider: 'slack' };
        const html = `<!doctype html><html><body><script>const data=${JSON.stringify(payload)};const origin=${JSON.stringify(origin)};try{window.opener&&window.opener.postMessage({type:'oauth',verificationRequired:true,email:data.email,user:data.user,created:data.created,provider:data.provider},origin);}catch(e){}window.close();</script></body></html>`;
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
      }

      const token = jwt.sign({ userId: (user as any).id }, JWT_SECRET, { expiresIn: '7d' });
      const payload = { token, user: sanitize(user as any), created };
      const html = `<!doctype html><html><body><script>const data=${JSON.stringify(payload)};const origin=${JSON.stringify(origin)};try{window.opener&&window.opener.postMessage({type:'oauth',token:data.token,user:data.user,created:data.created},origin);}catch(e){}window.close();</script></body></html>`;
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }

    return res.status(400).send('unsupported provider');
  } catch (e) {
    return res.status(400).send('oauth error');
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
    await userRepo.update({ id: (user as any).id }, { username: newUsername, usernameLower: unameLower, usernameChangeCount: ((user as any).usernameChangeCount || 0) + 1 } as any);
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