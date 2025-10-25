import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../db/data-source.js";
import { Membership } from "../models/Membership.js";

const ROLE_ORDER: Record<string, number> = { viewer: 0, member: 1, admin: 2, owner: 3 };

export function requireTeamRole(minRole: "viewer" | "member" | "admin" | "owner") {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).userId as number | undefined;
      if (!userId) return res.status(401).json({ error: "unauthorized" });
      const teamId = Number((req.params as any).teamId || (req.query as any)?.teamId || (req.body as any)?.teamId || 0);
      if (!teamId) return res.status(400).json({ error: "teamId required" });

      const memRepo = AppDataSource.getRepository(Membership);
      const memberships = await memRepo.find({ relations: { user: true, team: true } });
      const m = memberships.find(mm => (mm.team as any)?.id === teamId && (mm.user as any)?.id === userId);
      if (!m) return res.status(403).json({ error: "not a member" });
      const ok = (ROLE_ORDER[m.role] ?? -1) >= ROLE_ORDER[minRole];
      if (!ok) return res.status(403).json({ error: "insufficient role" });
      return next();
    } catch (e) {
      return res.status(500).json({ error: "authorization failed" });
    }
  };
}