import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../db/data-source.js";
import { User } from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

function sanitize(user: User) {
  const { hashedPassword, ...rest } = user as any;
  return rest;
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
  const repo = AppDataSource.getRepository(User);
  const exists = await repo.findOne({ where: [{ username }, { email }] });
  if (exists) {
    return res.status(409).json({ error: "username or email already exists" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = repo.create({ username, email, hashedPassword });
  await repo.save(user);
  res.status(201).json(sanitize(user));
}

export async function login(req: Request, res: Response) {
  const { usernameOrEmail, password } = req.body;
  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: "usernameOrEmail and password are required" });
  }
  const repo = AppDataSource.getRepository(User);
  const user = await repo.findOne({ where: [{ username: usernameOrEmail }, { email: usernameOrEmail }] });
  if (!user) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  const ok = await bcrypt.compare(password, user.hashedPassword);
  if (!ok) {
    return res.status(401).json({ error: "invalid credentials" });
  }
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: sanitize(user) });
}

export async function updateProfile(req: Request, res: Response) {
  const userIdFromToken = (req as any).userId as number | undefined;
  const id = Number(req.params.id ?? userIdFromToken);
  if (!id) return res.status(401).json({ error: "unauthorized" });

  const repo = AppDataSource.getRepository(User);
  const user = await repo.findOne({ where: { id } });
  if (!user) return res.status(404).json({ error: "user not found" });

  const { username, email, password, teamId, avatar } = req.body as Partial<{ username: string; email: string; password: string; teamId: number; avatar: string }>;

  if (username && username !== user.username) {
    const conflict = await repo.findOne({ where: { username } });
    if (conflict && conflict.id !== user.id) {
      return res.status(409).json({ error: "username already exists" });
    }
    user.username = username;
  }

  if (email && email !== user.email) {
    const conflict = await repo.findOne({ where: { email } });
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

export async function startOAuth(req: Request, res: Response) {
  const provider = String(req.params.provider || '');
  const origin = String((req.query.origin as string) || 'http://localhost:5173');

  if (provider === 'github') {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) return res.status(500).send('GitHub OAuth not configured');
    const redirectUri = `${req.protocol}://${req.get('host')}/api/users/oauth/github/callback`;
    const state = Buffer.from(JSON.stringify({ origin })).toString('base64');
    const authorizeUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('read:user user:email')}&state=${encodeURIComponent(state)}`;
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
    const authorizeUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&user_scope=${encodeURIComponent('identity.basic,identity.email')}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
    return res.redirect(authorizeUrl);
  }

  return res.status(400).json({ error: 'unsupported provider' });
}

export async function oauthCallback(req: Request, res: Response) {
  const provider = String(req.params.provider || '');
  const stateParam = String((req.query.state as string) || '');
  const code = String((req.query.code as string) || '');

  try {
    const state = stateParam ? JSON.parse(Buffer.from(stateParam, 'base64').toString()) : {};
    const origin = state.origin || 'http://localhost:5173';

    if (provider === 'github') {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;
      if (!clientId || !clientSecret) return res.status(500).send('GitHub OAuth not configured');
      const redirectUri = `${req.protocol}://${req.get('host')}/api/users/oauth/github/callback`;

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
      });
      const tokenJson = await tokenRes.json() as any;
      const accessToken = tokenJson.access_token as string | undefined;
      if (!accessToken) return res.status(400).send('oauth failed');

      const userRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'Planara' },
      });
      const ghUser: any = await userRes.json();

      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'Planara' },
      });
      const emails = await emailsRes.json() as any[];
      const primaryEmail = (Array.isArray(emails) && emails.find((e: any) => e.primary && e.verified)?.email)
        || (Array.isArray(emails) && emails[0]?.email)
        || `${ghUser.id}@users.noreply.github.com`;

      const repo = AppDataSource.getRepository(User);
      let user = await repo.findOne({ where: [{ email: primaryEmail }, { username: ghUser?.login }] });
      let created = false;
      if (!user) {
        let username = ghUser?.login || `github_${ghUser?.id}`;
        let suffix = 0;
        while (await repo.findOne({ where: { username } })) { suffix += 1; username = `${ghUser?.login}${suffix}`; }
        const hashedPassword = await bcrypt.hash(`oauth:github:${ghUser?.id}:${Date.now()}`, 10);
        user = repo.create({ username, email: primaryEmail, hashedPassword });
        await repo.save(user);
        created = true;
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      const payload = { token, user: sanitize(user), created };
      const html = `<!doctype html><html><body><script>const data=${JSON.stringify(payload)};const origin=${JSON.stringify(origin)};try{window.opener&&window.opener.postMessage({type:'oauth',token:data.token,user:data.user,created:data.created},origin);}catch(e){}window.close();</script></body></html>`;
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
      let user = await repo.findOne({ where: [{ email: primaryEmail }, { username: gUser?.name }] });
      let created = false;
      if (!user) {
        let base = gUser?.name || (primaryEmail?.split('@')[0]) || `google_${gUser?.sub}`;
        let username = base;
        let suffix = 0;
        while (await repo.findOne({ where: { username } })) { suffix += 1; username = `${base}${suffix}`; }
        const hashedPassword = await bcrypt.hash(`oauth:google:${gUser?.sub}:${Date.now()}`, 10);
        user = repo.create({ username, email: primaryEmail, hashedPassword });
        await repo.save(user);
        created = true;
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      const payload = { token, user: sanitize(user), created };
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
      let user = await repo.findOne({ where: [{ email: primaryEmail }, { username: sUser?.name }] });
      let created = false;
      if (!user) {
        let base = sUser?.name || (primaryEmail?.split('@')[0]) || `slack_${sUser?.id}`;
        let username = base;
        let suffix = 0;
        while (await repo.findOne({ where: { username } })) { suffix += 1; username = `${base}${suffix}`; }
        const hashedPassword = await bcrypt.hash(`oauth:slack:${sUser?.id}:${Date.now()}`, 10);
        user = repo.create({ username, email: primaryEmail, hashedPassword });
        await repo.save(user);
        created = true;
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
      const payload = { token, user: sanitize(user), created };
      const html = `<!doctype html><html><body><script>const data=${JSON.stringify(payload)};const origin=${JSON.stringify(origin)};try{window.opener&&window.opener.postMessage({type:'oauth',token:data.token,user:data.user,created:data.created},origin);}catch(e){}window.close();</script></body></html>`;
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }

    return res.status(400).send('unsupported provider');
  } catch (e) {
    return res.status(400).send('oauth error');
  }
}