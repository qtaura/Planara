import { 
  LayoutDashboard, 
  FolderKanban, 
  Star, 
  Archive, 
  Users, 
  Bell, 
  Settings, 
  Plus,
  Search
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Input } from './ui/input';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { mockProjects, mockUser } from '../data/mockData';
import { Project } from '../types';
import { useEffect, useState } from 'react';
import { listProjects } from '@lib/api';

interface AppSidebarProps {
  activeView: string;
  activeProject: string | null;
  onNavigate: (view: string) => void;
  onSelectProject: (projectId: string) => void;
  onOpenCreateProject: () => void;
}

export function AppSidebar({ 
  activeView, 
  activeProject, 
  onNavigate, 
  onSelectProject,
  onOpenCreateProject 
}: AppSidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  useEffect(() => {
    let cancelled = false;
    listProjects()
      .then((ps) => {
        if (!cancelled) setProjects(ps);
      })
      .catch(() => {
        // fallback to mock
      });
    return () => { cancelled = true; };
  }, []);
  const activeProjects = (projects.length ? projects : mockProjects).filter(p => p.status === 'active');
  const favoriteProjects = activeProjects.filter(p => p.favorite);

  return (
    <div className="w-64 h-screen bg-white dark:bg-[#0A0A0A] border-r border-slate-200 dark:border-slate-800/50 flex flex-col">
      {/* Logo & User */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/50">
        <div className="flex items-center justify-between mb-4">
          <Logo size="sm" />
          <ThemeToggle />
        </div>
        
        <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 w-full transition-colors">
          <Avatar className="h-6 w-6">
            <AvatarImage src={mockUser.avatar} />
            <AvatarFallback className="text-xs">AC</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm text-slate-900 dark:text-white truncate">{mockUser.name}</p>
          </div>
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800/50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search..."
            className="pl-9 h-9 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700/50 text-sm"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-3">
        <div className="px-3 space-y-0.5 mb-4">
          <NavItem
            icon={<LayoutDashboard className="w-4 h-4" />}
            label="Dashboard"
            active={activeView === 'dashboard'}
            onClick={() => onNavigate('dashboard')}
          />
          <NavItem
            icon={<Bell className="w-4 h-4" />}
            label="Notifications"
            badge="3"
            onClick={() => {}}
          />
          <NavItem
            icon={<Users className="w-4 h-4" />}
            label="Team"
            onClick={() => {}}
          />
        </div>

        {/* Favorites */}
        {favoriteProjects.length > 0 && (
          <div className="px-3 mb-4">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Favorites</span>
            </div>
            <div className="space-y-0.5">
              {favoriteProjects.map((project) => (
                <ProjectItem
                  key={project.id}
                  project={project}
                  active={activeProject === project.id}
                  onClick={() => {
                    onSelectProject(project.id);
                    onNavigate('project');
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Projects */}
        <div className="px-3">
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Projects</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={onOpenCreateProject}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-0.5">
            {activeProjects.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                active={activeProject === project.id}
                onClick={() => {
                  onSelectProject(project.id);
                  onNavigate('project');
                }}
              />
            ))}
          </div>
        </div>

        <div className="px-3 mt-4 space-y-0.5">
          <NavItem
            icon={<Archive className="w-4 h-4" />}
            label="Archived"
            onClick={() => {}}
          />
        </div>
      </div>

      {/* Bottom */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800/50">
        <NavItem
          icon={<Settings className="w-4 h-4" />}
          label="Settings"
          active={activeView === 'settings'}
          onClick={() => onNavigate('settings')}
        />
      </div>
    </div>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: string;
  onClick: () => void;
}

function NavItem({ icon, label, active, badge, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors text-sm ${
        active
          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="text-xs bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded">
          {badge}
        </span>
      )}
    </button>
  );
}

interface ProjectItemProps {
  project: Project;
  active: boolean;
  onClick: () => void;
}

function ProjectItem({ project, active, onClick }: ProjectItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-md transition-colors text-sm ${
        active
          ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
      }`}
    >
      <div
        className="w-2 h-2 rounded-sm flex-shrink-0"
        style={{ backgroundColor: project.color }}
      />
      <span className="flex-1 text-left truncate">{project.name}</span>
      {project.githubLinked && (
        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
      )}
    </button>
  );
}
