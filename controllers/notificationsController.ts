import { Request, Response } from "express";
import { AppDataSource } from "../db/data-source.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";

function parseBoolean(v: any): boolean | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (["true", "1", "yes"].includes(s)) return true;
  if (["false", "0", "no"].includes(s)) return false;
  return undefined;
}

export async function getNotifications(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  if (!userId) return res.status(401).json({ error: "unauthorized" });

  const { type, channel, read, from, to, limit } = req.query as any;
  const qb = AppDataSource.getRepository(Notification)
    .createQueryBuilder('n')
    .leftJoinAndSelect('n.project', 'project')
    .leftJoinAndSelect('n.task', 'task')
    .where('n.userId = :uid', { uid: userId })
    .orderBy('n.createdAt', 'DESC');

  if (type) qb.andWhere('n.type = :type', { type });
  if (channel) qb.andWhere('n.channel = :channel', { channel });
  const readVal = parseBoolean(read);
  if (readVal !== undefined) qb.andWhere('n.read = :read', { read: readVal });
  if (from) qb.andWhere('n.createdAt >= :from', { from: new Date(String(from)) });
  if (to) qb.andWhere('n.createdAt <= :to', { to: new Date(String(to)) });
  const lim = Math.max(1, Math.min(500, Number(limit) || 200));
  qb.limit(lim);

  const notifications = await qb.getMany();
  res.json(notifications);
}

export async function getUnreadCount(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  if (!userId) return res.status(401).json({ error: "unauthorized" });

  const repo = AppDataSource.getRepository(Notification);
  const count = await repo.count({
    where: { user: { id: userId }, read: false }
  });

  res.json({ count });
}

export async function createNotification(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  if (!userId) return res.status(401).json({ error: "unauthorized" });

  const { title, message, type, projectId, taskId, actionUrl, channel } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: "title and message are required" });
  }

  const repo = AppDataSource.getRepository(Notification);
  const userRepo = AppDataSource.getRepository(User);
  
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "user not found" });

  // Simple rate limit for noisy events
  const now = new Date();
  const windowMs = 60 * 1000; // 1 minute
  const windowStart = new Date(now.getTime() - windowMs);
  const recentCount = await repo.createQueryBuilder('n')
    .where('n.userId = :uid', { uid: userId })
    .andWhere('n.type = :type', { type: type || 'general' })
    .andWhere('n.createdAt >= :ws', { ws: windowStart })
    .getCount();
  if (recentCount > 100) { // hard cap
    return res.status(429).json({ error: 'rate_limited', message: 'Too many notifications recently' });
  }

  const notification = repo.create({
    title,
    message,
    type: type || "general",
    user,
    actionUrl,
    channel: channel || 'in_app',
  } as any);

  // Add project and task relations if provided
  if (projectId) notification.project = { id: projectId } as any;
  if (taskId) notification.task = { id: taskId } as any;

  await repo.save(notification);
  res.json(notification);
}

export async function markAsRead(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  if (!userId) return res.status(401).json({ error: "unauthorized" });

  const id = Number(req.params.id);
  const repo = AppDataSource.getRepository(Notification);
  
  const notification = await repo.findOne({
    where: { id, user: { id: userId } }
  });
  
  if (!notification) {
    return res.status(404).json({ error: "notification not found" });
  }

  notification.read = true;
  notification.readAt = new Date();
  await repo.save(notification);
  res.json(notification);
}

export async function markAsUnread(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  if (!userId) return res.status(401).json({ error: "unauthorized" });

  const id = Number(req.params.id);
  const repo = AppDataSource.getRepository(Notification);
  
  const notification = await repo.findOne({
    where: { id, user: { id: userId } }
  });
  
  if (!notification) {
    return res.status(404).json({ error: "notification not found" });
  }

  notification.read = false;
  notification.readAt = null;
  await repo.save(notification);
  res.json(notification);
}

export async function markAllAsRead(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  if (!userId) return res.status(401).json({ error: "unauthorized" });

  const repo = AppDataSource.getRepository(Notification);
  await repo.update(
    { user: { id: userId }, read: false },
    { read: true, readAt: new Date() }
  );

  res.json({ success: true });
}

export async function deleteNotification(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  if (!userId) return res.status(401).json({ error: "unauthorized" });

  const id = Number(req.params.id);
  const repo = AppDataSource.getRepository(Notification);
  
  const notification = await repo.findOne({
    where: { id, user: { id: userId } }
  });
  
  if (!notification) {
    return res.status(404).json({ error: "notification not found" });
  }

  await repo.remove(notification);
  res.json({ success: true });
}