import { Request, Response } from "express";
import { AppDataSource } from "../db/data-source.js";
import { NotificationPreference } from "../models/NotificationPreference.js";
import { User } from "../models/User.js";

export async function listPreferences(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  if (!userId) return res.status(401).json({ error: "unauthorized" });
  const repo = AppDataSource.getRepository(NotificationPreference);
  const items = await repo.find({ where: { user: { id: userId } } });
  res.json(items);
}

export async function upsertPreference(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  if (!userId) return res.status(401).json({ error: "unauthorized" });
  const { type, channel, enabled, frequency } = req.body || {};
  if (!type || !channel) {
    return res.status(400).json({ error: "type and channel are required" });
  }
  const userRepo = AppDataSource.getRepository(User);
  const prefRepo = AppDataSource.getRepository(NotificationPreference);
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "user not found" });

  let existing = await prefRepo.findOne({ where: { user: { id: userId }, type, channel } as any });
  if (existing) {
    existing.enabled = enabled === undefined ? existing.enabled : !!enabled;
    if (frequency) existing.frequency = frequency;
    await prefRepo.save(existing);
    res.json(existing);
    return;
  }
  const pref = prefRepo.create({ user, type, channel, enabled: enabled ?? true, frequency: frequency || 'instant' } as any);
  await prefRepo.save(pref);
  res.status(201).json(pref);
}

export async function updatePreference(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  if (!userId) return res.status(401).json({ error: "unauthorized" });
  const id = Number(req.params.id);
  const { enabled, frequency } = req.body || {};
  const prefRepo = AppDataSource.getRepository(NotificationPreference);
  const pref = await prefRepo.findOne({ where: { id, user: { id: userId } } as any });
  if (!pref) return res.status(404).json({ error: "preference not found" });
  if (enabled !== undefined) pref.enabled = !!enabled;
  if (frequency) pref.frequency = frequency;
  await prefRepo.save(pref);
  res.json(pref);
}

export async function deletePreference(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  if (!userId) return res.status(401).json({ error: "unauthorized" });
  const id = Number(req.params.id);
  const prefRepo = AppDataSource.getRepository(NotificationPreference);
  const pref = await prefRepo.findOne({ where: { id, user: { id: userId } } as any });
  if (!pref) return res.status(404).json({ error: "preference not found" });
  await prefRepo.remove(pref);
  res.json({ success: true });
}