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
  MoreHorizontal,
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
          const email = data.email || data.user?.email;
          const needsUsername = !!data.created;
          try {
            window.dispatchEvent(
              new CustomEvent('auth:needs_verification', {
                detail: { email, needsUsername, provider: data.provider },
              })
            );
          } catch {}
        } else {
          toast.success(`Welcome, ${data.user?.username || data.user?.email || 'user'}!`);
          try {
            window.dispatchEvent(new CustomEvent('auth:logged_in'));
          } catch {}
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
      setProjects(ps);
      if (ps.length === 0) {
        // Suggest creating a project
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load projects');
      toast.error(error || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll().catch(() => {});
  }, []);

  function startProvider(provider: 'github' | 'google' | 'slack') {
    // Always start OAuth to allow switching accounts and refreshing tokens
    const url = `${API_BASE}/users/oauth/${provider}/start?origin=${encodeURIComponent(window.location.origin)}`;
    window.open(url, 'oauth', 'width=600,height=700');
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Welcome back</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Here's what's happening with your projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9" onClick={() => setCreateProjectOpen(true)}>
            <Plus className="h-4 w-4" />
            <span className="ml-2">Create project</span>
          </Button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-900 dark:text-white">Velocity</p>
            <Button variant="ghost" size="sm" className="h-8 text-slate-600 dark:text-slate-400">
              <ArrowUpRight className="h-4 w-4" />
              <span className="ml-2">View details</span>
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart
              data={Array.from({ length: 10 }).map((_, i) => ({
                name: `Week ${i + 1}`,
                value: Math.round(50 + Math.random() * 50),
              }))}
            >
              <defs>
                <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
              <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8' }} />
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#6366f1"
                fillOpacity={1}
                fill="url(#colorPv)"
              />
            </AreaChart>
          </ResponsiveContainer>
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
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-slate-600 dark:text-slate-400"
              onClick={() => startProvider('github')}
            >
              <Github className="h-4 w-4" />
              <span className="ml-2">Import from GitHub</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading projects…</p>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : projects.length === 0 ? (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-slate-900 dark:text-white">No active projects</p>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => setCreateProjectOpen(true)}
              >
                <Plus className="h-4 w-4" />
                <span className="ml-2">Create</span>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.slice(0, 6).map((project, i) => (
              <Card key={project.id} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-slate-900 dark:text-white">{project.name}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-slate-600 dark:text-slate-400"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {project.description || 'No description'}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {Math.round(Math.random() * 100)}% complete
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      onSelectProject(String(project.id));
                      onNavigate('project');
                    }}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    <span className="ml-2">Open</span>
                  </Button>
                </div>
                <div className="mt-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-t border-slate-200 dark:border-slate-800/50"
                    >
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <p className="text-slate-900 dark:text-white">Milestone {i}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          in {2 * i} days
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
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
