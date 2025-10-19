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
  status?: "todo" | "in_progress" | "done";
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