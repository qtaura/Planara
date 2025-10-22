const _envBase = String((import.meta.env?.VITE_API_URL) || '').trim();
export const API_BASE = _envBase || `${window.location.origin}/api`;
const TOKEN_KEY = 'planara_token';
const CURRENT_USER_KEY = 'planara_user';
export function getToken() {
    try {
        return localStorage.getItem(TOKEN_KEY);
    }
    catch {
        return null;
    }
}
export function setToken(token) {
    try {
        localStorage.setItem(TOKEN_KEY, token);
    }
    catch { }
}
export function clearToken() {
    try {
        localStorage.removeItem(TOKEN_KEY);
    }
    catch { }
}
export function setCurrentUser(user) {
    try {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    }
    catch { }
}
export function getCurrentUser() {
    try {
        const raw = localStorage.getItem(CURRENT_USER_KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
function decodeUserIdFromToken(token) {
    if (!token)
        return null;
    const parts = token.split('.');
    if (parts.length < 2)
        return null;
    try {
        const payload = JSON.parse(atob(parts[1]));
        return typeof payload?.userId === 'number' ? payload.userId : null;
    }
    catch {
        return null;
    }
}
async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = {
        ...options.headers,
    };
    if (token)
        headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (res.status === 401) {
        clearToken();
        try {
            window.dispatchEvent(new CustomEvent('auth:required'));
        }
        catch { }
        throw new Error('Unauthorized');
    }
    return res;
}
export async function getUserById(id) {
    const res = await apiFetch(`/users`);
    if (!res.ok)
        throw new Error(`Failed to fetch users: ${res.status}`);
    const users = await res.json();
    return users.find((u) => Number(u?.id) === Number(id)) || null;
}
export async function getCurrentUserFromAPI() {
    const id = decodeUserIdFromToken(getToken());
    if (!id)
        return null;
    const user = await getUserById(id);
    if (user)
        setCurrentUser(user);
    return user;
}
export async function updateUser(id, payload) {
    const res = await apiFetch(`/users/${encodeURIComponent(String(id))}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to update user: ${res.status}`);
    }
    const data = await res.json();
    setCurrentUser(data);
    return data;
}
function toUiTask(t) {
    const subtasks = [];
    const dueDate = t.milestone?.dueDate ? new Date(t.milestone.dueDate).toISOString().slice(0, 10) : undefined;
    return {
        id: String(t.id),
        title: t.title || '',
        description: t.description || '',
        status: t.status || 'backlog',
        priority: t.priority || 'medium',
        assignee: t.assignee?.username || undefined,
        dueDate,
        subtasks,
        labels: Array.isArray(t.labels) ? t.labels : [],
        dependencies: [],
        progress: 0,
    };
}
function toUiMilestone(m) {
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
function toUiProject(p, tasks = [], milestones = []) {
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
export async function listProjects() {
    const res = await apiFetch(`/projects`);
    if (!res.ok)
        throw new Error(`Failed to fetch projects: ${res.status}`);
    const data = await res.json();
    // Map without relations first
    return data.map((p) => toUiProject(p));
}
export async function listTasksForProject(projectId) {
    const res = await apiFetch(`/tasks?projectId=${encodeURIComponent(projectId)}`);
    if (!res.ok)
        throw new Error(`Failed to fetch tasks: ${res.status}`);
    const data = await res.json();
    return data.map((t) => toUiTask(t));
}
export async function listMilestonesForProject(projectId) {
    const res = await apiFetch(`/milestones?projectId=${encodeURIComponent(projectId)}`);
    if (!res.ok)
        throw new Error(`Failed to fetch milestones: ${res.status}`);
    const data = await res.json();
    return data.map((m) => toUiMilestone(m));
}
export async function getProjectWithRelations(projectId) {
    // There is no GET /projects/:id; fetch all and find
    const projects = await listProjects();
    const base = projects.find((p) => p.id === projectId);
    if (!base)
        return null;
    const [tasks, milestones] = await Promise.all([
        listTasksForProject(projectId),
        listMilestonesForProject(projectId),
    ]);
    return toUiProject({ ...base, id: Number(projectId), name: base.name, description: base.description, archived: base.status === 'archived', favorite: base.favorite, createdAt: base.startDate }, tasks, milestones);
}
export async function createProject(payload) {
    const res = await apiFetch(`/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok)
        throw new Error(`Failed to create project: ${res.status}`);
    const data = await res.json();
    return toUiProject(data);
}
export async function updateTaskStatus(taskId, status) {
    const res = await apiFetch(`/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
    });
    if (!res.ok)
        throw new Error(`Failed to update task: ${res.status}`);
    const data = await res.json();
    return toUiTask(data);
}
export async function deleteTask(taskId) {
    const res = await apiFetch(`/tasks/${encodeURIComponent(taskId)}`, {
        method: 'DELETE',
    });
    if (!res.ok)
        throw new Error(`Failed to delete task: ${res.status}`);
    const data = await res.json();
    return !!data?.ok;
}
export async function login(usernameOrEmail, password) {
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
            }
            catch { }
            throw new Error(message);
        }
        const data = await res.json();
        return data;
    }
    catch (e) {
        const msg = e?.message || 'Login failed';
        if (msg.includes('Failed to fetch')) {
            throw new Error('Network error. Check your connection.');
        }
        throw new Error(msg);
    }
}
export async function signup(payload) {
    const res = await fetch(`${API_BASE}/users/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to signup: ${res.status}`);
    }
    return res.json();
}
