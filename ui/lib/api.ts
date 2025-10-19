import type { Project, Task, Milestone, SubTask } from '../types';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

function toUiTask(t: any): Task {
  const subtasks: SubTask[] = [];
  const dueDate = t.milestone?.dueDate ? new Date(t.milestone.dueDate).toISOString().slice(0, 10) : undefined;
  return {
    id: String(t.id),
    title: t.title || '',
    description: t.description || '',
    status: (t.status as Task['status']) || 'backlog',
    priority: (t.priority as Task['priority']) || 'medium',
    assignee: t.assignee?.username || undefined,
    dueDate,
    subtasks,
    labels: Array.isArray(t.labels) ? t.labels : [],
    dependencies: [],
    progress: 0,
  };
}

function toUiMilestone(m: any): Milestone {
  const endDate = m.dueDate ? new Date(m.dueDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const startDate = new Date(new Date(endDate).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return {
    id: String(m.id),
    title: m.title || '',
    description: '',
    startDate,
    endDate,
    progress: typeof m.progressPercent === 'number' ? m.progressPercent : 0,
    color: '#8b5cf6',
    tasks: [],
    dependencies: [],
  };
}

function toUiProject(p: any, tasks: Task[] = [], milestones: Milestone[] = []): Project {
  const createdAtISO = p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  const endISO = new Date(new Date(createdAtISO).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return {
    id: String(p.id),
    name: p.name || '',
    description: p.description || '',
    color: '#8b5cf6',
    progress: 0,
    startDate: createdAtISO,
    endDate: endISO,
    status: p.archived ? 'archived' : 'active',
    favorite: !!p.favorite,
    githubLinked: false,
    tasks,
    milestones,
    members: [],
    velocity: 0,
  };
}

export async function listProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/projects`);
  if (!res.ok) throw new Error(`Failed to fetch projects: ${res.status}`);
  const data = await res.json();
  // Map without relations first
  return (data as any[]).map((p) => toUiProject(p));
}

export async function listTasksForProject(projectId: string): Promise<Task[]> {
  const res = await fetch(`${API_BASE}/tasks?projectId=${encodeURIComponent(projectId)}`);
  if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
  const data = await res.json();
  return (data as any[]).map((t) => toUiTask(t));
}

export async function listMilestonesForProject(projectId: string): Promise<Milestone[]> {
  const res = await fetch(`${API_BASE}/milestones?projectId=${encodeURIComponent(projectId)}`);
  if (!res.ok) throw new Error(`Failed to fetch milestones: ${res.status}`);
  const data = await res.json();
  return (data as any[]).map((m) => toUiMilestone(m));
}

export async function getProjectWithRelations(projectId: string): Promise<Project | null> {
  // There is no GET /projects/:id; fetch all and find
  const projects = await listProjects();
  const base = projects.find((p) => p.id === projectId);
  if (!base) return null;
  const [tasks, milestones] = await Promise.all([
    listTasksForProject(projectId),
    listMilestonesForProject(projectId),
  ]);
  return toUiProject({ ...base, id: Number(projectId), name: base.name, description: base.description, archived: base.status === 'archived', favorite: base.favorite, createdAt: base.startDate }, tasks, milestones);
}

export async function createProject(payload: { name: string; description?: string; archived?: boolean; favorite?: boolean }): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create project: ${res.status}`);
  const data = await res.json();
  return toUiProject(data);
}

export async function updateTaskStatus(taskId: string, status: Task['status']): Promise<Task> {
  const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`Failed to update task: ${res.status}`);
  const data = await res.json();
  return toUiTask(data);
}

export async function deleteTask(taskId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(taskId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete task: ${res.status}`);
  const data = await res.json();
  return !!data?.ok;
}