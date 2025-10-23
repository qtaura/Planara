import { Request, Response } from "express";
import { AppDataSource } from "../db/data-source.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";

export async function getNotifications(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  if (!userId) return res.status(401).json({ error: "unauthorized" });

  const repo = AppDataSource.getRepository(Notification);
  const notifications = await repo.find({
    where: { user: { id: userId } },
    relations: { project: true, task: true },
    order: { createdAt: "DESC" }
  });

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

  const { title, message, type, projectId, taskId, actionUrl } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: "title and message are required" });
  }

  const repo = AppDataSource.getRepository(Notification);
  const userRepo = AppDataSource.getRepository(User);
  
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: "user not found" });

  const notification = repo.create({
    title,
    message,
    type: type || "general",
    user,
    actionUrl
  });

  // Add project and task relations if provided
  if (projectId) {
    notification.project = { id: projectId } as any;
  }
  if (taskId) {
    notification.task = { id: taskId } as any;
  }

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
  await repo.save(notification);
  res.json(notification);
}

export async function markAllAsRead(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  if (!userId) return res.status(401).json({ error: "unauthorized" });

  const repo = AppDataSource.getRepository(Notification);
  await repo.update(
    { user: { id: userId }, read: false },
    { read: true }
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