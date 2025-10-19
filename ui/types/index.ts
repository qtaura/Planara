export type ViewType = 
  | 'landing' 
  | 'onboarding' 
  | 'dashboard' 
  | 'project' 
  | 'settings';

export type ProjectTab = 'roadmap' | 'kanban' | 'calendar' | 'files';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  theme: 'dark' | 'light';
  xp: number;
  level: number;
  streak: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'in-progress' | 'review' | 'qa' | 'done';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  dueDate?: string;
  subtasks: SubTask[];
  labels: string[];
  dependencies: string[];
  progress: number;
  aiSuggested?: boolean;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  progress: number;
  color: string;
  tasks: string[];
  dependencies: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  progress: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'archived' | 'completed';
  favorite: boolean;
  githubLinked: boolean;
  tasks: Task[];
  milestones: Milestone[];
  members: string[];
  velocity: number;
}
