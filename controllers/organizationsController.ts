import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source.js';
import { Organization } from '../models/Organization.js';
import { Membership } from '../models/Membership.js';
import { User } from '../models/User.js';

const GRACE_DAYS = Number(process.env.DELETE_GRACE_DAYS || 7);

function slugify(input: string) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function createOrganization(req: Request, res: Response) {
  try {
    const userId = (req as any).userId as number | undefined;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'name is required' });
    const slug = slugify(name);
    const nameLower = name.toLowerCase();

    const orgRepo = AppDataSource.getRepository(Organization);
    const conflict = await orgRepo.findOne({ where: [{ slug }, { nameLower }] });
    if (conflict) return res.status(409).json({ error: 'organization already exists' });

    const org = orgRepo.create({ name, slug, nameLower, ownerUserId: userId });
    await orgRepo.save(org);

    // Create owner membership at org level across a default owner team as needed later
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (user) {
      // Org-level membership represented via team-scoped roles; for now skip team link here
      // Future: create a default team for organization.
    }

    return res.status(201).json(org);
  } catch (e) {
    return res.status(500).json({ error: 'failed to create organization' });
  }
}

export async function listMyOrganizations(req: Request, res: Response) {
  try {
    const userId = (req as any).userId as number | undefined;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const orgRepo = AppDataSource.getRepository(Organization);
    const memRepo = AppDataSource.getRepository(Membership);

    // Owned orgs (exclude soft-deleted)
    const owned = await orgRepo
      .createQueryBuilder('o')
      .where('o.ownerUserId = :userId', { userId })
      .andWhere('o.deletedAt IS NULL')
      .getMany();

    // Orgs via memberships (exclude soft-deleted)
    const memberships = await memRepo.find({
      relations: { org: true, team: true, user: true },
      where: { user: { id: userId } as any } as any,
    });
    const viaMembership = memberships.map((m) => m.org).filter((o) => !(o as any)?.deletedAt);

    // Deduplicate
    const map = new Map<number, Organization>();
    for (const o of [...owned, ...viaMembership]) map.set(o.id, o);
    return res.json([...map.values()]);
  } catch (e) {
    return res.status(500).json({ error: 'failed to list organizations' });
  }
}

export async function updateOrganization(req: Request, res: Response) {
  try {
    const userId = (req as any).userId as number | undefined;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const orgId = Number(req.params.id);
    const name = String(req.body?.name || '').trim();
    if (!orgId || !name) return res.status(400).json({ error: 'invalid input' });

    const orgRepo = AppDataSource.getRepository(Organization);
    const org = await orgRepo.findOne({ where: { id: orgId } });
    if (!org) return res.status(404).json({ error: 'not found' });
    if (org.ownerUserId !== userId) return res.status(403).json({ error: 'owner required' });
    if (org.deletedAt)
      return res.status(400).json({ error: 'cannot update a deleted organization' });

    const slug = slugify(name);
    const nameLower = name.toLowerCase();
    const conflict = await orgRepo
      .createQueryBuilder('o')
      .where('(o.slug = :slug OR o.nameLower = :nameLower) AND o.id != :id', {
        slug,
        nameLower,
        id: orgId,
      })
      .getOne();
    if (conflict) return res.status(409).json({ error: 'organization already exists' });

    org.name = name;
    org.slug = slug;
    org.nameLower = nameLower;
    await orgRepo.save(org);
    return res.json(org);
  } catch (e) {
    return res.status(500).json({ error: 'failed to update organization' });
  }
}

export async function deleteOrganization(req: Request, res: Response) {
  try {
    const userId = (req as any).userId as number | undefined;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const orgId = Number(req.params.id);
    if (!orgId) return res.status(400).json({ error: 'invalid input' });

    const orgRepo = AppDataSource.getRepository(Organization);
    const org = await orgRepo.findOne({ where: { id: orgId } });
    if (!org) return res.status(404).json({ error: 'not found' });
    if (org.ownerUserId !== userId) return res.status(403).json({ error: 'owner required' });
    if (org.deletedAt) return res.status(400).json({ error: 'organization already deleted' });

    const now = new Date();
    org.deletedAt = now;
    const graceUntil = new Date(now.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000);
    org.deleteGraceUntil = graceUntil;
    await orgRepo.save(org);

    return res.json({ success: true, graceUntil: graceUntil.toISOString() });
  } catch (e) {
    return res.status(500).json({ error: 'failed to delete organization' });
  }
}

export async function recoverOrganization(req: Request, res: Response) {
  try {
    const userId = (req as any).userId as number | undefined;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const orgId = Number(req.params.id);
    if (!orgId) return res.status(400).json({ error: 'invalid input' });

    const orgRepo = AppDataSource.getRepository(Organization);
    const org = await orgRepo.findOne({ where: { id: orgId } });
    if (!org) return res.status(404).json({ error: 'not found' });
    if (org.ownerUserId !== userId) return res.status(403).json({ error: 'owner required' });
    if (!org.deletedAt) return res.status(400).json({ error: 'organization is not deleted' });

    const now = new Date();
    const graceUntil = org.deleteGraceUntil ? new Date(org.deleteGraceUntil) : null;
    if (graceUntil && now > graceUntil) {
      return res.status(410).json({ error: 'grace period expired' });
    }

    org.deletedAt = null as any;
    org.deleteGraceUntil = null as any;
    await orgRepo.save(org);

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'failed to recover organization' });
  }
}

export async function transferOrgOwnership(req: Request, res: Response) {
  try {
    const userId = (req as any).userId as number | undefined;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const orgId = Number(req.params.id);
    const newOwnerUserId = Number(req.body?.newOwnerUserId || 0);
    if (!orgId || !newOwnerUserId) return res.status(400).json({ error: 'invalid input' });

    const orgRepo = AppDataSource.getRepository(Organization);
    const org = await orgRepo.findOne({ where: { id: orgId } });
    if (!org) return res.status(404).json({ error: 'not found' });
    if (org.ownerUserId !== userId) return res.status(403).json({ error: 'owner required' });

    org.ownerUserId = newOwnerUserId;
    await orgRepo.save(org);
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'failed to transfer ownership' });
  }
}
