import type { Project, Task, Milestone, SubTask } from '../types';

const TOKEN_KEY = 'planara_token';
const CURRENT_USER_KEY = 'planara_current_user';
const ADMIN_TOKEN_KEY = 'admin_token';
const REFRESH_TOKEN_KEY = 'planara_refresh_token';

const API_BASE_ORIGIN = (import.meta as any).env?.VITE_API_BASE || '';
const API_BASE_PATH = '/api';
export const API_BASE = `${API_BASE_ORIGIN}${API_BASE_PATH}`;

import { isOffline } from './network';

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init?.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch (err: any) {
    if (isOffline()) {
      throw new Error('Network offline');
    }
    throw err;
  }
  if (res.status === 401) {
    const refreshed = await refreshAccessToken().catch(() => null);
    if (refreshed) {
      const headers2 = new Headers(init?.headers || {});
      const newToken = getToken();
      if (newToken) headers2.set('Authorization', `Bearer ${newToken}`);
      try {
        res = await fetch(`${API_BASE}${path}`, { ...init, headers: headers2 });
      } catch (err: any) {
        if (isOffline()) {
          throw new Error('Network offline');
        }
        throw err;
      }
    } else {
      signOut();
    }
    return res;
  }
  if (res.status === 403) {
    try {
      const cloned = res.clone();
      const text = await cloned.text();
      const data = JSON.parse(text);
      const errMsg = String(data?.error || '');
      if (errMsg.toLowerCase().includes('verification')) {
        const cu = getCurrentUser();
        try { window.dispatchEvent(new CustomEvent('auth:needs_verification', { detail: { email: cu?.email } })); } catch {}
      }
    } catch {}
  }
  return res;
}

export function setToken(token: string) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch {}
}
export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

export function setRefreshToken(token: string) {
  try { localStorage.setItem(REFRESH_TOKEN_KEY, token); } catch {}
}
export function getRefreshToken(): string | null {
  try { return localStorage.getItem(REFRESH_TOKEN_KEY); } catch { return null; }
}
export function clearRefreshToken() {
  try { localStorage.removeItem(REFRESH_TOKEN_KEY); } catch {}
}

export function setCurrentUser(user: any) {
  try { localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user)); } catch {}
}
export function getCurrentUser(): any | null {
  try { const raw = localStorage.getItem(CURRENT_USER_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function clearCurrentUser() {
  try { localStorage.removeItem(CURRENT_USER_KEY); } catch {}
}

// Admin token persistence for a session
export function setAdminTokenSession(token: string) {
  try { sessionStorage.setItem(ADMIN_TOKEN_KEY, token); } catch {}
}
export function getAdminTokenSession(): string {
  try { return sessionStorage.getItem(ADMIN_TOKEN_KEY) || ''; } catch { return ''; }
}
export function clearAdminTokenSession() {
  try { sessionStorage.removeItem(ADMIN_TOKEN_KEY); } catch {}
}

export function signOut() {
  try {
    clearToken();
    clearCurrentUser();
    clearAdminTokenSession();
    clearRefreshToken();
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

export async function updateTaskStatus(taskId: string | number, status: string, teamId?: number): Promise<any> {
  const payload = teamId ? { status, teamId } : { status };
  return updateTask(String(taskId), payload);
}

export async function deleteTask(taskId: string, teamId?: number): Promise<boolean> {
  const qs = teamId ? `?teamId=${encodeURIComponent(String(teamId))}` : '';
  const res = await apiFetch(`/tasks/${encodeURIComponent(taskId)}${qs}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete task: ${res.status}`);
  const data = await res.json();
  return !!data?.ok;
}

export async function login(usernameOrEmail: string, password: string): Promise<{ token: string; user: any; refreshToken?: string }>{
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
  try {
    const res = await fetch(`${API_BASE}/users/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const message = errorData?.error || `Signup failed with status ${res.status}`;
      throw new Error(message);
    }

    const data = await res.json();
    if (data.token) {
      setToken(data.token);
      if (data.user) setCurrentUser(data.user);
    }
    return data;
  } catch (error) {
    // Re-throw with a user-friendly message
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error during signup. Please try again.');
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  const rt = getRefreshToken();
  if (!rt) return null;
  try {
    const res = await fetch(`${API_BASE}/users/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.token) setToken(String(data.token));
    if (data?.refreshToken) setRefreshToken(String(data.refreshToken));
    return data?.token || null;
  } catch {
    return null;
  }
}

export async function adminSetUsername(email: string, newUsername: string, adminToken: string): Promise<any> {
  const res = await apiFetch('/users/admin/set-username', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
    body: JSON.stringify({ email, newUsername }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `Set username failed: ${res.status}`);
  return json;
}

// Notification API functions
export async function getNotifications(): Promise<any[]> {
  const res = await apiFetch('/notifications');
  if (!res.ok) throw new Error(`Failed to fetch notifications: ${res.status}`);
  return res.json();
}

export async function getUnreadNotificationCount(): Promise<number> {
  const res = await apiFetch('/notifications/unread-count');
  if (!res.ok) throw new Error(`Failed to fetch unread count: ${res.status}`);
  const data = await res.json();
  return data.count || 0;
}

export async function createNotification(payload: {
  title: string;
  message: string;
  type?: string;
  projectId?: number;
  taskId?: number;
  actionUrl?: string;
}): Promise<any> {
  const res = await apiFetch('/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create notification: ${res.status}`);
  return res.json();
}

export async function markNotificationAsRead(notificationId: number): Promise<any> {
  const res = await apiFetch(`/notifications/${notificationId}/read`, {
    method: 'PUT',
  });
  if (!res.ok) throw new Error(`Failed to mark notification as read: ${res.status}`);
  return res.json();
}

export async function markAllNotificationsAsRead(): Promise<boolean> {
  const res = await apiFetch('/notifications/mark-all-read', {
    method: 'PUT',
  });
  if (!res.ok) throw new Error(`Failed to mark all notifications as read: ${res.status}`);
  const data = await res.json();
  return !!data?.success;
}

export async function deleteNotification(notificationId: number): Promise<boolean> {
  const res = await apiFetch(`/notifications/${notificationId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete notification: ${res.status}`);
  const data = await res.json();
  return !!data?.success;
}


export async function getProjectWithRelations(projectId: string): Promise<any | null> {
  const res = await apiFetch('/projects');
  if (!res.ok) throw new Error(`Failed to fetch project: ${res.status}`);
  const projects = await res.json();
  return (projects as any[]).find((p) => String(p?.id) === String(projectId)) || null;
}

export async function sendVerificationCode(email: string): Promise<any> {
  const normalized = String(email || '').trim().toLowerCase();
  const res = await apiFetch('/users/auth/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: normalized }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to send code: ${res.status}`);
  }
  return res.json();
}

export async function verifyEmailCode(email: string, code: string): Promise<any> {
  const normalized = String(email || '').trim().toLowerCase();
  const res = await apiFetch('/users/auth/verify-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: normalized, code }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to verify code: ${res.status}`);
  }
  return res.json();
}

export async function getVerificationStatus(email: string): Promise<any> {
  const normalized = String(email || '').trim().toLowerCase();
  const res = await apiFetch(`/users/auth/verification-status/${encodeURIComponent(normalized)}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to get status: ${res.status}`);
  }
  return res.json();
}

export async function adminUnlock(email: string, adminToken: string): Promise<any> {
  const normalized = String(email || '').trim().toLowerCase();
  const res = await apiFetch('/users/auth/admin/unlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
    body: JSON.stringify({ email: normalized }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to unlock: ${res.status}`);
  }
  return res.json();
}

export async function getLockoutState(email: string, adminToken: string): Promise<any> {
  const normalized = String(email || '').trim().toLowerCase();
  const res = await apiFetch(`/users/auth/admin/lockout-state/${encodeURIComponent(normalized)}`, {
    headers: { 'x-admin-token': adminToken },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch lockout state: ${res.status}`);
  }
  return res.json();
}

export type AdminEventFilters = { type?: string; ip?: string; from?: Date | string; to?: Date | string; limit?: number };
export async function getSecurityEvents(email: string, adminToken: string, filters?: AdminEventFilters): Promise<any> {
  const params = new URLSearchParams();
  if (filters?.type) params.set('type', filters.type);
  if (filters?.ip) params.set('ip', filters.ip);
  if (filters?.from) params.set('from', typeof filters.from === 'string' ? filters.from : (filters.from as Date).toISOString());
  if (filters?.to) params.set('to', typeof filters.to === 'string' ? filters.to : (filters.to as Date).toISOString());
  if (filters?.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  const res = await apiFetch(`/users/auth/admin/events/${encodeURIComponent(email)}${qs ? `?${qs}` : ''}`, {
    headers: { 'x-admin-token': adminToken },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch events: ${res.status}`);
  }
  return res.json();
}
export async function getRotationHistory(email: string, adminToken: string, filters?: { from?: Date | string; to?: Date | string; limit?: number }): Promise<any> {
  const params = new URLSearchParams();
  if (filters?.from) params.set('from', typeof filters.from === 'string' ? filters.from : (filters.from as Date).toISOString());
  if (filters?.to) params.set('to', typeof filters.to === 'string' ? filters.to : (filters.to as Date).toISOString());
  if (filters?.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  const res = await apiFetch(`/users/auth/admin/rotations/${encodeURIComponent(email)}${qs ? `?${qs}` : ''}`, {
    headers: { 'x-admin-token': adminToken },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch rotations: ${res.status}`);
  }
  return res.json();
}
export async function adminBanUser(email: string, adminToken: string, reason?: string): Promise<any> {
  const res = await apiFetch('/users/admin/ban', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
    body: JSON.stringify({ email, reason }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `Ban failed: ${res.status}`);
  return json;
}

export async function inviteToTeam(identifier: string) {
  const res = await apiFetch('/users/auth/team/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to send invite: ${res.status}`);
  }
  return res.json();
}

export async function acceptTeamInvite(from: number, teamId?: number) {
  const res = await apiFetch('/users/auth/team/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, teamId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to accept invite: ${res.status}`);
  }
  return res.json();
}

// Organization APIs
export async function getOrganizations(): Promise<any[]> {
  const res = await apiFetch('/orgs');
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to fetch organizations: ${res.status}`);
  }
  return res.json();
}

export async function createOrganization(name: string): Promise<any> {
  const res = await apiFetch('/orgs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to create organization: ${res.status}`);
  }
  return res.json();
}

export async function updateOrganization(id: number, name: string): Promise<any> {
  const res = await apiFetch(`/orgs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to update organization: ${res.status}`);
  }
  return res.json();
}

export async function deleteOrganization(id: number): Promise<void> {
  const res = await apiFetch(`/orgs/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to delete organization: ${res.status}`);
  }
}

export async function transferOrgOwnership(id: number, newOwnerUserId: number): Promise<any> {
  const res = await apiFetch(`/orgs/${id}/transfer-ownership`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newOwnerUserId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to transfer ownership: ${res.status}`);
  }
  return res.json();
}

// Team APIs
export async function listTeams(orgId: number): Promise<any[]> {
  const res = await apiFetch(`/teams/${orgId}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to list teams: ${res.status}`);
  }
  return res.json();
}

export async function createTeam(orgId: number, name: string): Promise<any> {
  const res = await apiFetch(`/teams/${orgId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to create team: ${res.status}`);
  }
  return res.json();
}

// Members management
export async function listMembers(teamId: number): Promise<any[]> {
  const res = await apiFetch(`/teams/members/${teamId}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to list members: ${res.status}`);
  }
  return res.json();
}

export async function changeRole(teamId: number, userId: number, role: 'member' | 'admin' | 'owner'): Promise<any> {
  const res = await apiFetch(`/teams/members/${teamId}/change-role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, role }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to change role: ${res.status}`);
  }
  return res.json();
}

export async function transferTeamOwnership(teamId: number, newOwnerUserId: number): Promise<any> {
  const res = await apiFetch(`/teams/members/${teamId}/transfer-ownership`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newOwnerUserId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to transfer ownership: ${res.status}`);
  }
  return res.json();
}

export async function leaveTeam(teamId: number): Promise<any> {
  const res = await apiFetch(`/teams/members/${teamId}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to leave team: ${res.status}`);
  }
  return res.json();
}

export async function listComments(taskId: number): Promise<any[]> {
  const res = await apiFetch(`/comments?taskId=${encodeURIComponent(String(taskId))}`);
  if (!res.ok) throw new Error(`Failed to fetch comments: ${res.status}`);
  return res.json();
}
export async function createComment(payload: { taskId: number; content: string; authorId?: number }): Promise<any> {
  const res = await apiFetch('/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to create comment: ${res.status}`);
  }
  const data = await res.json();
  try { window.dispatchEvent(new CustomEvent('comments:changed', { detail: { taskId: payload.taskId, comment: data } })); } catch {}
  return data;
}
export async function createReply(parentCommentId: number, content: string, authorId?: number): Promise<any> {
  const res = await apiFetch(`/comments/${encodeURIComponent(String(parentCommentId))}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentCommentId, content, authorId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to create reply: ${res.status}`);
  }
  const data = await res.json();
  try { window.dispatchEvent(new CustomEvent('comments:changed', { detail: { parentCommentId, comment: data } })); } catch {}
  return data;
}
export async function getThreadComments(threadId: number): Promise<any[]> {
  const res = await apiFetch(`/comments/threads/${encodeURIComponent(String(threadId))}`);
  if (!res.ok) throw new Error(`Failed to fetch thread: ${res.status}`);
  return res.json();
}
export async function reactToComment(commentId: number, type: 'thumbs_up' | 'heart' | 'laugh' | 'hooray' | 'rocket' | 'eyes', op: 'add' | 'remove' = 'add'): Promise<{ ok: boolean; reactions: Record<string, number> }> {
  const res = await apiFetch(`/comments/${encodeURIComponent(String(commentId))}/reactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, op }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to react to comment: ${res.status}`);
  }
  const data = await res.json();
  try { window.dispatchEvent(new CustomEvent('comments:changed', { detail: { commentId, reactions: data?.reactions || {} } })); } catch {}
  return data;
}


export async function listAttachments(params: { taskId?: number; projectId?: number; teamId?: number }): Promise<any[]> {
  const q = new URLSearchParams();
  if (params.taskId) q.set('taskId', String(params.taskId));
  if (params.projectId) q.set('projectId', String(params.projectId));
  if (params.teamId) q.set('teamId', String(params.teamId));
  const res = await apiFetch(`/attachments?${q.toString()}`);
  if (!res.ok) throw new Error(`Failed to list attachments: ${res.status}`);
  return res.json();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const b = reader.result as ArrayBuffer;
      const base64 = b ? btoa(String.fromCharCode(...new Uint8Array(b))) : '';
      resolve(base64);
    };
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
}

export async function uploadAttachment(opts: { file: File; taskId?: number; projectId?: number; teamId?: number; attachmentId?: number }): Promise<any> {
  const base64 = await fileToBase64(opts.file);
  const res = await apiFetch(`/attachments/upload${opts.teamId ? `?teamId=${encodeURIComponent(String(opts.teamId))}` : ''}` , {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: opts.file.name,
      mimeType: opts.file.type || 'application/octet-stream',
      size: opts.file.size,
      contentBase64: base64,
      taskId: opts.taskId,
      projectId: opts.projectId,
      attachmentId: opts.attachmentId,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to upload: ${res.status}`);
  }
  return res.json();
}

export function getAttachmentPreviewUrl(id: number, teamId?: number): string {
  const base = `${API_BASE}/attachments/${encodeURIComponent(String(id))}/preview`;
  return teamId ? `${base}?teamId=${encodeURIComponent(String(teamId))}` : base;
}

export async function deleteAttachment(id: number, teamId?: number): Promise<void> {
  const res = await apiFetch(`/attachments/${encodeURIComponent(String(id))}${teamId ? `?teamId=${encodeURIComponent(String(teamId))}` : ''}`, { method: 'DELETE' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to delete: ${res.status}`);
  }
}

export async function listAttachmentVersions(id: number): Promise<any[]> {
  const res = await apiFetch(`/attachments/${encodeURIComponent(String(id))}/versions`);
  if (!res.ok) throw new Error(`Failed to list versions: ${res.status}`);
  return res.json();
}

export async function rollbackAttachmentVersion(id: number, versionNumber: number, teamId?: number): Promise<any> {
  const res = await apiFetch(`/attachments/${encodeURIComponent(String(id))}/rollback${teamId ? `?teamId=${encodeURIComponent(String(teamId))}` : ''}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ versionNumber }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to rollback: ${res.status}`);
  }
  return res.json();
}