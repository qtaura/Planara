import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { 
  Plus, 
  TrendingUp, 
  Calendar, 
  Github,
  Clock,
  ArrowUpRight,
  MoreHorizontal
} from 'lucide-react';

import { Project } from '../types';
import { useEffect, useState } from 'react';
import { listProjects, listTasksForProject, listMilestonesForProject } from '@lib/api';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

interface DashboardProps {
  onSelectProject: (projectId: string) => void;
  onNavigate: (view: string) => void;
  onOpenCreateProject: () => void;
}

export function Dashboard({ onSelectProject, onNavigate, onOpenCreateProject }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ tasksCompleted: number; milestonesCount: number; avgVelocity: number }>({ tasksCompleted: 0, milestonesCount: 0, avgVelocity: 0 });
  const [filter, setFilter] = useState<'active' | 'archived' | 'all'>('active');

  async function fetchProjects() {
    setLoading(true);
    setError(null);
    try {
      const ps = await listProjects();
      setProjects(ps);
      // aggregate dashboard stats from active projects only
      const active = ps.filter(p => p.status === 'active');
      let tasksCompleted = 0;
      let milestonesCount = 0;
      let velocitySum = 0;
      let velocityCount = 0;
      for (const p of active) {
        try {
          const tasks = await listTasksForProject(p.id);
          const milestones = await listMilestonesForProject(p.id);
          tasksCompleted += tasks.filter(t => t.status === 'completed').length;
          milestonesCount += milestones.length;
          const velocities = tasks.map(t => {
            const done = t.status === 'completed' ? 1 : 0;
            return done;
          });
          if (velocities.length > 0) {
            velocitySum += velocities.reduce((a, b) => a + b, 0);
            velocityCount += velocities.length;
          }
        } catch {}
      }
      const avgVelocity = velocityCount > 0 ? Math.round((velocitySum / velocityCount) * 100) / 100 : 0;
      setStats({ tasksCompleted, milestonesCount, avgVelocity });
    } catch (e: any) {
      setError(e?.message || 'Failed to load projects');
      toast.error(error || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    // pick filter from navigation
    try {
      const f = localStorage.getItem('dashboard_filter');
      if (f === 'archived' || f === 'active' || f === 'all') {
        setFilter(f as any);
        localStorage.removeItem('dashboard_filter');
      }
    } catch {}
    fetchProjects().catch(() => {});
    function onChanged() {
      if (!cancelled) fetchProjects().catch(() => {});
    }
    window.addEventListener('projects:changed', onChanged as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener('projects:changed', onChanged as EventListener);
    };
  }, []);

  const activeProjects = projects.filter(p => p.status === 'active');
  const visibleProjects = projects.filter(p => filter === 'archived' ? p.status === 'archived' : filter === 'active' ? p.status === 'active' : true);
  
  const velocityData = [
    { week: 'W1', velocity: 28 },
    { week: 'W2', velocity: 32 },
    { week: 'W3', velocity: 30 },
    { week: 'W4', velocity: 38 },
    { week: 'W5', velocity: 35 },
    { week: 'W6', velocity: 42 },
  ];

  const burndownData = [
    { day: 'Mon', remaining: 42, ideal: 42 },
    { day: 'Tue', remaining: 38, ideal: 35 },
    { day: 'Wed', remaining: 32, ideal: 28 },
    { day: 'Thu', remaining: 28, ideal: 21 },
    { day: 'Fri', remaining: 22, ideal: 14 },
  ];

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-white dark:bg-[#0A0A0A]">
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="mb-1 text-slate-900 dark:text-white">Dashboard</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            {loading && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Refreshing projects...</p>
            )}
            {error && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
            )}
          </div>
          <Button
            onClick={onOpenCreateProject}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            New project
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Active projects"
            value={activeProjects.length.toString()}
            change=""
            trend="neutral"
          />
          <StatCard
            label="Tasks completed"
            value={stats.tasksCompleted.toString()}
            change=""
            trend="neutral"
          />
          <StatCard
            label="Milestones"
            value={stats.milestonesCount.toString()}
            change=""
            trend="neutral"
          />
          <StatCard
            label="Team velocity"
            value={`${stats.avgVelocity}`}
            change=""
            trend="up"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-900 dark:text-white">Team Velocity</p>
              <Button variant="ghost" size="sm" className="h-8 text-slate-600 dark:text-slate-400">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={velocityData}>
                <defs>
                  <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                <XAxis dataKey="week" tick={{ fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: 'white', border: 'none' }} />
                <Area type="monotone" dataKey="velocity" stroke="#6366f1" fill="url(#velocityGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-900 dark:text-white">Burndown</p>
              <Button variant="ghost" size="sm" className="h-8 text-slate-600 dark:text-slate-400">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                <XAxis dataKey="day" tick={{ fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis tick={{ fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: 'white', border: 'none' }} />
                <Line type="monotone" dataKey="remaining" stroke="#f59e0b" />
                <Line type="monotone" dataKey="ideal" stroke="#10b981" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Active Projects */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-900 dark:text-white">Active projects</p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-8 text-slate-600 dark:text-slate-400">
                <Github className="h-4 w-4" />
                <span className="ml-2">Import from GitHub</span>
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-slate-600 dark:text-slate-400">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {visibleProjects.length === 0 ? (
            <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-8">
              <p className="text-slate-600 dark:text-slate-400">No projects yet</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {visibleProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => {
                    onSelectProject(project.id);
                    onNavigate('project');
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
}

function StatCard({ label, value, change, trend }: StatCardProps) {
  return (
    <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-5">
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
        {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-500" />}
      </div>
      <div>
        <p className="text-2xl text-slate-900 dark:text-white mb-1">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{change}</p>
      </div>
    </Card>
  );
}

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

function ProjectCard({ project, onClick }: ProjectCardProps) {
  const daysRemaining = Math.ceil(
    (new Date(project.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <button
      onClick={onClick}
      className="text-left w-full"
    >
      <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <h3 className="text-slate-900 dark:text-white">{project.name}</h3>
          </div>
          {project.githubLinked && (
            <Github className="w-4 h-4 text-slate-400" />
          )}
        </div>
        
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">{project.description}</p>
        
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Progress</span>
              <span className="text-xs text-slate-600 dark:text-slate-400">{project.progress}%</span>
            </div>
            <Progress value={project.progress} className="h-1.5" />
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Clock className="w-3 h-3" />
              <span>{daysRemaining}d left</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <Calendar className="w-3 h-3" />
              <span>{project.milestones.length} milestones</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            {project.members.slice(0, 3).map((member, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-600 dark:text-slate-300"
              >
                {member.charAt(0)}
              </div>
            ))}
            {project.members.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                +{project.members.length - 3}
              </div>
            )}
          </div>
        </div>
      </Card>
    </button>
  );
}
