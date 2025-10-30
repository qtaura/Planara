import { Request, Response } from 'express';
import {
  suggestTaskAuthoring,
  summarizeThread,
  triageEvaluate,
  teamInsights,
} from '../services/aiAssistant.js';

export async function authoringSuggest(req: Request, res: Response) {
  try {
    const { orgId, projectId, teamId, taskId, prompt } = req.body || {};
    const ctx = {
      orgId: Number(orgId) || undefined,
      projectId: Number(projectId) || undefined,
      teamId: Number(teamId) || undefined,
      taskId: Number(taskId) || undefined,
    };
    console.log('[AI] authoringSuggest ctx', ctx);
    const result = await suggestTaskAuthoring({ ...ctx, prompt });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'authoring suggest failed' });
  }
}

export async function authoringSummarizeThread(req: Request, res: Response) {
  try {
    const threadId = Number(req.params.threadId);
    const { orgId, projectId, teamId, taskId } = req.query as any;
    const ctx = {
      orgId: Number(orgId) || undefined,
      projectId: Number(projectId) || undefined,
      teamId: Number(teamId) || undefined,
      taskId: Number(taskId) || undefined,
    };
    console.log('[AI] summarizeThread ctx', { threadId, ...ctx });
    const result = await summarizeThread(threadId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'thread summarization failed' });
  }
}

export async function triage(req: Request, res: Response) {
  try {
    const { orgId, projectId, teamId, taskId, taskSnapshot } = req.body || {};
    const ctx = {
      orgId: Number(orgId) || undefined,
      projectId: Number(projectId) || undefined,
      teamId: Number(teamId) || undefined,
      taskId: taskId ? Number(taskId) : undefined,
    };
    console.log('[AI] triage ctx', ctx);
    const result = await triageEvaluate({ ...ctx, taskSnapshot });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'triage evaluation failed' });
  }
}

export async function analyticsTeam(req: Request, res: Response) {
  try {
    const orgId = Number((req.query as any)?.orgId || 0) || undefined;
    const teamId = Number((req.query as any)?.teamId || 0) || undefined;
    const projectId = Number((req.query as any)?.projectId || 0) || undefined;
    const windowDays = Number((req.query as any)?.windowDays || 30);
    console.log('[AI] analyticsTeam ctx', { orgId, teamId, projectId });
    const result = await teamInsights({ orgId, teamId, projectId, windowDays });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'analytics failed' });
  }
}
