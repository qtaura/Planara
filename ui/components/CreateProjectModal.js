import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Calendar, Github, Sparkles, X } from 'lucide-react';
import { createProject } from '@lib/api';
import { toast } from 'sonner';
export function CreateProjectModal({ isOpen, onClose, onCreate }) {
    const [githubLinked, setGithubLinked] = useState(false);
    const [aiGenerate, setAiGenerate] = useState(true);
    const [tags, setTags] = useState(['web', 'frontend']);
    const [newTag, setNewTag] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState(null);
    const projectTypes = [
        { value: 'web', label: 'Web App' },
        { value: 'mobile', label: 'Mobile' },
        { value: 'api', label: 'API' },
        { value: 'library', label: 'Library' },
    ];
    const [selectedType, setSelectedType] = useState('web');
    const handleAddTag = () => {
        if (newTag && !tags.includes(newTag)) {
            setTags([...tags, newTag]);
            setNewTag('');
        }
    };
    const handleCreate = async () => {
        if (!name.trim()) {
            setError('Project name is required');
            return;
        }
        setCreating(true);
        setError(null);
        try {
            await createProject({ name: name.trim(), description: description.trim() || undefined });
            toast.success('Project created');
            window.dispatchEvent(new CustomEvent('projects:changed'));
            onCreate();
            onClose();
        }
        catch (e) {
            const msg = e?.message || 'Failed to create project';
            setError(msg);
            toast.error(msg);
        }
        finally {
            setCreating(false);
        }
    };
    return (_jsx(Dialog, { open: isOpen, onOpenChange: onClose, children: _jsxs(DialogContent, { className: "max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { className: "text-slate-900 dark:text-white", children: "Create project" }), _jsx(DialogDescription, { className: "text-slate-600 dark:text-slate-400", children: "Set up a new project with AI-powered task suggestions" })] }), _jsxs("div", { className: "space-y-6 mt-6", children: [error && (_jsx("div", { className: "p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm", children: error })), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "project-name", className: "mb-2 block", children: "Project name" }), _jsx(Input, { id: "project-name", placeholder: "e.g., Website redesign", className: "h-10", value: name, onChange: (e) => setName(e.target.value), disabled: creating })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "description", className: "mb-2 block", children: "Description" }), _jsx(Textarea, { id: "description", placeholder: "What's this project about?", rows: 3, value: description, onChange: (e) => setDescription(e.target.value), disabled: creating })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "mb-3 block", children: "Project type" }), _jsx("div", { className: "grid grid-cols-4 gap-2", children: projectTypes.map((type) => (_jsx("button", { onClick: () => setSelectedType(type.value), className: `p-3 rounded-lg border text-sm transition-colors ${selectedType === type.value
                                            ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-600 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`, disabled: creating, children: type.label }, type.value))) })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "start-date", className: "mb-2 block", children: "Start date" }), _jsxs("div", { className: "relative", children: [_jsx(Input, { id: "start-date", type: "date", className: "h-10", disabled: creating }), _jsx(Calendar, { className: "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" })] })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "end-date", className: "mb-2 block", children: "Target date" }), _jsxs("div", { className: "relative", children: [_jsx(Input, { id: "end-date", type: "date", className: "h-10", disabled: creating }), _jsx(Calendar, { className: "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" })] })] })] }), _jsxs("div", { children: [_jsx(Label, { className: "mb-2 block", children: "Tags" }), _jsx("div", { className: "flex flex-wrap gap-2 mb-2", children: tags.map((tag) => (_jsxs(Badge, { variant: "outline", className: "px-2 py-1 text-xs", children: [tag, _jsx("button", { onClick: () => setTags(tags.filter((t) => t !== tag)), className: "ml-1 hover:text-red-600", disabled: creating, children: _jsx(X, { className: "w-3 h-3" }) })] }, tag))) }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { value: newTag, onChange: (e) => setNewTag(e.target.value), onKeyPress: (e) => e.key === 'Enter' && handleAddTag(), placeholder: "Add a tag...", className: "h-9 text-sm", disabled: creating }), _jsx(Button, { onClick: handleAddTag, variant: "outline", size: "sm", disabled: creating, children: "Add" })] })] }), _jsxs("div", { className: "space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Sparkles, { className: "w-4 h-4 text-indigo-600 dark:text-indigo-400" }), _jsxs("div", { children: [_jsx(Label, { className: "text-sm", children: "AI task generation" }), _jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Let AI suggest initial tasks and milestones" })] })] }), _jsx(Switch, { checked: aiGenerate, onCheckedChange: setAiGenerate, disabled: creating })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Github, { className: "w-4 h-4 text-slate-600 dark:text-slate-400" }), _jsxs("div", { children: [_jsx(Label, { className: "text-sm", children: "Link GitHub repository" }), _jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Sync with an existing repository" })] })] }), _jsx(Switch, { checked: githubLinked, onCheckedChange: setGithubLinked, disabled: creating })] })] }), _jsxs("div", { className: "flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700", children: [_jsx(Button, { variant: "outline", onClick: onClose, disabled: creating, children: "Cancel" }), _jsx(Button, { onClick: handleCreate, className: "bg-indigo-600 hover:bg-indigo-700 text-white", disabled: creating || !name.trim(), children: creating ? 'Creating...' : 'Create project' })] })] })] }) }));
}
