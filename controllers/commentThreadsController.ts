import { Request, Response } from 'express';
import { AppDataSource } from '../db/data-source.js';
import { Thread } from '../models/Thread.js';
import { Comment } from '../models/Comment.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { recordCommentEvent } from '../services/securityTelemetry.js';
import { Notification } from '../models/Notification.js';

const ALLOWED_REACTIONS = ['thumbs_up', 'heart', 'laugh', 'hooray', 'rocket', 'eyes'] as const;
type ReactionType = (typeof ALLOWED_REACTIONS)[number];

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

export async function createReply(req: Request, res: Response) {
  const { id } = req.params; // parent comment id
  const { content, authorId } = req.body;
  const commentRepo = AppDataSource.getRepository(Comment);
  const threadRepo = AppDataSource.getRepository(Thread);
  const userRepo = AppDataSource.getRepository(User);

  const parent = await commentRepo.findOne({
    where: { id: Number(id) },
    relations: { thread: true, task: true, author: true, parentComment: true },
  });
  if (!parent) return res.status(404).json({ error: 'parent comment not found' });

  // Ensure thread exists; create if replying to a root without thread
  let thread = parent.thread as Thread | null;
  if (!thread) {
    thread = threadRepo.create({ task: parent.task });
    await threadRepo.save(thread);
    parent.thread = thread;
    await commentRepo.save(parent);
  }

  // Enforce max thread depth = 4 (root + 3 replies)
  let depth = 0;
  let cur: Comment | null = parent;
  while (cur) {
    depth++;
    if (!cur.parentComment) break;
    const next = await commentRepo.findOne({
      where: { id: (cur.parentComment as any).id },
      relations: { parentComment: true },
    });
    cur = next || null;
  }
  if (depth >= 4) return res.status(400).json({ error: 'max thread depth reached' });

  const reply = commentRepo.create({ content, task: parent.task, thread, parentComment: parent });
  if (authorId) {
    const author = await userRepo.findOne({ where: { id: Number(authorId) } });
    if (author) reply.author = author;
  }
  await commentRepo.save(reply);

  try {
    const { getIO } = await import('./realtime.js');
    const io = getIO();
    const projectId = (parent.task?.project as any)?.id;
    const taskId = parent.task?.id;
    if (io && projectId) {
      io.to(`project:${projectId}`).emit('comment:replied', {
        comment: {
          id: reply.id,
          content: reply.content,
          taskId,
          authorId: reply.author ? (reply.author as any).id : undefined,
          parentCommentId: parent.id,
          threadId: thread!.id,
          createdAt: reply.createdAt,
          reactions: reply.reactions || {},
          mentions: reply.mentions || [],
        },
        taskId,
        parentCommentId: parent.id,
      });
    }
  } catch {}
  try {
    await recordCommentEvent({
      req,
      eventType: 'comment_replied',
      userId: reply.author?.id ?? null,
      email: (reply.author as any)?.email ?? null,
      commentId: reply.id,
      taskId: parent.task?.id ?? null,
      threadId: thread!.id,
      parentCommentId: parent.id,
    });
  } catch {}

  const payload = {
    id: reply.id,
    content: reply.content,
    taskId: parent.task?.id ?? null,
    authorId: reply.author ? (reply.author as any).id : undefined,
    parentCommentId: parent.id,
    threadId: thread!.id,
    createdAt: reply.createdAt,
    reactions: reply.reactions || {},
    mentions: reply.mentions || [],
  };
  res.status(201).json(payload);
}

export async function getThread(req: Request, res: Response) {
  const { threadId } = req.params;
  const repo = AppDataSource.getRepository(Comment);
  const threadRepo = AppDataSource.getRepository(Thread);
  const thread = await threadRepo.findOne({
    where: { id: Number(threadId) },
    relations: { task: true, rootComment: true },
  });
  if (!thread) return res.status(404).json({ error: 'thread not found' });
  const comments = await repo.find({
    where: { thread: { id: thread.id } },
    relations: { author: true, parentComment: true },
  });
  res.json({ thread, comments });
}

export async function reactToComment(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { type, op } = req.body as { type: ReactionType; op: 'add' | 'remove' };
  if (!ALLOWED_REACTIONS.includes(type))
    return res.status(400).json({ error: 'invalid reaction type' });
  const repo = AppDataSource.getRepository(Comment);
  const userRepo = AppDataSource.getRepository(User);
  const comment = await repo.findOne({
    where: { id },
    relations: { task: { project: true }, thread: true, parentComment: true },
  });
  if (!comment) return res.status(404).json({ error: 'comment not found' });

  const reactions = (comment.reactions || {}) as Record<string, number>;
  const cur = Number(reactions[type] || 0);
  reactions[type] = Math.max(0, cur + (op === 'add' ? 1 : -1));
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
  try {
    const actorId = (req as any).userId as number | undefined;
    const actor = actorId ? await userRepo.findOne({ where: { id: Number(actorId) } }) : null;
    await recordCommentEvent({
      req,
      eventType: 'comment_reacted',
      userId: actor?.id ?? null,
      email: (actor as any)?.email ?? null,
      commentId: comment.id,
      taskId: comment.task?.id ?? null,
      threadId: comment.thread?.id ?? null,
      parentCommentId: comment.parentComment?.id ?? null,
      extra: { type, op, reactions },
    });
  } catch {}

  res.json({ ok: true, reactions });
}
