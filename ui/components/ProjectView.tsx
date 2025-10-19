import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import {
  Settings,
  Github,
  Users,
  MoreHorizontal,
  Star,
  TrendingUp,
  Calendar,
  ListTodo,
} from 'lucide-react';
import { KanbanView } from './KanbanView';
import { RoadmapView } from './RoadmapView';
import { CalendarView } from './CalendarView';
import { FilesView } from './FilesView';
import { TaskModal } from './TaskModal';
import { Project, Task } from '../types';
import { mockProjects } from '../data/mockData';

interface ProjectViewProps {
  projectId: string;
}

export function ProjectView({ projectId }: ProjectViewProps) {
  const [activeTab, setActiveTab] = useState('roadmap');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const project = mockProjects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-[#0A0A0A]">
        <p className="text-slate-400">Project not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-white dark:bg-[#0A0A0A]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-2 h-8 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-slate-900 dark:text-white">{project.name}</h1>
                  {project.favorite && (
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  )}
                  {project.githubLinked && (
                    <Badge
                      variant="outline"
                      className="border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                    >
                      <Github className="w-3 h-3 mr-1" />
                      Synced
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{project.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Users className="w-4 h-4 mr-2" />
                {project.members.length}
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Progress"
              value={`${project.progress}%`}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <StatCard
              label="Tasks"
              value={project.tasks.length.toString()}
              icon={<ListTodo className="w-4 h-4" />}
            />
            <StatCard
              label="Milestones"
              value={project.milestones.length.toString()}
              icon={<Calendar className="w-4 h-4" />}
            />
            <StatCard
              label="Velocity"
              value={project.velocity.toString()}
              icon={<TrendingUp className="w-4 h-4" />}
            />
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-600 dark:text-slate-400">Overall progress</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(project.startDate).toLocaleDateString()} -{' '}
                {new Date(project.endDate).toLocaleDateString()}
              </span>
            </div>
            <Progress value={project.progress} className="h-1.5" />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-slate-100 dark:bg-slate-900/50 border-0">
              <TabsTrigger value="roadmap" className="text-sm">Roadmap</TabsTrigger>
              <TabsTrigger value="kanban" className="text-sm">Tasks</TabsTrigger>
              <TabsTrigger value="calendar" className="text-sm">Calendar</TabsTrigger>
              <TabsTrigger value="files" className="text-sm">Files</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <Tabs value={activeTab}>
          <TabsContent value="roadmap" className="mt-0">
            <RoadmapView milestones={project.milestones} />
          </TabsContent>

          <TabsContent value="kanban" className="mt-0">
            <KanbanView
              tasks={project.tasks}
              onTaskClick={(task) => setSelectedTask(task)}
            />
          </TabsContent>

          <TabsContent value="calendar" className="mt-0">
            <CalendarView
              tasks={project.tasks}
              milestones={project.milestones}
              onTaskClick={(task) => setSelectedTask(task)}
            />
          </TabsContent>

          <TabsContent value="files" className="mt-0">
            <FilesView />
          </TabsContent>
        </Tabs>
      </div>

      {/* Task Modal */}
      <TaskModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400">
          {icon}
        </div>
        <div>
          <p className="text-xl text-slate-900 dark:text-white">{value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </div>
    </div>
  );
}
