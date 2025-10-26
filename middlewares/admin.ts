import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../db/data-source.js';
import { User } from '../models/User.js';

/**
 * Admin-only guard: requires matching x-admin-token AND the authenticated user
 * must be the planara account (hello@planara.org). This is defense-in-depth.
 */
export async function adminOnly(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.header('x-admin-token') || '';
    const query = (req.query?.adminToken as string) || '';
    const token = header || query;
    const expected = process.env.ADMIN_UNLOCK_TOKEN || '';
    if (!expected || token !== expected) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    // Require authenticated user and ensure email matches planara account
    const userId = (req as any).userId as number | undefined;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const repo = AppDataSource.getRepository(User);
    const user = await repo.findOne({ where: { id: userId as any } });
    const email = String((user as any)?.email || '').toLowerCase();
    if (email !== 'hello@planara.org') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    return next();
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Admin check failed' });
  }
}
