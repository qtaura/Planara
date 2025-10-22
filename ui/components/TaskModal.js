import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Checkbox } from './ui/checkbox';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import { Calendar, User, CheckCircle2, Sparkles, Clock, MessageSquare, Paperclip, MoreHorizontal, } from 'lucide-react';
import { updateTaskStatus, deleteTask } from '@lib/api';
import { toast } from 'sonner';
export function TaskModal({ task, isOpen, onClose }) {
    const [showAiSuggestions, setShowAiSuggestions] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    if (!task)
        return null;
    async function handleMarkDone() {
        setUpdating(true);
        try {
            await updateTaskStatus(task.id, 'done');
            toast.success('Task marked as done');
            window.dispatchEvent(new CustomEvent('tasks:changed'));
            onClose();
        }
        catch (e) {
            toast.error(e?.message || 'Failed to update task');
        }
        finally {
            setUpdating(false);
        }
    }
    async function handleDelete() {
        if (!confirm('Delete this task?'))
            return;
        setDeleting(true);
        try {
            await deleteTask(task.id);
            toast.success('Task deleted');
            window.dispatchEvent(new CustomEvent('tasks:changed'));
            onClose();
        }
        catch (e) {
            toast.error(e?.message || 'Failed to delete task');
        }
        finally {
            setDeleting(false);
        }
    }
    const aiSuggestions = [
        'Add subtask: Set up database migrations',
        'Add subtask: Write unit tests for auth flow',
        'Suggested deadline: Oct 28',
    ];
    const activityLog = [
        {
            id: '1',
            user: 'Alex Chen',
            action: 'updated status to In Progress',
            timestamp: '2 hours ago',
        },
        {
            id: '2',
            user: 'Sarah Park',
            action: 'added a comment',
            timestamp: '5 hours ago',
        },
        {
            id: '3',
            user: 'Alex Chen',
            action: 'created this task',
            timestamp: '2 days ago',
        },
    ];
    const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
    const progress = (completedSubtasks / task.subtasks.length) * 100;
    return (_jsx(Dialog, { open: isOpen, onOpenChange: onClose, children: _jsxs(DialogContent, { className: "max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800", children: [_jsx(DialogHeader, { children: _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "flex-1", children: [_jsx(DialogTitle, { className: "text-2xl text-slate-900 dark:text-white mb-3", children: task.title }), _jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx(Badge, { className: `${task.priority === 'critical'
                                                    ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400'
                                                    : task.priority === 'high'
                                                        ? 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400'
                                                        : task.priority === 'medium'
                                                            ? 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'} border-0 text-xs`, children: task.priority }), _jsx(Badge, { variant: "outline", className: "text-xs", children: task.status }), task.aiSuggested && (_jsxs(Badge, { className: "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-0 text-xs", children: [_jsx(Sparkles, { className: "w-3 h-3 mr-1" }), "AI suggested"] })), task.labels.map((label) => (_jsx(Badge, { variant: "outline", className: "text-xs", children: label }, label)))] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Button, { variant: "outline", size: "sm", onClick: handleMarkDone, disabled: updating || deleting || task.status === 'done', className: "text-green-600 dark:text-green-400 border-green-600 dark:border-green-600", children: "Mark done" }), _jsx(Button, { variant: "outline", size: "sm", onClick: handleDelete, disabled: updating || deleting, className: "text-red-600 dark:text-red-400 border-red-600 dark:border-red-600", children: "Delete" }), _jsx(Button, { variant: "ghost", size: "sm", disabled: updating || deleting, children: _jsx(MoreHorizontal, { className: "w-4 h-4" }) })] })] }) }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6 mt-6", children: [_jsxs("div", { className: "md:col-span-2 space-y-6", children: [_jsxs("div", { children: [_jsx("h4", { className: "text-sm text-slate-900 dark:text-white mb-2", children: "Description" }), task.description ? (_jsx("p", { className: "text-sm text-slate-600 dark:text-slate-400 leading-relaxed", children: task.description })) : (_jsx("p", { className: "text-sm text-slate-400 italic", children: "No description" }))] }), _jsx(Separator, {}), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("h4", { className: "text-sm text-slate-900 dark:text-white", children: ["Subtasks (", completedSubtasks, "/", task.subtasks.length, ")"] }), _jsxs("span", { className: "text-xs text-slate-500 dark:text-slate-400", children: [Math.round(progress), "% complete"] })] }), _jsx(Progress, { value: progress, className: "h-1.5 mb-4" }), _jsx("div", { className: "space-y-2", children: task.subtasks.map((subtask) => (_jsxs("div", { className: "flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700", children: [_jsx(Checkbox, { checked: subtask.completed, className: "mt-0.5" }), _jsx("span", { className: `text-sm flex-1 ${subtask.completed
                                                            ? 'line-through text-slate-400'
                                                            : 'text-slate-900 dark:text-white'}`, children: subtask.title })] }, subtask.id))) })] }), showAiSuggestions && (_jsxs(_Fragment, { children: [_jsx(Separator, {}), _jsxs("div", { className: "p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 rounded-lg", children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Sparkles, { className: "w-4 h-4 text-indigo-600 dark:text-indigo-400" }), _jsx("h4", { className: "text-sm text-indigo-900 dark:text-indigo-300", children: "AI suggestions" })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => setShowAiSuggestions(false), className: "h-6 text-xs", children: "Dismiss" })] }), _jsx("ul", { className: "space-y-2", children: aiSuggestions.map((suggestion, i) => (_jsxs("li", { className: "text-sm text-indigo-700 dark:text-indigo-400 flex items-start gap-2", children: [_jsx(CheckCircle2, { className: "w-3 h-3 mt-0.5 flex-shrink-0" }), _jsx("span", { children: suggestion })] }, i))) })] })] })), _jsx(Separator, {}), _jsxs("div", { children: [_jsx("h4", { className: "text-sm text-slate-900 dark:text-white mb-3", children: "Comments" }), _jsx("div", { className: "space-y-3 mb-4", children: _jsxs("div", { className: "flex gap-3", children: [_jsx(Avatar, { className: "h-8 w-8", children: _jsx(AvatarFallback, { className: "text-xs bg-slate-200 dark:bg-slate-700", children: "AC" }) }), _jsx("div", { className: "flex-1", children: _jsxs("div", { className: "p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: "text-sm text-slate-900 dark:text-white", children: "Alex Chen" }), _jsx("span", { className: "text-xs text-slate-500 dark:text-slate-400", children: "2 hours ago" })] }), _jsx("p", { className: "text-sm text-slate-600 dark:text-slate-400", children: "I've started working on this. Should have it done by end of week." })] }) })] }) }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { placeholder: "Add a comment...", className: "text-sm" }), _jsx(Button, { size: "sm", className: "bg-indigo-600 hover:bg-indigo-700 text-white", children: _jsx(MessageSquare, { className: "w-4 h-4" }) })] })] }), _jsx(Separator, {}), _jsxs("div", { children: [_jsx("h4", { className: "text-sm text-slate-900 dark:text-white mb-3", children: "Activity" }), _jsx("div", { className: "space-y-3", children: activityLog.map((activity) => (_jsxs("div", { className: "flex gap-3 text-sm", children: [_jsx(Avatar, { className: "h-6 w-6", children: _jsx(AvatarFallback, { className: "text-[10px] bg-slate-200 dark:bg-slate-700", children: activity.user.split(' ').map(n => n[0]).join('') }) }), _jsxs("div", { className: "flex-1", children: [_jsxs("p", { className: "text-slate-600 dark:text-slate-400", children: [_jsx("span", { className: "text-slate-900 dark:text-white", children: activity.user }), ' ', activity.action] }), _jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: activity.timestamp })] })] }, activity.id))) })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700", children: [_jsx("h4", { className: "text-sm text-slate-900 dark:text-white mb-4", children: "Details" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1", children: [_jsx(User, { className: "w-3 h-3" }), _jsx("span", { children: "Assignee" })] }), task.assignee ? (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Avatar, { className: "h-6 w-6", children: _jsx(AvatarFallback, { className: "text-xs bg-slate-200 dark:bg-slate-700", children: task.assignee.split(' ').map(n => n[0]).join('') }) }), _jsx("span", { className: "text-sm text-slate-900 dark:text-white", children: task.assignee })] })) : (_jsx(Button, { variant: "outline", size: "sm", className: "w-full justify-start", children: "Assign" }))] }), _jsx(Separator, {}), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1", children: [_jsx(Calendar, { className: "w-3 h-3" }), _jsx("span", { children: "Due date" })] }), task.dueDate ? (_jsx("p", { className: "text-sm text-slate-900 dark:text-white", children: new Date(task.dueDate).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric',
                                                            }) })) : (_jsx(Button, { variant: "outline", size: "sm", className: "w-full justify-start", children: "Set date" }))] }), _jsx(Separator, {}), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1", children: [_jsx(Clock, { className: "w-3 h-3" }), _jsx("span", { children: "Estimate" })] }), task.timeEstimate ? (_jsx("p", { className: "text-sm text-slate-900 dark:text-white", children: task.timeEstimate })) : (_jsx(Button, { variant: "outline", size: "sm", className: "w-full justify-start", children: "Add estimate" }))] })] })] }), _jsxs(Button, { variant: "outline", className: "w-full justify-start", children: [_jsx(Paperclip, { className: "w-4 h-4 mr-2" }), "Add attachments"] })] })] })] }) }));
}
