import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Settings, Github, Users, MoreHorizontal, Star, TrendingUp, Calendar, ListTodo, } from 'lucide-react';
import { KanbanView } from './KanbanView';
import { RoadmapView } from './RoadmapView';
import { CalendarView } from './CalendarView';
import { FilesView } from './FilesView';
import { TaskModal } from './TaskModal';
import { getProjectWithRelations } from '@lib/api';
import { toast } from 'sonner';
export function ProjectView({ projectId }) {
    const [activeTab, setActiveTab] = useState('roadmap');
    const [selectedTask, setSelectedTask] = useState(null);
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    async function refreshProject() {
        setLoading(true);
        setError(null);
        try {
            const p = await getProjectWithRelations(projectId);
            setProject(p || null);
        }
        catch (e) {
            setError(e?.message || 'Failed to load project');
            toast.error(error || 'Failed to load project');
            setProject(null);
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        let cancelled = false;
        refreshProject().catch(() => { });
        function onTasksChanged() { if (!cancelled)
            refreshProject().catch(() => { }); }
        function onProjectsChanged() { if (!cancelled)
            refreshProject().catch(() => { }); }
        window.addEventListener('tasks:changed', onTasksChanged);
        window.addEventListener('projects:changed', onProjectsChanged);
        return () => {
            cancelled = true;
            window.removeEventListener('tasks:changed', onTasksChanged);
            window.removeEventListener('projects:changed', onProjectsChanged);
        };
    }, [projectId]);
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center h-screen bg-white dark:bg-[#0A0A0A]", children: _jsx("p", { className: "text-slate-400", children: "Loading project..." }) }));
    }
    if (!project) {
        return (_jsx("div", { className: "flex items-center justify-center h-screen bg-white dark:bg-[#0A0A0A]", children: _jsx("p", { className: "text-slate-400", children: "Project not found" }) }));
    }
    return (_jsxs("div", { className: "flex-1 h-screen overflow-y-auto bg-white dark:bg-[#0A0A0A]", children: [_jsx("div", { className: "sticky top-0 z-20 bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800", children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex items-start justify-between mb-6", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-2 h-8 rounded-full", style: { backgroundColor: project.color } }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("h1", { className: "text-slate-900 dark:text-white", children: project.name }), project.favorite && (_jsx(Star, { className: "w-4 h-4 fill-amber-400 text-amber-400" })), project.githubLinked && (_jsxs(Badge, { variant: "outline", className: "border-green-500 text-green-600 dark:text-green-400", children: [_jsx(Github, { className: "w-3 h-3 mr-1 inline" }), " Linked"] }))] }), _jsx("p", { className: "text-sm text-slate-600 dark:text-slate-400 max-w-2xl", children: project.description })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Button, { variant: "outline", size: "sm", children: [_jsx(Users, { className: "w-4 h-4 mr-2" }), " Share"] }), _jsxs(Button, { variant: "outline", size: "sm", children: [_jsx(Settings, { className: "w-4 h-4 mr-2" }), " Settings"] }), _jsx(Button, { variant: "outline", size: "icon", children: _jsx(MoreHorizontal, { className: "w-4 h-4" }) })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-3 mb-6", children: [_jsx(StatCard, { label: "Progress", value: `${project.progress}%`, icon: _jsx(TrendingUp, { className: "w-4 h-4" }) }), _jsx(StatCard, { label: "Tasks", value: project.tasks.length.toString(), icon: _jsx(ListTodo, { className: "w-4 h-4" }) }), _jsx(StatCard, { label: "Milestones", value: project.milestones.length.toString(), icon: _jsx(Calendar, { className: "w-4 h-4" }) }), _jsx(StatCard, { label: "Velocity", value: project.velocity.toString(), icon: _jsx(TrendingUp, { className: "w-4 h-4" }) })] }), _jsxs("div", { className: "mb-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-xs text-slate-600 dark:text-slate-400", children: "Overall progress" }), _jsxs("span", { className: "text-xs text-slate-500 dark:text-slate-400", children: [new Date(project.startDate).toLocaleDateString(), " -", ' ', new Date(project.endDate).toLocaleDateString()] })] }), _jsx(Progress, { value: project.progress, className: "h-1.5" })] }), _jsx(Tabs, { value: activeTab, onValueChange: setActiveTab, children: _jsxs(TabsList, { className: "bg-slate-100 dark:bg-slate-900/50 border-0", children: [_jsx(TabsTrigger, { value: "roadmap", className: "text-sm", children: "Roadmap" }), _jsx(TabsTrigger, { value: "kanban", className: "text-sm", children: "Tasks" }), _jsx(TabsTrigger, { value: "calendar", className: "text-sm", children: "Calendar" }), _jsx(TabsTrigger, { value: "files", className: "text-sm", children: "Files" })] }) })] }) }), _jsx("div", { className: "p-6", children: _jsxs(Tabs, { value: activeTab, children: [_jsx(TabsContent, { value: "roadmap", className: "mt-0", children: _jsx(RoadmapView, { milestones: project.milestones }) }), _jsx(TabsContent, { value: "kanban", className: "mt-0", children: _jsx(KanbanView, { tasks: project.tasks, onTaskClick: (task) => setSelectedTask(task) }) }), _jsx(TabsContent, { value: "calendar", className: "mt-0", children: _jsx(CalendarView, { tasks: project.tasks, milestones: project.milestones, onTaskClick: (task) => setSelectedTask(task) }) }), _jsx(TabsContent, { value: "files", className: "mt-0", children: _jsx(FilesView, {}) })] }) }), _jsx(TaskModal, { task: selectedTask, isOpen: !!selectedTask, onClose: () => setSelectedTask(null) })] }));
}
function StatCard({ label, value, icon }) {
    return (_jsx("div", { className: "p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-lg", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400", children: icon }), _jsxs("div", { children: [_jsx("p", { className: "text-xl text-slate-900 dark:text-white", children: value }), _jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: label })] })] }) }));
}
