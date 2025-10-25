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