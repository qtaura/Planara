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
import { mockProjects } from '../data/mockData';
import { Project } from '../types';
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
  const activeProjects = mockProjects.filter(p => p.status === 'active');
  
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
            change="+2 this month"
            trend="up"
          />
          <StatCard
            label="Tasks completed"
            value="124"
            change="+18 this week"
            trend="up"
          />
          <StatCard
            label="Milestones"
            value="8"
            change="3 upcoming"
            trend="neutral"
          />
          <StatCard
            label="Team velocity"
            value="35"
            change="+12%"
            trend="up"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-slate-900 dark:text-white">Velocity trend</h3>
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
                <XAxis 
                  dataKey="week" 
                  stroke="#94a3b8" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="velocity" 
                  stroke="#6366f1" 
                  fill="url(#velocityGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-slate-900 dark:text-white">Sprint burndown</h3>
              <Button variant="ghost" size="sm" className="h-8 text-slate-600 dark:text-slate-400">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.3} />
                <XAxis 
                  dataKey="day" 
                  stroke="#94a3b8" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="remaining" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  dot={{ fill: '#6366f1', r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ideal" 
                  stroke="#94a3b8" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Projects Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-900 dark:text-white">Projects</h2>
            <Button variant="ghost" className="text-sm text-slate-600 dark:text-slate-400">
              View all
              <ArrowUpRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeProjects.map((project) => (
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
