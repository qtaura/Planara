import type { Project, Task, Milestone, SubTask } from '../types';

const _envBase = String(((import.meta as any).env?.VITE_API_URL) || '').trim();
export const API_BASE = _envBase || `${window.location.origin}/api`;
import { get } from 'http';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';
const TOKEN_KEY = 'planara_token';
const CURRENT_USER_KEY = 'planara_current_user';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export function setCurrentUser(user: any) {
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch {}
}

export function getCurrentUser(): any | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearCurrentUser() {
  try {
    localStorage.removeItem(CURRENT_USER_KEY);
  } catch {}
}

export function signOut() {
  try {
    clearToken();
    clearCurrentUser();
    // Signal the app to show the login screen
    window.dispatchEvent(new CustomEvent('auth:required'));
  } catch {}
}

function decodeUserIdFromToken(token: string | null): number | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(atob(parts[1]));
    return typeof payload?.userId === 'number' ? payload.userId : null;
  } catch {
    return null;
  }
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...init, headers });
}

export async function getUserById(id: number): Promise<any | null> {
  const res = await apiFetch(`/users`);
  if (!res.ok) throw new Error(`Failed to fetch users: ${res.status}`);
  const users = await res.json();
  return (users as any[]).find((u) => Number(u?.id) === Number(id)) || null;
}

export async function getCurrentUserFromAPI(): Promise<any | null> {
  const id = decodeUserIdFromToken(getToken());
  if (!id) return null;
  const user = await getUserById(id);
  if (user) setCurrentUser(user);
  return user;
}

export async function updateUser(id: number, payload: Partial<{ username: string; email: string; password: string; teamId: number; avatar: string }>): Promise<any> {
  const res = await apiFetch(`/users/${encodeURIComponent(String(id))}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let message = `Failed to update user: ${res.status}`;
    try {
      const text = await res.text();
      if (text) {
        try {
          const data = JSON.parse(text);
          const errMsg = typeof data?.error === 'string' ? data.error : undefined;
          if (errMsg) {
            const lower = errMsg.toLowerCase();
            if (lower.includes('username') && lower.includes('exists')) {
              message = 'This username is unavailable';
            } else {
              message = errMsg;
            }
          } else {
            message = text;
          }
        } catch {
          // plain text error
          message = text;
        }
      }
    } catch {}
    throw new Error(message);
  }
  const data = await res.json();
  setCurrentUser(data);
  return data;
}

export async function listProjects(): Promise<any[]> {
  const res = await apiFetch('/projects');
  if (!res.ok) throw new Error(`Failed to fetch projects: ${res.status}`);
  return res.json();
}

export async function createProject(payload: any): Promise<any> {
  const res = await apiFetch('/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to create project: ${res.status}`);
  }
  return res.json();
}

export async function listTasksForProject(projectId: string): Promise<any[]> {
  const res = await apiFetch(`/projects/${encodeURIComponent(projectId)}/tasks`);
  if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
  return res.json();
}

export async function listMilestonesForProject(projectId: string): Promise<any[]> {
  const res = await apiFetch(`/projects/${encodeURIComponent(projectId)}/milestones`);
  if (!res.ok) throw new Error(`Failed to fetch milestones: ${res.status}`);
  return res.json();
}

export async function updateProject(projectId: string, payload: any): Promise<any> {
  const res = await apiFetch(`/projects/${encodeURIComponent(projectId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update project: ${res.status}`);
  return res.json();
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const res = await apiFetch(`/projects/${encodeURIComponent(projectId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete project: ${res.status}`);
  const data = await res.json();
  return !!data?.ok;
}

export async function createTask(projectId: string, payload: any): Promise<any> {
  const res = await apiFetch(`/projects/${encodeURIComponent(projectId)}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create task: ${res.status}`);
  return res.json();
}

export async function updateTask(taskId: string, payload: any): Promise<any> {
  const res = await apiFetch(`/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update task: ${res.status}`);
  return res.json();
}

export async function deleteTask(taskId: string): Promise<boolean> {
  const res = await apiFetch(`/tasks/${encodeURIComponent(taskId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete task: ${res.status}`);
  const data = await res.json();
  return !!data?.ok;
}

export async function login(usernameOrEmail: string, password: string): Promise<{ token: string; user: any }>{
  // Improved error handling: normalize invalid credentials and network errors
  try {
    const res = await fetch(`${API_BASE}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password }),
    });
    if (!res.ok) {
      let message = 'Incorrect username or password';
      try {
        const text = await res.text();
        if (text) {
          const data = JSON.parse(text);
          if (typeof data?.error === 'string' && data.error) {
            message = data.error.toLowerCase().includes('invalid') ? 'Incorrect username or password' : data.error;
          }
        }
      } catch {}
      throw new Error(message);
    }
    const data = await res.json();
    return data;
  } catch (e: any) {
    const msg = e?.message || 'Login failed';
    if (msg.includes('Failed to fetch')) {
      throw new Error('Network error. Check your connection.');
    }
    throw new Error(msg);
  }
}

export async function signup(payload: { username: string; email: string; password: string }): Promise<any> {
  const res = await fetch(`${API_BASE}/users/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let message = `Failed to signup: ${res.status}`;
    try {
      const text = await res.text();
      if (text) {
        try {
          const data = JSON.parse(text);
          const errMsg = typeof data?.error === 'string' ? data.error : undefined;
          if (errMsg) {
            const lower = errMsg.toLowerCase();
            if (lower.includes('exists')) {
              message = 'Username or email already in use';
            } else {
              message = errMsg;
            }
          } else {
            message = text;
          }
        } catch {
          // plain text error
          message = text;
        }
      }
    } catch {}
    throw new Error(message);
  }
  return res.json();
}

export { API_BASE };