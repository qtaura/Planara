import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source.js';
import { Comment } from '../models/Comment.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { Thread } from '../models/Thread.js';
import { Notification } from '../models/Notification.js';
import { recordCommentEvent } from '../services/securityTelemetry.js';

function extractMentions(content: string): string[] {
  const matches = content.match(/@([a-z0-9_-]+)/gi) || [];
  return matches.map((m) => m.replace(/^@/, '').toLowerCase());
}

async function notifyMentions(usernamesLower: string[], task: Task, author?: User | null) {
  if (!usernamesLower.length) return;
  const userRepo = AppDataSource.getRepository(User);
  const notifRepo = AppDataSource.getRepository(Notification);
  const users = await userRepo.find({ where: usernamesLower.map((u) => ({ usernameLower: u })) });
  for (const u of users) {
    const n = notifRepo.create({
      title: 'Mentioned in a comment',
      message: `${author?.username || 'Someone'} mentioned you in a comment on task #${task.id}`,
      type: 'comment_added',
      user: u,
      task,
    });
    await notifRepo.save(n);
  }
}

export async function getComments(req: Request, res: Response) {
  const taskId = req.query.taskId ? Number(req.query.taskId) : undefined;
  const repo = AppDataSource.getRepository(Comment);
  const where = taskId ? { task: { id: taskId } } : {};
  const comments = await repo.find({
    where,
    relations: { task: true, author: true, parentComment: true, thread: true },
  });
  const payload = comments.map((c) => ({
    id: c.id,
    content: c.content,
    taskId: (c.task as any)?.id,
    authorId: c.author ? (c.author as any).id : undefined,
    parentCommentId: c.parentComment ? (c.parentComment as any).id : null,
    threadId: c.thread ? (c.thread as any).id : null,
    createdAt: c.createdAt,
    reactions: c.reactions || {},
    mentions: c.mentions || [],
  }));
  res.json(payload);
}

export async function createComment(req: Request, res: Response) {
  const { taskId, authorId, content } = req.body;
  if (!taskId || !content)
    return res.status(400).json({ error: 'taskId and content are required' });
  const commentRepo = AppDataSource.getRepository(Comment);
  const taskRepo = AppDataSource.getRepository(Task);
  const userRepo = AppDataSource.getRepository(User);
  const threadRepo = AppDataSource.getRepository(Thread);
  const task = await taskRepo.findOne({ where: { id: Number(taskId) } });
  if (!task) return res.status(404).json({ error: 'task not found' });
  const comment = commentRepo.create({ content, task });
  if (authorId) {
    const author = await userRepo.findOne({ where: { id: Number(authorId) } });
    if (author) comment.author = author;
  }
  // Mentions
  const mentions = extractMentions(content);
  comment.mentions = mentions;
  // Create a thread for root comments and associate
  const thread = threadRepo.create({ task });
  await threadRepo.save(thread);
  comment.thread = thread;
  await commentRepo.save(comment);
  // Backlink rootComment
  thread.rootComment = comment;
  await threadRepo.save(thread);
  try {
    await notifyMentions(mentions, task, comment.author);
  } catch {}
  try {
    const { getIO } = await import('./realtime.js');
    const io = getIO();
    const projectId = (task.project as any)?.id;
    if (io && projectId) {
      io.to(`project:${projectId}`).emit('comment:created', {
        comment: {
          id: comment.id,
          content: comment.content,
          taskId: task.id,
          authorId: comment.author ? (comment.author as any).id : undefined,
          parentCommentId: null,
          threadId: thread.id,
          createdAt: comment.createdAt,
          reactions: comment.reactions || {},
          mentions: comment.mentions || [],
        },
        taskId,
      });
    }
  } catch {}
  try {
    await recordCommentEvent({
      req,
      eventType: 'comment_created',
      userId: comment.author?.id ?? null,
      email: (comment.author as any)?.email ?? null,
      commentId: comment.id,
      taskId: task.id,
      threadId: thread.id,
      parentCommentId: null,
      extra: { mentions },
    });
  } catch {}
  const payload = {
    id: comment.id,
    content: comment.content,
    taskId: task.id,
    authorId: comment.author ? (comment.author as any).id : undefined,
    parentCommentId: null,
    threadId: thread.id,
    createdAt: comment.createdAt,
    reactions: comment.reactions || {},
    mentions: comment.mentions || [],
  };
  res.status(201).json(payload);
}

export async function deleteComment(req: Request, res: Response) {
  const userId = (req as any).userId as number | undefined;
  const id = Number(req.params.id);
  const teamId = Number((req.query as any)?.teamId || (req.body as any)?.teamId || 0) || undefined;
  const repo = AppDataSource.getRepository(Comment);
  const comment = await repo.findOne({
    where: { id },
    relations: { task: { project: { owner: true } }, author: true },
  });
  if (!comment) return res.status(404).json({ error: 'comment not found' });
  // Allow delete per RBAC when team context provided; otherwise enforce author or project owner
  if (!teamId) {
    const isAuthor = userId && comment.author?.id === userId;
    const isProjectOwner = userId && comment.task?.project?.owner?.id === userId;
    if (!isAuthor && !isProjectOwner) return res.status(403).json({ error: 'forbidden' });
  }
  await repo.remove(comment);
  try {
    const { getIO } = await import('./realtime.js');
    const io = getIO();
    const projectId = (comment.task?.project as any)?.id;
    const taskId = comment.task?.id;
    if (io && projectId) {
      io.to(`project:${projectId}`).emit('comment:deleted', { commentId: id, taskId });
    }
  } catch {}
  res.json({ ok: true });
}