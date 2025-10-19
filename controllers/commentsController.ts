import { Request, Response } from "express";
import { AppDataSource } from "../db/data-source.js";
import { Comment } from "../models/Comment.js";
import { Task } from "../models/Task.js";
import { User } from "../models/User.js";

export async function getComments(req: Request, res: Response) {
  const taskId = req.query.taskId ? Number(req.query.taskId) : undefined;
  const repo = AppDataSource.getRepository(Comment);
  const where = taskId ? { task: { id: taskId } } : {};
  const comments = await repo.find({ where, relations: { task: true, author: true } });
  res.json(comments);
}

export async function createComment(req: Request, res: Response) {
  const { taskId, authorId, content } = req.body;
  if (!taskId || !content) return res.status(400).json({ error: "taskId and content are required" });
  const commentRepo = AppDataSource.getRepository(Comment);
  const taskRepo = AppDataSource.getRepository(Task);
  const userRepo = AppDataSource.getRepository(User);
  const task = await taskRepo.findOne({ where: { id: Number(taskId) } });
  if (!task) return res.status(404).json({ error: "task not found" });
  const comment = commentRepo.create({ content, task });
  if (authorId) {
    const author = await userRepo.findOne({ where: { id: Number(authorId) } });
    if (author) comment.author = author;
  }
  await commentRepo.save(comment);
  res.status(201).json(comment);
}

export async function deleteComment(req: Request, res: Response) {
  const id = Number(req.params.id);
  const repo = AppDataSource.getRepository(Comment);
  const comment = await repo.findOne({ where: { id } });
  if (!comment) return res.status(404).json({ error: "comment not found" });
  await repo.remove(comment);
  res.json({ ok: true });
}