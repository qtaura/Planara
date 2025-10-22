import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Calendar, MoreHorizontal } from 'lucide-react';
import { Button } from './ui/button';
export function KanbanView({ tasks, onTaskClick }) {
    const columns = ['backlog', 'in-progress', 'review', 'qa', 'done'];
    const columnLabels = {
        'backlog': 'Backlog',
        'in-progress': 'In Progress',
        'review': 'In Review',
        'qa': 'QA',
        'done': 'Done',
    };
    return (_jsx("div", { className: "flex gap-4 overflow-x-auto pb-4 h-full", children: columns.map((column) => {
            const columnTasks = tasks.filter((t) => t.status === column);
            return (_jsxs("div", { className: "flex-shrink-0 w-80", children: [_jsxs("div", { className: "mb-3 px-3 py-2 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h3", { className: "text-sm text-slate-900 dark:text-white", children: columnLabels[column] }), _jsx("span", { className: "text-xs text-slate-500 dark:text-slate-400", children: columnTasks.length })] }), _jsx(Button, { variant: "ghost", size: "sm", className: "h-6 w-6 p-0", children: _jsx(MoreHorizontal, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "space-y-2", children: [columnTasks.map((task) => (_jsx(TaskCard, { task: task, onClick: () => onTaskClick(task) }, task.id))), columnTasks.length === 0 && (_jsx("div", { className: "p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg text-center", children: _jsx("p", { className: "text-sm text-slate-400", children: "No tasks" }) }))] })] }, column));
        }) }));
}
function TaskCard({ task, onClick }) {
    const priorityColors = {
        low: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
        medium: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
        high: 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400',
        critical: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400',
    };
    const completedSubtasks = task.subtasks.filter(s => s.completed).length;
    const totalSubtasks = task.subtasks.length;
    return (_jsx("button", { onClick: onClick, className: "w-full text-left", children: _jsxs(Card, { className: "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 p-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors", children: [_jsx("h4", { className: "text-sm text-slate-900 dark:text-white mb-2", children: task.title }), task.description && (_jsx("p", { className: "text-xs text-slate-600 dark:text-slate-400 mb-3 line-clamp-2", children: task.description })), task.labels.length > 0 && (_jsx("div", { className: "flex flex-wrap gap-1 mb-3", children: task.labels.map((label) => (_jsx(Badge, { variant: "outline", className: "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs px-2 py-0", children: label }, label))) })), totalSubtasks > 0 && (_jsx("div", { className: "mb-3", children: _jsxs("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: [completedSubtasks, "/", totalSubtasks, " subtasks"] }) })), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Badge, { className: `${priorityColors[task.priority]} border-0 text-xs px-2 py-0`, children: task.priority }), task.dueDate && (_jsxs("div", { className: "flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400", children: [_jsx(Calendar, { className: "w-3 h-3" }), _jsx("span", { children: new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })] }))] }), task.assignee && (_jsx(Avatar, { className: "h-5 w-5", children: _jsx(AvatarFallback, { className: "text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300", children: task.assignee.split(' ').map(n => n[0]).join('') }) }))] })] }) }));
}
