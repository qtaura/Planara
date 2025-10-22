import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
export function CalendarView({ tasks, milestones, onTaskClick }) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const previousMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };
    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };
    const getEventsForDay = (day) => {
        const date = new Date(year, month, day);
        const dateString = date.toISOString().split('T')[0];
        const dayTasks = tasks.filter(task => {
            if (!task.dueDate)
                return false;
            return task.dueDate === dateString;
        });
        const dayMilestones = milestones.filter(milestone => {
            const start = new Date(milestone.startDate);
            const end = new Date(milestone.endDate);
            return date >= start && date <= end;
        });
        return { tasks: dayTasks, milestones: dayMilestones };
    };
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(_jsx("div", { className: "h-32" }, `empty-${i}`));
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const { tasks: dayTasks, milestones: dayMilestones } = getEventsForDay(day);
        const isToday = day === new Date().getDate() &&
            month === new Date().getMonth() &&
            year === new Date().getFullYear();
        days.push(_jsx(CalendarDay, { day: day, isToday: isToday, tasks: dayTasks, milestones: dayMilestones, onTaskClick: onTaskClick }, day));
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-white", children: currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "outline", size: "sm", onClick: previousMonth, className: "border-slate-700 hover:bg-slate-800", children: _jsx(ChevronLeft, { className: "w-4 h-4" }) }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => setCurrentDate(new Date()), className: "border-slate-700 hover:bg-slate-800", children: "Today" }), _jsx(Button, { variant: "outline", size: "sm", onClick: nextMonth, className: "border-slate-700 hover:bg-slate-800", children: _jsx(ChevronRight, { className: "w-4 h-4" }) })] })] }), _jsxs(Card, { className: "bg-slate-900/50 border-slate-800 p-6", children: [_jsx("div", { className: "grid grid-cols-7 gap-2 mb-2", children: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (_jsx("div", { className: "text-center text-sm text-slate-400 py-2", children: day }, day))) }), _jsx("div", { className: "grid grid-cols-7 gap-2", children: days })] }), _jsxs("div", { className: "flex items-center gap-6 text-sm text-slate-400", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-3 h-3 rounded bg-purple-500" }), _jsx("span", { children: "Task Due" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-3 h-3 rounded bg-pink-500" }), _jsx("span", { children: "Milestone" })] })] })] }));
}
function CalendarDay({ day, isToday, tasks, milestones, onTaskClick }) {
    const hasEvents = tasks.length > 0 || milestones.length > 0;
    return (_jsxs(motion.div, { whileHover: hasEvents ? { scale: 1.02 } : {}, className: `h-32 p-2 rounded-lg border transition-all ${isToday
            ? 'bg-purple-900/20 border-purple-500'
            : hasEvents
                ? 'bg-slate-800/50 border-slate-700 hover:border-purple-500/50 cursor-pointer'
                : 'bg-slate-800/20 border-slate-800'}`, children: [_jsxs("div", { className: "flex justify-between items-start mb-2", children: [_jsx("span", { className: `text-sm ${isToday
                            ? 'text-purple-300'
                            : hasEvents
                                ? 'text-white'
                                : 'text-slate-500'}`, children: day }), isToday && (_jsx(Badge, { className: "bg-purple-600 text-white border-0 h-5 px-1.5 text-xs", children: "Today" }))] }), _jsxs("div", { className: "space-y-1 overflow-hidden", children: [milestones.slice(0, 2).map((milestone) => (_jsx("div", { className: "px-2 py-1 rounded text-xs truncate", style: {
                            backgroundColor: `${milestone.color}30`,
                            borderLeft: `3px solid ${milestone.color}`,
                        }, children: _jsx("span", { className: "text-white", children: milestone.title }) }, milestone.id))), tasks.slice(0, 2 - milestones.length).map((task) => (_jsx("div", { onClick: () => onTaskClick(task), className: "px-2 py-1 rounded bg-purple-600/30 border-l-3 border-purple-500 text-xs truncate hover:bg-purple-600/40 cursor-pointer", children: _jsx("span", { className: "text-purple-200", children: task.title }) }, task.id))), tasks.length + milestones.length > 2 && (_jsxs("div", { className: "px-2 py-1 text-xs text-slate-500", children: ["+", tasks.length + milestones.length - 2, " more"] }))] })] }));
}
