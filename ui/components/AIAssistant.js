import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sparkles, X, Send, Zap, Target, Calendar } from 'lucide-react';
export function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: '1',
            type: 'ai',
            content: 'Hi! I can help you break down tasks, estimate deadlines, and set priorities. What would you like to work on?',
            timestamp: new Date(),
        },
    ]);
    const quickActions = [
        { icon: _jsx(Zap, { className: "w-3 h-3" }), label: 'Suggest tasks' },
        { icon: _jsx(Target, { className: "w-3 h-3" }), label: 'Set priorities' },
        { icon: _jsx(Calendar, { className: "w-3 h-3" }), label: 'Estimate deadlines' },
    ];
    const handleSendMessage = (content) => {
        if (!content.trim())
            return;
        setMessages([
            ...messages,
            {
                id: Date.now().toString(),
                type: 'user',
                content,
                timestamp: new Date(),
            },
            {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                content: `Based on your "Quantum Dashboard" project, I suggest breaking this into 3 subtasks with a recommended deadline of Oct 28.`,
                timestamp: new Date(),
            },
        ]);
    };
    return (_jsxs(_Fragment, { children: [_jsx(AnimatePresence, { children: !isOpen && (_jsx(motion.button, { initial: { scale: 0 }, animate: { scale: 1 }, exit: { scale: 0 }, onClick: () => setIsOpen(true), className: "fixed bottom-6 right-6 p-3 bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-lg z-50 transition-colors", children: _jsx(Sparkles, { className: "w-5 h-5 text-white" }) })) }), _jsx(AnimatePresence, { children: isOpen && (_jsx(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 20 }, className: "fixed bottom-6 right-6 w-96 z-50", children: _jsxs(Card, { className: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden", children: [_jsxs("div", { className: "bg-slate-50 dark:bg-slate-800/50 p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-700", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center", children: _jsx(Sparkles, { className: "w-4 h-4 text-white" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm text-slate-900 dark:text-white", children: "AI Assistant" }), _jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Always here to help" })] })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => setIsOpen(false), className: "h-8 w-8 p-0", children: _jsx(X, { className: "w-4 h-4" }) })] }), _jsxs("div", { className: "p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30", children: [_jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400 mb-2", children: "Quick actions" }), _jsx("div", { className: "flex flex-wrap gap-2", children: quickActions.map((action, i) => (_jsxs(Button, { size: "sm", variant: "outline", className: "text-xs h-7", onClick: () => handleSendMessage(action.label), children: [action.icon, _jsx("span", { className: "ml-1", children: action.label })] }, i))) })] }), _jsx("div", { className: "h-96 overflow-y-auto p-4 space-y-4", children: messages.map((message) => (_jsxs("div", { className: `flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`, children: [message.type === 'ai' && (_jsx("div", { className: "w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center mr-2 flex-shrink-0", children: _jsx(Sparkles, { className: "w-3 h-3 text-white" }) })), _jsxs("div", { className: `max-w-[80%] p-3 rounded-lg text-sm ${message.type === 'user'
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700'}`, children: [_jsx("p", { children: message.content }), _jsx("p", { className: "text-xs opacity-60 mt-1", children: message.timestamp.toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    }) })] })] }, message.id))) }), _jsx("div", { className: "p-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700", children: _jsxs("div", { className: "flex gap-2", children: [_jsx(Input, { placeholder: "Ask me anything...", className: "flex-1 text-sm", onKeyPress: (e) => {
                                                if (e.key === 'Enter') {
                                                    handleSendMessage(e.currentTarget.value);
                                                    e.currentTarget.value = '';
                                                }
                                            } }), _jsx(Button, { size: "sm", className: "bg-indigo-600 hover:bg-indigo-700 text-white px-3", children: _jsx(Send, { className: "w-4 h-4" }) })] }) })] }) })) })] }));
}
