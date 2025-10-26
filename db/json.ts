import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

export type ID = string;

export interface User {
  id: ID;
  name: string;
  avatar?: string;
}

export interface Task {
  id: ID;
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done';
  assigneeId?: ID;
  projectId?: ID;
}

export interface Project {
  id: ID;
  name: string;
  color?: string;
  favorite?: boolean;
  githubLinked?: boolean;
}

export interface DB {
  users: User[];
  projects: Project[];
  tasks: Task[];
}

const DB_DIR = path.resolve('db');
const DB_FILE = path.join(DB_DIR, 'data.json');

let store: DB | null = null;

function defaultDB(): DB {
  return { users: [], projects: [], tasks: [] };
}

export async function ensureInitialized(): Promise<void> {
  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR);
  }
  if (!existsSync(DB_FILE)) {
    writeFileSync(DB_FILE, JSON.stringify(defaultDB(), null, 2), 'utf-8');
  }
  if (!store) {
    const raw = readFileSync(DB_FILE, 'utf-8');
    try {
      store = JSON.parse(raw) as DB;
    } catch {
      store = defaultDB();
      writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
    }
  }
}

function save() {
  if (!store) throw new Error('DB not initialized');
  writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

export function getAll<T extends keyof DB>(collection: T): DB[T] {
  if (!store) throw new Error('DB not initialized');
  return store[collection];
}

export function getById<T extends keyof DB>(collection: T, id: ID): DB[T][number] | undefined {
  if (!store) throw new Error('DB not initialized');
  // @ts-expect-error generic index
  return store[collection].find((item) => item.id === id);
}

export function create<T extends keyof DB>(collection: T, item: DB[T][number]): DB[T][number] {
  if (!store) throw new Error('DB not initialized');
  // @ts-expect-error generic index
  store[collection].push(item);
  save();
  return item;
}

export function update<T extends keyof DB>(
  collection: T,
  id: ID,
  patch: Partial<DB[T][number]>
): DB[T][number] | undefined {
  if (!store) throw new Error('DB not initialized');
  // @ts-expect-error generic index
  const list = store[collection];
  const idx = list.findIndex((item) => item.id === id);
  if (idx === -1) return undefined;
  const updated = { ...list[idx], ...patch };
  // @ts-expect-error generic index
  list[idx] = updated;
  save();
  return updated;
}

export function remove<T extends keyof DB>(collection: T, id: ID): boolean {
  if (!store) throw new Error('DB not initialized');
  // @ts-expect-error generic index
  const list = store[collection];
  const initial = list.length;
  // @ts-expect-error generic index
  store[collection] = list.filter((item) => item.id !== id);
  const changed = list.length !== initial;
  if (changed) save();
  return changed;
}