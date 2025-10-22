import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Progress } from './ui/progress';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { Github, Mail, MessageSquare, Check, ArrowRight } from 'lucide-react';
export function OnboardingScreen({ onComplete }) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        theme: 'dark',
        defaultView: 'kanban',
    });
    const totalSteps = 3;
    const progress = (step / totalSteps) * 100;
    const handleNext = () => {
        if (step < totalSteps) {
            setStep(step + 1);
        }
        else {
            onComplete();
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-white dark:bg-[#0A0A0A] flex flex-col items-center justify-center p-6", children: [_jsxs("div", { className: "absolute top-6 left-6 right-6 flex items-center justify-between", children: [_jsx(Logo, { size: "sm" }), _jsx(ThemeToggle, {})] }), _jsxs("div", { className: "w-full max-w-lg", children: [_jsxs("div", { className: "mb-8", children: [_jsxs("div", { className: "flex justify-between items-center mb-3", children: [_jsxs("span", { className: "text-sm text-slate-600 dark:text-slate-400", children: ["Step ", step, " of ", totalSteps] }), _jsxs("span", { className: "text-sm text-slate-600 dark:text-slate-400", children: [Math.round(progress), "%"] })] }), _jsx(Progress, { value: progress, className: "h-1.5" })] }), _jsxs("div", { className: "bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-8", children: [step === 1 && (_jsxs("div", { children: [_jsx("h2", { className: "mb-2 text-slate-900 dark:text-white", children: "Welcome to Planara" }), _jsx("p", { className: "text-sm text-slate-600 dark:text-slate-400 mb-8", children: "Choose how you'd like to sign up and get started" }), _jsxs("div", { className: "space-y-3 mb-8", children: [_jsxs(Button, { className: "w-full justify-start bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700", variant: "outline", onClick: handleNext, children: [_jsx(Github, { className: "mr-3 h-5 w-5" }), "Continue with GitHub"] }), _jsxs(Button, { className: "w-full justify-start bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700", variant: "outline", onClick: handleNext, children: [_jsx(Mail, { className: "mr-3 h-5 w-5" }), "Continue with Google"] }), _jsxs(Button, { className: "w-full justify-start bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700", variant: "outline", onClick: handleNext, children: [_jsx(MessageSquare, { className: "mr-3 h-5 w-5" }), "Continue with Slack"] })] }), _jsx("div", { className: "text-center", children: _jsx(Button, { variant: "ghost", className: "text-sm text-slate-600 dark:text-slate-400", onClick: handleNext, children: "Skip for now" }) })] })), step === 2 && (_jsxs("div", { children: [_jsx("h2", { className: "mb-2 text-slate-900 dark:text-white", children: "Tell us about yourself" }), _jsx("p", { className: "text-sm text-slate-600 dark:text-slate-400 mb-8", children: "Help us personalize your experience" }), _jsxs("div", { className: "space-y-5", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "name", className: "text-slate-700 dark:text-slate-300 mb-2 block text-sm", children: "Full name" }), _jsx(Input, { id: "name", placeholder: "Enter your name", value: formData.name, onChange: (e) => setFormData({ ...formData, name: e.target.value }), className: "h-10" })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "email", className: "text-slate-700 dark:text-slate-300 mb-2 block text-sm", children: "Email address" }), _jsx(Input, { id: "email", type: "email", placeholder: "you@example.com", value: formData.email, onChange: (e) => setFormData({ ...formData, email: e.target.value }), className: "h-10" })] }), _jsxs(Button, { onClick: handleNext, className: "w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-6", children: ["Continue", _jsx(ArrowRight, { className: "ml-2 h-4 w-4" })] })] })] })), step === 3 && (_jsxs("div", { children: [_jsx("h2", { className: "mb-2 text-slate-900 dark:text-white", children: "Customize your workspace" }), _jsx("p", { className: "text-sm text-slate-600 dark:text-slate-400 mb-8", children: "Set your preferences to match your workflow" }), _jsxs("div", { className: "space-y-5 mb-8", children: [_jsxs("div", { className: "flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700", children: [_jsxs("div", { children: [_jsx(Label, { className: "text-slate-900 dark:text-white text-sm", children: "Dark mode" }), _jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Use dark theme by default" })] }), _jsx(Switch, { checked: formData.theme === 'dark', onCheckedChange: (checked) => setFormData({ ...formData, theme: checked ? 'dark' : 'light' }) })] }), _jsxs("div", { className: "p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700", children: [_jsx(Label, { className: "text-slate-900 dark:text-white mb-3 block text-sm", children: "Default task view" }), _jsx("div", { className: "grid grid-cols-3 gap-2", children: ['kanban', 'gantt', 'timeline'].map((view) => (_jsxs("button", { onClick: () => setFormData({ ...formData, defaultView: view }), className: `p-3 rounded-lg border text-sm transition-colors ${formData.defaultView === view
                                                                ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-600 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400'
                                                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`, children: [_jsx("div", { className: "flex items-center justify-center mb-2", children: formData.defaultView === view && (_jsx(Check, { className: "h-3 w-3" })) }), _jsx("p", { className: "capitalize", children: view })] }, view))) })] })] }), _jsxs(Button, { onClick: handleNext, className: "w-full bg-indigo-600 hover:bg-indigo-700 text-white", children: ["Complete setup", _jsx(Check, { className: "ml-2 h-4 w-4" })] })] }))] }), _jsx("div", { className: "flex justify-center gap-2 mt-6", children: [1, 2, 3].map((i) => (_jsx("div", { className: `h-1.5 rounded-full transition-all ${i === step
                                ? 'w-8 bg-indigo-600'
                                : i < step
                                    ? 'w-1.5 bg-indigo-600/50'
                                    : 'w-1.5 bg-slate-300 dark:bg-slate-700'}` }, i))) })] })] }));
}
