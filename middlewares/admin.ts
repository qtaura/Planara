import { Request, Response, NextFunction } from 'express';

export function adminOnly(req: Request, res: Response, next: NextFunction) {
  const header = req.header('x-admin-token') || '';
  const query = (req.query?.adminToken as string) || '';
  const token = header || query;
  const expected = process.env.ADMIN_UNLOCK_TOKEN || '';
  if (!expected || token !== expected) {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }
  next();
}