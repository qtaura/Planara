import { Request, Response } from "express";
import { AppDataSource } from "../db/data-source.js";
import { Organization } from "../models/Organization.js";
import { Team } from "../models/Team.js";
import { Membership } from "../models/Membership.js";
import { User } from "../models/User.js";

function slugify(input: string) {
  return String(input).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function createTeam(req: Request, res: Response) {
  try {
    const userId = (req as any).userId as number | undefined;
    if (!userId) return res.status(401).json({ error: "unauthorized" });
    const orgId = Number(req.params.orgId || req.body?.orgId);
    const name = String(req.body?.name || "").trim();
    if (!orgId || !name) return res.status(400).json({ error: "invalid input" });

    const orgRepo = AppDataSource.getRepository(Organization);
    const teamRepo = AppDataSource.getRepository(Team);

    const org = await orgRepo.findOne({ where: { id: orgId } });
    if (!org) return res.status(404).json({ error: "organization not found" });
    // Only org owner can create teams for now (later: org admins)
    if (org.ownerUserId !== userId) return res.status(403).json({ error: "owner required" });

    const slug = slugify(name);
    const nameLower = name.toLowerCase();

    const existing = await teamRepo
      .createQueryBuilder("t")
      .leftJoin("t.org", "o")
      .where("o.id = :orgId AND (t.slug = :slug OR t.nameLower = :nameLower)", { orgId, slug, nameLower })
      .getOne();
    if (existing) return res.status(409).json({ error: "team name already exists in organization" });

    const team = teamRepo.create({ name, slug, nameLower, org });
    await teamRepo.save(team);

    // Make creator owner of the team
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (user) {
      const memRepo = AppDataSource.getRepository(Membership);
      const membership = memRepo.create({ user, org, team, role: "owner" });
      await memRepo.save(membership);
    }

    return res.status(201).json(team);
  } catch (e) {
    return res.status(500).json({ error: "failed to create team" });
  }
}

export async function listTeams(req: Request, res: Response) {
  try {
    const orgId = Number(req.params.orgId || req.query?.orgId);
    if (!orgId) return res.status(400).json({ error: "orgId required" });
    const teamRepo = AppDataSource.getRepository(Team);
    const teams = await teamRepo.createQueryBuilder("t").leftJoin("t.org", "o").where("o.id = :orgId", { orgId }).getMany();
    return res.json(teams);
  } catch (e) {
    return res.status(500).json({ error: "failed to list teams" });
  }
}

export async function listMembers(req: Request, res: Response) {
  try {
    const teamId = Number(req.params.teamId || req.query?.teamId);
    if (!teamId) return res.status(400).json({ error: "teamId required" });
    const memRepo = AppDataSource.getRepository(Membership);
    const memberships = await memRepo.find({ relations: { user: true, team: true, org: true } });
    const filtered = memberships.filter(m => (m.team as any)?.id === teamId);
    return res.json(filtered.map(m => ({ id: m.id, role: m.role, user: m.user })));
  } catch (e) {
    return res.status(500).json({ error: "failed to list members" });
  }
}

export async function changeRole(req: Request, res: Response) {
  try {
    const userId = (req as any).userId as number | undefined;
    if (!userId) return res.status(401).json({ error: "unauthorized" });
    const teamId = Number(req.params.teamId);
    const targetUserId = Number(req.body?.userId || 0);
    const role = String(req.body?.role || "");
    if (!teamId || !targetUserId || !role) return res.status(400).json({ error: "invalid input" });

    const memRepo = AppDataSource.getRepository(Membership);
    const memberships = await memRepo.find({ relations: { user: true, team: true, org: true } });
    const myMembership = memberships.find(m => (m.team as any)?.id === teamId && (m.user as any)?.id === userId);
    if (!myMembership || (myMembership.role !== "owner" && myMembership.role !== "admin")) {
      return res.status(403).json({ error: "insufficient role" });
    }

    const target = memberships.find(m => (m.team as any)?.id === teamId && (m.user as any)?.id === targetUserId);
    if (!target) return res.status(404).json({ error: "membership not found" });

    // Prevent demoting the last owner
    if (target.role === "owner" && role !== "owner") {
      const owners = memberships.filter(m => (m.team as any)?.id === teamId && m.role === "owner");
      if (owners.length <= 1) return res.status(400).json({ error: "cannot demote the last owner" });
    }

    target.role = role;
    await memRepo.save(target);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: "failed to change role" });
  }
}

export async function transferTeamOwnership(req: Request, res: Response) {
  try {
    const userId = (req as any).userId as number | undefined;
    if (!userId) return res.status(401).json({ error: "unauthorized" });
    const teamId = Number(req.params.teamId);
    const newOwnerUserId = Number(req.body?.newOwnerUserId || 0);
    if (!teamId || !newOwnerUserId) return res.status(400).json({ error: "invalid input" });

    const memRepo = AppDataSource.getRepository(Membership);
    const memberships = await memRepo.find({ relations: { user: true, team: true, org: true } });
    const myMembership = memberships.find(m => (m.team as any)?.id === teamId && (m.user as any)?.id === userId);
    if (!myMembership || myMembership.role !== "owner") return res.status(403).json({ error: "owner required" });

    const newOwnerMem = memberships.find(m => (m.team as any)?.id === teamId && (m.user as any)?.id === newOwnerUserId);
    if (!newOwnerMem) return res.status(404).json({ error: "new owner is not a member" });

    // Promote new owner and ensure at least one owner exists
    newOwnerMem.role = "owner";
    await memRepo.save(newOwnerMem);

    // Optionally demote previous owner to admin
    myMembership.role = "admin";
    await memRepo.save(myMembership);

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: "failed to transfer ownership" });
  }
}

export async function leaveTeam(req: Request, res: Response) {
  try {
    const userId = (req as any).userId as number | undefined;
    if (!userId) return res.status(401).json({ error: "unauthorized" });
    const teamId = Number(req.params.teamId);
    if (!teamId) return res.status(400).json({ error: "invalid input" });

    const memRepo = AppDataSource.getRepository(Membership);
    const memberships = await memRepo.find({ relations: { user: true, team: true, org: true } });
    const myMembership = memberships.find(m => (m.team as any)?.id === teamId && (m.user as any)?.id === userId);
    if (!myMembership) return res.status(404).json({ error: "membership not found" });

    // Prevent leaving if last owner
    if (myMembership.role === "owner") {
      const owners = memberships.filter(m => (m.team as any)?.id === teamId && m.role === "owner");
      if (owners.length <= 1) return res.status(400).json({ error: "cannot leave as the last owner" });
    }

    await memRepo.delete({ id: myMembership.id });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: "failed to leave team" });
  }
}