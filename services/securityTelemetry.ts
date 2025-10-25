import { Request } from "express";
import { AppDataSource } from "../db/data-source.js";
import { SecurityEvent } from "../models/SecurityEvent.js";
import { normalizeUsernameForPolicy, disallowedReason } from "./usernamePolicy.js";

export type UsernameRejectionSource = 'signup' | 'update' | 'admin_set_username';

export async function recordUsernameRejected(opts: {
  req: Request;
  email?: string | null;
  username: string;
  source: UsernameRejectionSource;
  reason?: string | null; // if not provided, will attempt disallowedReason
}) {
  try {
    const ip = opts.req?.ip || null;
    const email = opts.email || null;
    const username = String(opts.username || '');
    const normalized = normalizeUsernameForPolicy(username);
    const repo = AppDataSource.getRepository(SecurityEvent);
    const reason = (typeof opts.reason === 'string' && opts.reason) ? opts.reason : (disallowedReason(username) || 'policy_disallowed');
    const metadata = {
      reason,
      username,
      normalized,
      source: opts.source,
      path: opts.req?.originalUrl || null,
      ua: opts.req?.headers['user-agent'] || null,
    };
    const ev = repo.create({
      email,
      userId: null,
      eventType: 'username_rejected',
      ip,
      metadata,
      createdAt: new Date(),
    });
    await repo.save(ev);
  } catch (e) {
    // Best-effort telemetry; never throw from logging
  }
}

export async function recordCommentEvent(opts: {
  req: Request;
  eventType: 'comment_created' | 'comment_replied' | 'comment_reacted';
  userId?: number | null;
  email?: string | null;
  commentId?: number | null;
  taskId?: number | null;
  threadId?: number | null;
  parentCommentId?: number | null;
  reaction?: { type: string; op: 'add' | 'remove' } | null;
  extra?: Record<string, any> | null;
}) {
  try {
    const repo = AppDataSource.getRepository(SecurityEvent);
    const ev = repo.create({
      email: opts.email ?? null,
      userId: opts.userId ?? null,
      eventType: opts.eventType,
      ip: opts.req?.ip || null,
      metadata: {
        path: opts.req?.originalUrl || null,
        ua: opts.req?.headers['user-agent'] || null,
        commentId: opts.commentId ?? null,
        taskId: opts.taskId ?? null,
        threadId: opts.threadId ?? null,
        parentCommentId: opts.parentCommentId ?? null,
        reaction: opts.reaction ?? null,
        ...(opts.extra || {}),
      },
      createdAt: new Date(),
    });
    await repo.save(ev);
  } catch {}
}