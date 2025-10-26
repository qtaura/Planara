import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../db/data-source.js';
import { User } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'missing Authorization header' });
  const [type, token] = auth.split(' ');
  if (type !== 'Bearer' || !token)
    return res.status(401).json({ error: 'invalid Authorization format' });
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    (req as any).userId = payload.userId as number;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid or expired token' });
  }
}

// Enforce verified users for sensitive actions
export async function requireVerified(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId as number | undefined;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { id: Number(userId) } });
    if (!user) return res.status(401).json({ error: 'unauthorized' });
    if (!user.isVerified) return res.status(403).json({ error: 'email verification required' });
    next();
  } catch (e) {
    return res.status(500).json({ error: 'verification check failed' });
  }
}