import { AppDataSource } from '../db/data-source.js';
import { Task } from '../models/Task.js';
import { Comment } from '../models/Comment.js';
import { Thread } from '../models/Thread.js';

function normalize(str: string): string {
  return String(str || '')
    .trim()
    .toLowerCase();
}

export async function suggestTaskAuthoring(options: {
  orgId?: number;
  projectId?: number;
  teamId?: number;
  taskId?: number;
  prompt?: string;
}): Promise<{
  suggestions: { title: string; description: string }[];
  rationale: string;
}> {
  const { orgId, projectId, teamId, taskId, prompt } = options || {};
  const taskRepo = AppDataSource.getRepository(Task);

  let where: any = {};
  if (projectId) where = { project: { id: projectId } };
  const tasks = await taskRepo.find({ where, relations: { project: true }, take: 100 });

  const backlog = tasks.filter((t) => normalize(t.status) === 'backlog');
  const inProgress = tasks.filter((t) => normalize(t.status) === 'in-progress');
  const highPriority = tasks.filter(
    (t) => normalize(t.priority) === 'high' || normalize(t.priority) === 'critical'
  );

  const suggestions: { title: string; description: string }[] = [];
  if (inProgress.length > backlog.length) {
    suggestions.push({
      title: 'Break down large tasks into actionable subtasks',
      description:
        'Review in-progress work and split multi-day efforts into smaller subtasks to improve flow and visibility.',
    });
  }
  if (highPriority.length > 0) {
    suggestions.push({
      title: 'Add risk mitigation checklist',
      description:
        'For critical items, add a short checklist to verify tests, docs, and rollout steps before marking done.',
    });
  }
  if (backlog.length > 5) {
    suggestions.push({
      title: 'Prioritize backlog and archive stale items',
      description:
        'Sort backlog by impact and age; archive or defer items older than 90 days to reduce noise.',
    });
  }
  if (prompt && normalize(prompt).includes('docs')) {
    suggestions.push({
      title: 'Update README and API docs',
      description:
        'Reflect recent changes in endpoints, flags, and admin tools to keep onboarding smooth.',
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      title: 'Add unit tests for recent changes',
      description:
        'Identify recently modified modules and add coverage for edge cases and error handling.',
    });
  }

  return {
    suggestions,
    rationale: 'Generated from current task distribution and provided prompt context.',
  };
}

export async function summarizeThread(threadId: number): Promise<{
  summary: string;
  participants: string[];
  commentCount: number;
}> {
  const commentRepo = AppDataSource.getRepository(Comment);
  const threadRepo = AppDataSource.getRepository(Thread);
  const thread = await threadRepo.findOne({ where: { id: threadId }, relations: { task: true } });
  if (!thread) {
    return { summary: 'Thread not found.', participants: [], commentCount: 0 };
  }
  const comments = await commentRepo.find({
    where: { thread: { id: threadId } },
    relations: { author: true },
    order: { createdAt: 'ASC' },
  });

  const participants = Array.from(
    new Set(comments.map((c) => (c.author as any)?.username).filter(Boolean))
  ) as string[];
  const first = comments[0]?.content || '';
  const last = comments[comments.length - 1]?.content || '';

  const summary =
    `Thread on task #${(thread.task as any)?.id ?? '?'} with ${comments.length} messages. ` +
    (participants.length ? `Participants: ${participants.join(', ')}. ` : '') +
    (first ? `Started with: "${first.slice(0, 140)}". ` : '') +
    (last ? `Latest: "${last.slice(0, 140)}".` : '');

  return { summary, participants, commentCount: comments.length };
}

export async function triageEvaluate(options: {
  orgId?: number;
  projectId?: number;
  teamId?: number;
  taskId?: number;
  taskSnapshot?: {
    title?: string;
    description?: string;
    labels?: string[];
    status?: string;
    dueDate?: Date | string | null;
  };
}): Promise<{
  suggestedPriority: 'low' | 'medium' | 'high' | 'critical';
  dueDateSuggestion?: string | null;
  blockers: string[];
  signals: Record<string, any>;
}> {
  const { orgId, projectId, teamId, taskId, taskSnapshot } = options || {};
  const taskRepo = AppDataSource.getRepository(Task);
  let task: Task | null = null;
  if (taskId) {
    task = await taskRepo.findOne({ where: { id: Number(taskId) }, relations: { project: true } });
  }

  const labels = (taskSnapshot?.labels || (task?.labels as any) || []) as string[];
  const status = normalize(taskSnapshot?.status || (task?.status as any) || 'backlog');
  const desc = normalize(taskSnapshot?.description || (task?.description as any) || '');
  const title = normalize(taskSnapshot?.title || (task?.title as any) || '');
  const due = (taskSnapshot?.dueDate || (task as any)?.dueDate) as Date | string | null | undefined;

  let suggestedPriority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  const signals: Record<string, any> = {};
  signals.context = { orgId, projectId, teamId, taskId };

  const keywordsCritical = ['security', 'data loss', 'breach', 'p0', 'sev0'];
  const keywordsHigh = ['deadline', 'customer', 'release', 'incident', 'outage'];
  if (labels.some((l) => ['critical', 'p0', 'security'].includes(normalize(l)))) {
    suggestedPriority = 'critical';
    signals.labelCritical = true;
  } else if (keywordsCritical.some((k) => title.includes(k) || desc.includes(k))) {
    suggestedPriority = 'critical';
    signals.textCritical = true;
  } else if (labels.some((l) => ['high', 'p1'].includes(normalize(l)))) {
    suggestedPriority = 'high';
    signals.labelHigh = true;
  } else if (keywordsHigh.some((k) => title.includes(k) || desc.includes(k))) {
    suggestedPriority = 'high';
    signals.textHigh = true;
  } else if (status === 'review' || status === 'qa') {
    suggestedPriority = 'medium';
    signals.stage = status;
  } else if (status === 'backlog') {
    suggestedPriority = 'low';
    signals.stage = status;
  }

  // Due date suggestion: based on priority and current status
  let dueDateSuggestion: string | null = null;
  const now = new Date();
  const baseDays =
    suggestedPriority === 'critical'
      ? 1
      : suggestedPriority === 'high'
        ? 3
        : suggestedPriority === 'medium'
          ? 7
          : 14;
  const suggested = new Date(now.getTime() + baseDays * 24 * 60 * 60 * 1000);
  dueDateSuggestion = suggested.toISOString();
  if (due) {
    signals.existingDueDate = due;
  }

  // Blockers: scan recent comments for keywords
  const blockers: string[] = [];
  if (taskId) {
    const commentRepo = AppDataSource.getRepository(Comment);
    const comments = await commentRepo.find({
      where: { task: { id: taskId } },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    const blockerKeywords = [
      'blocked',
      'waiting',
      'dependency',
      'stuck',
      'cannot',
      'needs approval',
    ];
    for (const c of comments) {
      const text = normalize(c.content);
      if (blockerKeywords.some((k) => text.includes(k))) {
        blockers.push(c.content.slice(0, 160));
      }
    }
  }

  return { suggestedPriority, dueDateSuggestion, blockers, signals };
}

export async function teamInsights(options: {
  orgId?: number;
  teamId?: number;
  projectId?: number;
  windowDays?: number;
}): Promise<{
  metrics: Record<string, any>;
  recommendations: string[];
}> {
  const { orgId, teamId, projectId, windowDays = 30 } = options || {};
  const taskRepo = AppDataSource.getRepository(Task);

  const where: any = {};
  if (projectId) where.project = { id: projectId };
  const tasks = await taskRepo.find({ where, relations: { project: true }, take: 1000 });

  const now = Date.now();
  const msWindow = windowDays * 24 * 60 * 60 * 1000;

  const byStatus = tasks.reduce<Record<string, number>>((acc, t) => {
    const s = normalize(t.status);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const doneRecent = tasks.filter(
    (t) => normalize(t.status) === 'done' && now - new Date(t.createdAt).getTime() <= msWindow
  );
  const inProgressAges = tasks
    .filter((t) => normalize(t.status) === 'in-progress')
    .map((t) => (now - new Date(t.createdAt).getTime()) / (24 * 60 * 60 * 1000));
  const avgWipAgeDays = inProgressAges.length
    ? Math.round((inProgressAges.reduce((a, b) => a + b, 0) / inProgressAges.length) * 10) / 10
    : 0;

  const overdue = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate).getTime() < now && normalize(t.status) !== 'done'
  );
  const priorityDist = tasks.reduce<Record<string, number>>((acc, t) => {
    const p = normalize(t.priority);
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  const metrics = {
    total: tasks.length,
    byStatus,
    throughput30d: doneRecent.length,
    avgWipAgeDays,
    overdueCount: overdue.length,
    priorityDist,
    context: { orgId, teamId, projectId },
  };

  const recommendations: string[] = [];
  if (avgWipAgeDays > 7) recommendations.push('Consider WIP limits; many tasks aging in progress.');
  if ((byStatus['backlog'] || 0) > (byStatus['done'] || 0))
    recommendations.push('Backlog growing faster than done; triage and prune low-impact items.');
  if (overdue.length > 0) recommendations.push('Address overdue tasks or renegotiate deadlines.');
  if (
    (priorityDist['critical'] || 0) > 0 &&
    (byStatus['done'] || 0) < (priorityDist['critical'] || 0)
  )
    recommendations.push('Critical items remain open; allocate focus to reduce risk.');

  return { metrics, recommendations };
}
