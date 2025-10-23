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
import { API_BASE, setToken, setCurrentUser } from '@lib/api';
import { CreateProjectModal } from './CreateProjectModal';
import { GitHubRepoPicker } from './GitHubRepoPicker';

interface DashboardProps {
  onNavigate: (view: string) => void;
  onSelectProject: (projectId: string) => void;
}

export function Dashboard({ onNavigate, onSelectProject }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [githubAccessToken, setGithubAccessToken] = useState<string | null>(null);
  const [repoPickerOpen, setRepoPickerOpen] = useState<boolean>(false);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const data = (e && (e as any).data) || null;
      if (data && data.type === 'oauth' && (data.token || data.verificationRequired)) {
        try {
          if (data.token) setToken(data.token);
          if (data.user) setCurrentUser(data.user);
        } catch {}
        if (data.verificationRequired) {
          toast.message('Verify your email to complete sign-in');
          try { window.dispatchEvent(new CustomEvent('auth:needs_verification')); } catch {}
        } else {
          toast.success(`Welcome, ${data.user?.username || data.user?.email || 'user'}!`);
          try { window.dispatchEvent(new CustomEvent('auth:logged_in')); } catch {}
        }
        if (data.provider === 'github' && data.accessToken) {
          setGithubAccessToken(String(data.accessToken));
          setRepoPickerOpen(true);
        }
      }
    };
    window.addEventListener('message', handler as any);
    return () => window.removeEventListener('message', handler as any);
  }, []);

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const ps = await listProjects();
      setProjects(ps.map((p) => ({ ...p } as any)));
    } catch (e: any) {
      setError(e?.message || 'Failed to load dashboard');
      toast.error(e?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll().catch(() => {});
  }, []);

  function startProvider(provider: 'github' | 'google' | 'slack') {
    if (provider === 'github' && githubAccessToken) {
      setRepoPickerOpen(true);
      return;
    }
    const url = `${API_BASE}/users/oauth/${provider}/start?origin=${encodeURIComponent(window.location.origin)}`;
    window.open(url, 'oauth', 'width=600,height=700');
  }

  const burndownData = [
    { day: 'Mon', remaining: 24, ideal: 22 },
    { day: 'Tue', remaining: 20, ideal: 18 },
    { day: 'Wed', remaining: 17, ideal: 15 },
    { day: 'Thu', remaining: 14, ideal: 11 },
    { day: 'Fri', remaining: 10, ideal: 8 },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg text-slate-900 dark:text-white">Overview</h1>
        <div className="flex items-center gap-2">
          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => setCreateProjectOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New project
          </Button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-900 dark:text-white">Velocity</p>
            <Button variant="ghost" size="sm" className="h-8 text-slate-600 dark:text-slate-400">
              <TrendingUp className="h-4 w-4" />
              <span className="ml-2">View report</span>
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={burndownData}>
              <defs>
                <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
              <YAxis tick={{ fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: 'white', border: 'none' }} />
              <Area type="monotone" dataKey="remaining" stroke="#6366f1" fillOpacity={1} fill="url(#colorPv)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-900 dark:text-white">Upcoming milestones</p>
            <Button variant="ghost" size="sm" className="h-8 text-slate-600 dark:text-slate-400">
              <Calendar className="h-4 w-4" />
              <span className="ml-2">View calendar</span>
            </Button>
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-sm bg-indigo-500" />
                  <p className="text-slate-900 dark:text-white">Milestone {i}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">in {2 * i} days</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-900 dark:text-white">Product health</p>
            <Button variant="ghost" size="sm" className="h-8 text-slate-600 dark:text-slate-400">
              <ArrowUpRight className="h-4 w-4" />
              <span className="ml-2">View details</span>
            </Button>
          </div>
          <Progress value={66} />
        </Card>
      </div>

      {/* Active Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-slate-900 dark:text-white">Active projects</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 text-slate-600 dark:text-slate-400" onClick={() => startProvider('github')}>
              <Github className="h-4 w-4" />
              <span className="ml-2">Import from GitHub</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="p-4 cursor-pointer"
                onClick={() => {
                  onSelectProject(project.id);
                  // removed extra onNavigate to avoid double navigation
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: project.color }} />
                    <p className="text-slate-900 dark:text-white">{project.name}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 text-slate-600 dark:text-slate-400">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={[{ day: 'Mon', remaining: 10, ideal: 8 }, { day: 'Tue', remaining: 8, ideal: 6 }, { day: 'Wed', remaining: 6, ideal: 4 }, { day: 'Thu', remaining: 4, ideal: 2 }, { day: 'Fri', remaining: 2, ideal: 0 }] }>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                    <XAxis dataKey="day" tick={{ fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                    <YAxis tick={{ fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: 'white', border: 'none' }} />
                    <Line type="monotone" dataKey="remaining" stroke="#f59e0b" />
                    <Line type="monotone" dataKey="ideal" stroke="#10b981" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        onCreate={() => {
          setCreateProjectOpen(false);
          fetchAll();
        }}
      />

      <GitHubRepoPicker
        isOpen={repoPickerOpen}
        accessToken={githubAccessToken}
        onClose={() => setRepoPickerOpen(false)}
        onLinked={() => {
          setRepoPickerOpen(false);
          fetchAll();
          toast.success('Repository linked to new project');
        }}
      />
    </div>
  );
}
