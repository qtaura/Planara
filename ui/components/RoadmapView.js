import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Calendar, Users } from 'lucide-react';
export function RoadmapView({ milestones }) {
    // Generate timeline based on milestones
    const today = new Date();
    const allDates = milestones.flatMap(m => [new Date(m.startDate), new Date(m.endDate)]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    // Generate month labels
    const months = [];
    const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    while (current <= maxDate) {
        months.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
    }
    const getPosition = (date) => {
        const totalDays = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
        const daysSinceStart = (date.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
        return (daysSinceStart / totalDays) * 100;
    };
    const getWidth = (start, end) => {
        const totalDays = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
        const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        return (duration / totalDays) * 100;
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "sticky top-0 bg-slate-950/95 backdrop-blur-sm z-10 pb-4 border-b border-slate-800", children: [_jsxs("div", { className: "flex items-center gap-4 mb-4", children: [_jsx("h3", { className: "text-white", children: "Project Roadmap" }), _jsxs(Badge, { variant: "outline", className: "border-purple-500/50 text-purple-300", children: [milestones.length, " Milestones"] })] }), _jsxs("div", { className: "relative h-12 bg-slate-900/50 rounded-lg border border-slate-800", children: [months.map((month, i) => {
                                const pos = getPosition(month);
                                return (_jsx("div", { className: "absolute top-0 h-full flex items-center px-3 border-l border-slate-700", style: { left: `${pos}%` }, children: _jsx("span", { className: "text-xs text-slate-400", children: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) }) }, i));
                            }), today >= minDate && today <= maxDate && (_jsx("div", { className: "absolute top-0 h-full w-0.5 bg-purple-500", style: { left: `${getPosition(today)}%` }, children: _jsx("div", { className: "absolute -top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-purple-500 rounded text-xs text-white whitespace-nowrap", children: "Today" }) }))] })] }), _jsx("div", { className: "space-y-4", children: milestones.map((milestone, index) => {
                    const startDate = new Date(milestone.startDate);
                    const endDate = new Date(milestone.endDate);
                    const left = getPosition(startDate);
                    const width = getWidth(startDate, endDate);
                    return (_jsx(motion.div, { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, transition: { delay: index * 0.1 }, children: _jsxs(Card, { className: "bg-slate-900/50 border-slate-800 p-4 hover:border-purple-500/50 transition-all", children: [_jsxs("div", { className: "flex items-start gap-4 mb-3", children: [_jsx("div", { className: "w-1 h-12 rounded-full flex-shrink-0", style: { backgroundColor: milestone.color } }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("h4", { className: "text-white", children: milestone.title }), milestone.progress === 100 && (_jsx(Badge, { className: "bg-green-600/30 text-green-300 border-0", children: "Completed" }))] }), _jsx("p", { className: "text-sm text-slate-400 mb-2", children: milestone.description }), _jsxs("div", { className: "flex items-center gap-4 text-xs text-slate-500", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Calendar, { className: "w-3 h-3" }), _jsxs("span", { children: [startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), " - ", ' ', endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Users, { className: "w-3 h-3" }), _jsxs("span", { children: [milestone.tasks.length, " tasks"] })] })] })] }), _jsxs("div", { className: "text-right", children: [_jsxs("p", { className: "text-2xl text-white mb-1", children: [milestone.progress, "%"] }), _jsx("p", { className: "text-xs text-slate-500", children: "Complete" })] })] }), _jsx("div", { className: "mb-3", children: _jsx(Progress, { value: milestone.progress, className: "h-2" }) }), _jsxs("div", { className: "relative h-8 bg-slate-800/50 rounded", children: [_jsxs(motion.div, { className: "absolute top-1 h-6 rounded-lg flex items-center px-3 cursor-pointer overflow-hidden", style: {
                                                left: `${left}%`,
                                                width: `${width}%`,
                                                backgroundColor: milestone.color,
                                            }, whileHover: { y: -2, boxShadow: `0 4px 12px ${milestone.color}80` }, initial: { width: 0 }, animate: { width: `${width}%` }, transition: { duration: 0.6, delay: index * 0.1 }, children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" }), _jsx("span", { className: "text-xs text-white truncate relative z-10", children: milestone.title })] }), milestone.dependencies.length > 0 && (_jsx("div", { className: "absolute -left-4 top-1/2 -translate-y-1/2", children: _jsx("div", { className: "w-3 h-3 rounded-full bg-orange-500 border-2 border-slate-900" }) }))] }), milestone.dependencies.length > 0 && (_jsx("div", { className: "mt-3 pt-3 border-t border-slate-800", children: _jsxs("p", { className: "text-xs text-slate-500", children: ["Depends on: ", milestone.dependencies.join(', ')] }) }))] }) }, milestone.id));
                }) }), _jsx(Card, { className: "bg-slate-900/50 border-slate-800 p-4", children: _jsxs("div", { className: "flex items-center gap-6 text-xs text-slate-400", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-3 h-3 rounded bg-purple-500" }), _jsx("span", { children: "Active" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-3 h-3 rounded bg-green-500" }), _jsx("span", { children: "Completed" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-3 h-3 rounded-full bg-orange-500" }), _jsx("span", { children: "Has Dependencies" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-0.5 h-4 bg-purple-500" }), _jsx("span", { children: "Today" })] })] }) })] }));
}
