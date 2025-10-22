import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Plus, TrendingUp, Calendar, Github, Clock, MoreHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { listProjects, listTasksForProject, listMilestonesForProject } from '@lib/api';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, } from 'recharts';
export function Dashboard({ onSelectProject, onNavigate, onOpenCreateProject }) {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({ tasksCompleted: 0, milestonesCount: 0, avgVelocity: 0 });
    const [filter, setFilter] = useState('active');
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
                }
                catch { }
            }
            const avgVelocity = velocityCount > 0 ? Math.round((velocitySum / velocityCount) * 100) / 100 : 0;
            setStats({ tasksCompleted, milestonesCount, avgVelocity });
        }
        catch (e) {
            setError(e?.message || 'Failed to load projects');
            toast.error(error || 'Failed to load projects');
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        let cancelled = false;
        // pick filter from navigation
        try {
            const f = localStorage.getItem('dashboard_filter');
            if (f === 'archived' || f === 'active' || f === 'all') {
                setFilter(f);
                localStorage.removeItem('dashboard_filter');
            }
        }
        catch { }
        fetchProjects().catch(() => { });
        function onChanged() {
            if (!cancelled)
                fetchProjects().catch(() => { });
        }
        window.addEventListener('projects:changed', onChanged);
        return () => {
            cancelled = true;
            window.removeEventListener('projects:changed', onChanged);
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
    return (_jsx("div", { className: "flex-1 h-screen overflow-y-auto bg-white dark:bg-[#0A0A0A]", children: _jsxs("div", { className: "p-8", children: [_jsxs("div", { className: "flex items-center justify-between mb-10", children: [_jsxs("div", { children: [_jsx("h1", { className: "mb-1 text-slate-900 dark:text-white", children: "Dashboard" }), _jsx("p", { className: "text-sm text-slate-600 dark:text-slate-400", children: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) }), loading && (_jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 mt-1", children: "Refreshing projects..." })), error && (_jsx("p", { className: "text-xs text-red-600 dark:text-red-400 mt-1", children: error }))] }), _jsxs(Button, { onClick: onOpenCreateProject, className: "bg-indigo-600 hover:bg-indigo-700 text-white", children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), "New project"] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4 mb-8", children: [_jsx(StatCard, { label: "Active projects", value: activeProjects.length.toString(), change: "", trend: "neutral" }), _jsx(StatCard, { label: "Tasks completed", value: stats.tasksCompleted.toString(), change: "", trend: "neutral" }), _jsx(StatCard, { label: "Milestones", value: stats.milestonesCount.toString(), change: "", trend: "neutral" }), _jsx(StatCard, { label: "Team velocity", value: `${stats.avgVelocity}`, change: "", trend: "up" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-8", children: [_jsxs(Card, { className: "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("p", { className: "text-slate-900 dark:text-white", children: "Team Velocity" }), _jsx(Button, { variant: "ghost", size: "sm", className: "h-8 text-slate-600 dark:text-slate-400", children: _jsx(MoreHorizontal, { className: "h-4 w-4" }) })] }), _jsx(ResponsiveContainer, { width: "100%", height: 180, children: _jsxs(AreaChart, { data: velocityData, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "velocityGradient", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#6366f1", stopOpacity: 0.1 }), _jsx("stop", { offset: "95%", stopColor: "#6366f1", stopOpacity: 0 })] }) }), _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e2e8f0", strokeOpacity: 0.3 }), _jsx(XAxis, { dataKey: "week", tick: { fill: '#64748b' }, tickLine: false, axisLine: { stroke: '#e2e8f0' } }), _jsx(YAxis, { tick: { fill: '#64748b' }, tickLine: false, axisLine: { stroke: '#e2e8f0' } }), _jsx(Tooltip, { contentStyle: { backgroundColor: '#0f172a', color: 'white', border: 'none' } }), _jsx(Area, { type: "monotone", dataKey: "velocity", stroke: "#6366f1", fill: "url(#velocityGradient)" })] }) })] }), _jsxs(Card, { className: "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("p", { className: "text-slate-900 dark:text-white", children: "Burndown" }), _jsx(Button, { variant: "ghost", size: "sm", className: "h-8 text-slate-600 dark:text-slate-400", children: _jsx(MoreHorizontal, { className: "h-4 w-4" }) })] }), _jsx(ResponsiveContainer, { width: "100%", height: 180, children: _jsxs(LineChart, { data: burndownData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e2e8f0", strokeOpacity: 0.3 }), _jsx(XAxis, { dataKey: "day", tick: { fill: '#64748b' }, tickLine: false, axisLine: { stroke: '#e2e8f0' } }), _jsx(YAxis, { tick: { fill: '#64748b' }, tickLine: false, axisLine: { stroke: '#e2e8f0' } }), _jsx(Tooltip, { contentStyle: { backgroundColor: '#0f172a', color: 'white', border: 'none' } }), _jsx(Line, { type: "monotone", dataKey: "remaining", stroke: "#f59e0b" }), _jsx(Line, { type: "monotone", dataKey: "ideal", stroke: "#10b981" })] }) })] })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("p", { className: "text-slate-900 dark:text-white", children: "Active projects" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Button, { variant: "ghost", size: "sm", className: "h-8 text-slate-600 dark:text-slate-400", children: [_jsx(Github, { className: "h-4 w-4" }), _jsx("span", { className: "ml-2", children: "Import from GitHub" })] }), _jsx(Button, { variant: "ghost", size: "sm", className: "h-8 text-slate-600 dark:text-slate-400", children: _jsx(MoreHorizontal, { className: "h-4 w-4" }) })] })] }), visibleProjects.length === 0 ? (_jsx(Card, { className: "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-8", children: _jsx("p", { className: "text-slate-600 dark:text-slate-400", children: "No projects yet" }) })) : (_jsx("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", children: visibleProjects.map((project) => (_jsx(ProjectCard, { project: project, onClick: () => {
                                    onSelectProject(project.id);
                                    onNavigate('project');
                                } }, project.id))) }))] })] }) }));
}
function StatCard({ label, value, change, trend }) {
    return (_jsxs(Card, { className: "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-5", children: [_jsxs("div", { className: "flex items-start justify-between mb-2", children: [_jsx("p", { className: "text-sm text-slate-600 dark:text-slate-400", children: label }), trend === 'up' && _jsx(TrendingUp, { className: "w-4 h-4 text-green-600 dark:text-green-500" })] }), _jsxs("div", { children: [_jsx("p", { className: "text-2xl text-slate-900 dark:text-white mb-1", children: value }), _jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: change })] })] }));
}
function ProjectCard({ project, onClick }) {
    const daysRemaining = Math.ceil((new Date(project.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return (_jsx("button", { onClick: onClick, className: "text-left w-full", children: _jsxs(Card, { className: "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors", children: [_jsxs("div", { className: "flex items-start justify-between mb-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-2 h-2 rounded-full", style: { backgroundColor: project.color } }), _jsx("h3", { className: "text-slate-900 dark:text-white", children: project.name })] }), project.githubLinked && (_jsx(Github, { className: "w-4 h-4 text-slate-400" }))] }), _jsx("p", { className: "text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2", children: project.description }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Progress" }), _jsxs("span", { className: "text-xs text-slate-600 dark:text-slate-400", children: [project.progress, "%"] })] }), _jsx(Progress, { value: project.progress, className: "h-1.5" })] }), _jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsxs("div", { className: "flex items-center gap-1 text-slate-500 dark:text-slate-400", children: [_jsx(Clock, { className: "w-3 h-3" }), _jsxs("span", { children: [daysRemaining, "d left"] })] }), _jsxs("div", { className: "flex items-center gap-1 text-slate-500 dark:text-slate-400", children: [_jsx(Calendar, { className: "w-3 h-3" }), _jsxs("span", { children: [project.milestones.length, " milestones"] })] })] }), _jsxs("div", { className: "flex items-center gap-1.5", children: [project.members.slice(0, 3).map((member, i) => (_jsx("div", { className: "w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-600 dark:text-slate-300", children: member.charAt(0) }, i))), project.members.length > 3 && (_jsxs("div", { className: "w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400", children: ["+", project.members.length - 3] }))] })] })] }) }));
}
