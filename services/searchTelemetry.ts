import { Request } from "express";
import { AppDataSource } from "../db/data-source.js";
import { SecurityEvent } from "../models/SecurityEvent.js";

export async function recordSearchEvent(opts: {
  req: Request;
  scope: 'team' | 'owner';
  q: string;
  filters: Record<string, any>;
  resultCount: number;
  started: number; // ms timestamp
}) {
  try {
    const repo = AppDataSource.getRepository(SecurityEvent);
    const latencyMs = Math.max(0, Date.now() - (opts.started || Date.now()));
    const ev = repo.create({
      email: null,
      userId: (opts.req as any)?.userId ?? null,
      eventType: 'search_query',
      ip: opts.req?.ip || null,
      metadata: {
        scope: opts.scope,
        queryLen: (opts.q || '').length,
        resultCount: opts.resultCount,
        latencyMs,
        filters: opts.filters || {},
        path: opts.req?.originalUrl || null,
        ua: opts.req?.headers['user-agent'] || null,
      },
      createdAt: new Date(),
    });
    await repo.save(ev);
  } catch {}
}