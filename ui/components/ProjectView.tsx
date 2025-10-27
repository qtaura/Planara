import { useEffect, useState } from 'react';
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

import { getProjectWithRelations } from '@lib/api';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from './ui/avatar';

interface ProjectViewProps {
  projectId: string;
  onContext?: (ctx: { teamId?: number | null }) => void;
  onTaskContext?: (ctx: { activeTaskId?: number | null; activeThreadId?: number | null }) => void;
}

export function ProjectView({ projectId, onContext, onTaskContext }: ProjectViewProps) {
  const [activeTab, setActiveTab] = useState('roadmap');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [presentUsers, setPresentUsers] = useState<number[]>([]);

  async function refreshProject() {
    setLoading(true);
    setError(null);
    try {
      const p = await getProjectWithRelations(projectId);
      setProject(p || null);
      const teamId = p?.team?.id ?? null;
      onContext?.({ teamId });
    } catch (e: any) {
      setError(e?.message || 'Failed to load project');
      toast.error(error || 'Failed to load project');
      setProject(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    refreshProject().catch(() => {});
    function onTasksChanged() {
      if (!cancelled) refreshProject().catch(() => {});
    }
    function onProjectsChanged() {
      if (!cancelled) refreshProject().catch(() => {});
    }
    window.addEventListener('tasks:changed', onTasksChanged as EventListener);
    window.addEventListener('projects:changed', onProjectsChanged as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener('tasks:changed', onTasksChanged as EventListener);
      window.removeEventListener('projects:changed', onProjectsChanged as EventListener);
    };
  }, [projectId]);

  useEffect(() => {
    function onPresence(e: any) {
      const detail = e?.detail || e;
      const expectedRoom = `project:${Number(projectId)}`;
      if (detail?.room === expectedRoom && Array.isArray(detail?.users)) {
        setPresentUsers(detail.users as number[]);
      }
    }
    window.addEventListener('presence:update', onPresence as EventListener);
    return () => window.removeEventListener('presence:update', onPresence as EventListener);
  }, [projectId]);

  // Propagate selected task id to parent for assistant context
  useEffect(() => {
    const tid = selectedTask ? Number(selectedTask.id) : null;
    onTaskContext?.({ activeTaskId: tid });
  }, [selectedTask]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-[#0A0A0A]">
        <p className="text-slate-400">Loading project...</p>
      </div>
    );
  }

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
              <div className="w-2 h-8 rounded-full" style={{ backgroundColor: project.color }} />
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-slate-900 dark:text-white">{project.name}</h1>
                  {project.favorite && <Star className="w-4 h-4 fill-amber-400 text-amber-400" />}
                  {project.githubLinked && (
                    <Badge
                      variant="outline"
                      className="border-green-500 text-green-600 dark:text-green-400"
                    >
                      <Github className="w-3 h-3 mr-1 inline" /> Linked
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
                  {project.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {presentUsers.slice(0, 5).map((uid) => (
                  <Avatar key={uid} className="h-6 w-6 border border-white dark:border-slate-800">
                    <AvatarFallback className="text-[10px]">{String(uid)}</AvatarFallback>
                  </Avatar>
                ))}
                {presentUsers.length > 5 && (
                  <Avatar className="h-6 w-6 border border-white dark:border-slate-800">
                    <AvatarFallback className="text-[10px]">
                      +{presentUsers.length - 5}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
              <Button variant="outline" size="sm">
                <Users className="w-4 h-4 mr-2" /> Share
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" /> Settings
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Progress</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Q3</span>
              </div>
              <Progress value={45} className="h-2" />
            </div>

            <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Upcoming milestones
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Alpha release</span>
                  <Badge variant="outline">Sep 15</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Beta release</span>
                  <Badge variant="outline">Oct 30</Badge>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <ListTodo className="w-4 h-4 text-indigo-600" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Open tasks</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">High priority</span>
                  <Badge variant="outline">12</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Overdue</span>
                  <Badge variant="outline">3</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
          </TabsList>
          <TabsContent value="roadmap">
            <RoadmapView projectId={projectId} />
          </TabsContent>
          <TabsContent value="kanban">
            <KanbanView projectId={projectId} onOpenTask={(t) => setSelectedTask(t)} />
          </TabsContent>
          <TabsContent value="calendar">
            <CalendarView projectId={projectId} />
          </TabsContent>
          <TabsContent value="files">
            <FilesView projectId={projectId} />
          </TabsContent>
        </Tabs>
      </div>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          teamId={project?.team?.id ?? null}
          onActiveThreadChange={(threadId) => onTaskContext?.({ activeThreadId: threadId })}
        />
      )}
    </div>
  );
}
