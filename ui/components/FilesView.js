import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { FileText, Link2, Code, Image as ImageIcon, Upload, Search, MoreVertical, Download, Sparkles } from 'lucide-react';
import { Input } from './ui/input';
export function FilesView() {
    const files = [
        {
            id: '1',
            name: 'Architecture Diagram.png',
            type: 'image',
            size: '2.4 MB',
            uploadedBy: 'Alex Chen',
            uploadedAt: '2 hours ago',
            aiGenerated: false,
        },
        {
            id: '2',
            name: 'API Documentation.md',
            type: 'document',
            size: '124 KB',
            uploadedBy: 'Marcus Lee',
            uploadedAt: '1 day ago',
            aiGenerated: true,
        },
        {
            id: '3',
            name: 'auth-service.ts',
            type: 'code',
            size: '8.2 KB',
            uploadedBy: 'Alex Chen',
            uploadedAt: '3 days ago',
            aiGenerated: false,
        },
        {
            id: '4',
            name: 'Database Schema',
            type: 'link',
            url: 'https://dbdiagram.io/project/...',
            uploadedBy: 'Sarah Park',
            uploadedAt: '5 days ago',
            aiGenerated: false,
        },
    ];
    const notes = [
        {
            id: '1',
            title: 'Sprint Planning Notes',
            content: 'Key decisions from the planning meeting...',
            updatedAt: '2 hours ago',
            tags: ['planning', 'sprint'],
        },
        {
            id: '2',
            title: 'Technical Debt Items',
            content: 'List of tech debt to address in Q4...',
            updatedAt: '1 day ago',
            tags: ['technical', 'debt'],
        },
    ];
    const templates = [
        {
            id: '1',
            name: 'Bug Report Template',
            description: 'Standard template for filing bugs',
        },
        {
            id: '2',
            name: 'Feature Request',
            description: 'Template for new feature proposals',
        },
    ];
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-white mb-1", children: "Files & Documentation" }), _jsx("p", { className: "text-sm text-slate-400", children: "Centralized storage for project resources" })] }), _jsxs(Button, { className: "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500", children: [_jsx(Upload, { className: "w-4 h-4 mr-2" }), "Upload File"] })] }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" }), _jsx(Input, { placeholder: "Search files, links, and notes...", className: "pl-10 bg-slate-900/50 border-slate-700 focus:border-purple-500" })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsxs("div", { className: "lg:col-span-2 space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h4", { className: "text-white", children: "Recent Files" }), _jsx(Button, { variant: "ghost", size: "sm", className: "text-purple-400", children: "View All" })] }), _jsx("div", { className: "space-y-3", children: files.map((file, index) => (_jsx(FileCard, { file: file, index: index }, file.id))) }), _jsxs("div", { className: "mt-8", children: [_jsx("h4", { className: "text-white mb-4", children: "Notes" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: notes.map((note) => (_jsxs(Card, { className: "bg-slate-900/50 border-slate-800 p-4 hover:border-purple-500/50 transition-all cursor-pointer", children: [_jsx("h4", { className: "text-white mb-2", children: note.title }), _jsx("p", { className: "text-sm text-slate-400 mb-3 line-clamp-2", children: note.content }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "flex gap-2", children: note.tags.map((tag) => (_jsx(Badge, { variant: "outline", className: "border-slate-700 text-slate-400 text-xs", children: tag }, tag))) }), _jsx("span", { className: "text-xs text-slate-500", children: note.updatedAt })] })] }, note.id))) })] })] }), _jsxs("div", { className: "space-y-6", children: [_jsxs(Card, { className: "bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/30 p-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-3", children: [_jsx(Sparkles, { className: "w-4 h-4 text-purple-400" }), _jsx("h4", { className: "text-white", children: "AI Summary" })] }), _jsx("p", { className: "text-sm text-purple-200/80 mb-4", children: "Your project documentation is well-structured. Consider adding more architecture diagrams for the authentication flow." }), _jsx(Button, { size: "sm", variant: "outline", className: "w-full border-purple-500/50 text-purple-300 hover:bg-purple-600/20", children: "Generate Docs" })] }), _jsxs("div", { children: [_jsx("h4", { className: "text-white mb-3", children: "Templates" }), _jsx("div", { className: "space-y-2", children: templates.map((template) => (_jsxs(Card, { className: "bg-slate-900/50 border-slate-800 p-3 hover:border-purple-500/50 transition-all cursor-pointer", children: [_jsx("p", { className: "text-sm text-white mb-1", children: template.name }), _jsx("p", { className: "text-xs text-slate-500", children: template.description })] }, template.id))) })] }), _jsxs("div", { children: [_jsx("h4", { className: "text-white mb-3", children: "Quick Actions" }), _jsxs("div", { className: "space-y-2", children: [_jsxs(Button, { variant: "outline", size: "sm", className: "w-full justify-start border-slate-700 hover:bg-slate-800", children: [_jsx(Code, { className: "w-4 h-4 mr-2" }), "Create Code Snippet"] }), _jsxs(Button, { variant: "outline", size: "sm", className: "w-full justify-start border-slate-700 hover:bg-slate-800", children: [_jsx(Link2, { className: "w-4 h-4 mr-2" }), "Add External Link"] })] })] })] })] })] }));
}
function FileCard({ file, index }) {
    const getIcon = (type) => {
        switch (type) {
            case 'image':
                return _jsx(ImageIcon, { className: "w-5 h-5 text-cyan-400" });
            case 'document':
                return _jsx(FileText, { className: "w-5 h-5 text-purple-400" });
            case 'code':
                return _jsx(Code, { className: "w-5 h-5 text-pink-400" });
            case 'link':
                return _jsx(Link2, { className: "w-5 h-5 text-green-400" });
            default:
                return _jsx(FileText, { className: "w-5 h-5 text-slate-400" });
        }
    };
    return (_jsx(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { delay: index * 0.05 }, children: _jsx(Card, { className: "bg-slate-900/50 border-slate-800 p-4 hover:border-purple-500/50 transition-all group cursor-pointer", children: _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "p-3 bg-slate-800/50 rounded-lg group-hover:scale-110 transition-transform", children: getIcon(file.type) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("h4", { className: "text-white truncate", children: file.name }), file.aiGenerated && (_jsxs(Badge, { className: "bg-purple-600/30 text-purple-300 border-0 px-2 py-0", children: [_jsx(Sparkles, { className: "w-3 h-3 mr-1" }), "AI"] }))] }), _jsxs("div", { className: "flex items-center gap-2 text-xs text-slate-500", children: [_jsx("span", { children: file.size || 'External link' }), _jsx("span", { children: "\u00B7" }), _jsx("span", { children: file.uploadedBy }), _jsx("span", { children: "\u00B7" }), _jsx("span", { children: file.uploadedAt })] })] }), _jsxs("div", { className: "flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity", children: [_jsx(Button, { variant: "ghost", size: "sm", className: "h-8 w-8 p-0", children: _jsx(Download, { className: "w-4 h-4" }) }), _jsx(Button, { variant: "ghost", size: "sm", className: "h-8 w-8 p-0", children: _jsx(MoreVertical, { className: "w-4 h-4" }) })] })] }) }) }));
}
