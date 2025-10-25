import { Request, Response } from "express";
import { AppDataSource } from "../db/data-source.js";
import { Comment } from "../models/Comment.js";
import { Task } from "../models/Task.js";
import { User } from "../models/User.js";
import { Thread } from "../models/Thread.js";
import { Notification } from "../models/Notification.js";

const ALLOWED_REACTIONS = ["thumbs_up", "heart", "laugh", "hooray", "rocket", "eyes"] as const;
type ReactionType = (typeof ALLOWED_REACTIONS)[number];

function extractMentions(content: string): string[] {
  const matches = content.match(/@([a-z0-9_]+)/gi) || [];
  return matches.map(m => m.replace(/^@/, "").toLowerCase());
}

async function notifyMentions(usernamesLower: string[], task: Task, author?: User | null) {
  if (!usernamesLower.length) return;
  const userRepo = AppDataSource.getRepository(User);
  const notifRepo = AppDataSource.getRepository(Notification);
  const users = await userRepo.find({ where: usernamesLower.map(u => ({ usernameLower: u })) });
  for (const u of users) {
    const n = notifRepo.create({
      title: "Mentioned in a comment",
      message: `${author?.username || "Someone"} mentioned you in a comment on task #${task.id}`,
      type: "comment_added",
      user: u,
      task,
    });
    await notifRepo.save(n);
  }
}

export async function createReply(req: Request, res: Response) {
  const { parentCommentId, authorId, content } = req.body;
  if (!parentCommentId || !content) return res.status(400).json({ error: "parentCommentId and content are required" });
  const commentRepo = AppDataSource.getRepository(Comment);
  const threadRepo = AppDataSource.getRepository(Thread);
  const userRepo = AppDataSource.getRepository(User);
  const parent = await commentRepo.findOne({ where: { id: Number(parentCommentId) }, relations: { task: { project: true }, parentComment: true, thread: true } });
  if (!parent) return res.status(404).json({ error: "parent comment not found" });

  // Enforce max depth of 3
  let depth = 0; let cur: Comment | null | undefined = parent;
  while (cur && depth < 4) { depth++; cur = cur.parentComment || undefined; }
  if (depth >= 3) return res.status(400).json({ error: "max thread depth reached" });

  const reply = commentRepo.create({ content, task: parent.task, parentComment: parent });
  if (authorId) {
    const author = await userRepo.findOne({ where: { id: Number(authorId) } });
    if (author) reply.author = author;
  }
  // Ensure thread exists; create if replying to a root without thread (fallback)
  if (!parent.thread) {
    const t = threadRepo.create({ task: parent.task });
    await threadRepo.save(t);
    parent.thread = t;
    await commentRepo.save(parent);
  }
  reply.thread = parent.thread!;
  // Mentions
  const mentions = extractMentions(content);
  reply.mentions = mentions;
  await commentRepo.save(reply);
  try { await notifyMentions(mentions, parent.task!, reply.author); } catch {}

  try {
    const { getIO } = await import('./realtime.js');
    const io = getIO();
    const projectId = (parent.task?.project as any)?.id;
    const taskId = parent.task?.id;
    if (io && projectId) {
      io.to(`project:${projectId}`).emit('comment:reply_created', { comment: reply, taskId, parentCommentId });
    }
  } catch {}
  res.status(201).json(reply);
}

export async function getThread(req: Request, res: Response) {
  const threadId = Number(req.params.threadId);
  if (!threadId) return res.status(400).json({ error: "threadId required" });
  const commentRepo = AppDataSource.getRepository(Comment);
  const comments = await commentRepo.find({ where: { thread: { id: threadId } }, order: { createdAt: "ASC" }, relations: { author: true, parentComment: true, task: true } });
  res.json(comments);
}

export async function reactToComment(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { type, op } = req.body as { type: ReactionType; op: "add" | "remove" };
  if (!ALLOWED_REACTIONS.includes(type)) return res.status(400).json({ error: "invalid reaction type" });
  const repo = AppDataSource.getRepository(Comment);
  const comment = await repo.findOne({ where: { id }, relations: { task: { project: true } } });
  if (!comment) return res.status(404).json({ error: "comment not found" });
  const reactions = comment.reactions || {};
  const cur = Number(reactions[type] || 0);
  reactions[type] = Math.max(0, cur + (op === "add" ? 1 : -1));
  comment.reactions = reactions;
  await repo.save(comment);
  try {
    const { getIO } = await import('./realtime.js');
    const io = getIO();
    const projectId = (comment.task?.project as any)?.id;
    const taskId = comment.task?.id;
    if (io && projectId) {
      io.to(`project:${projectId}`).emit('comment:reaction', { commentId: id, reactions, taskId });
    }
  } catch {}
  res.json({ ok: true, reactions });
}