import { Request, Response } from 'express';
import {
  suggestTaskAuthoring,
  summarizeThread,
  triageEvaluate,
  teamInsights,
} from '../services/aiAssistant.js';

export async function authoringSuggest(req: Request, res: Response) {
  try {
    const { projectId, teamId, prompt } = req.body || {};
    const result = await suggestTaskAuthoring({
      projectId: Number(projectId) || undefined,
      teamId: Number(teamId) || undefined,
      prompt,
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'authoring suggest failed' });
  }
}

export async function authoringSummarizeThread(req: Request, res: Response) {
  try {
    const threadId = Number(req.params.threadId);
    const result = await summarizeThread(threadId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'thread summarization failed' });
  }
}

export async function triage(req: Request, res: Response) {
  try {
    const { taskId, taskSnapshot } = req.body || {};
    const result = await triageEvaluate({
      taskId: taskId ? Number(taskId) : undefined,
      taskSnapshot,
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'triage evaluation failed' });
  }
}

export async function analyticsTeam(req: Request, res: Response) {
  try {
    const teamId = Number((req.query as any)?.teamId || 0) || undefined;
    const projectId = Number((req.query as any)?.projectId || 0) || undefined;
    const windowDays = Number((req.query as any)?.windowDays || 30);
    const result = await teamInsights({ teamId, projectId, windowDays });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'analytics failed' });
  }
}
