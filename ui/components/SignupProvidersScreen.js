import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from './ui/button';
import { Github, Mail, MessageSquare } from 'lucide-react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { API_BASE, setToken, setCurrentUser } from '../lib/api';
export function SignupProvidersScreen({ onChooseEmail, onChooseProvider, onSkip }) {
    // Listen for OAuth completion messages from popup
    useEffect(() => {
        const handler = (e) => {
            const data = (e && e.data) || null;
            if (data && data.type === 'oauth' && data.token) {
                try {
                    setToken(data.token);
                    if (data.user)
                        setCurrentUser(data.user);
                }
                catch { }
                toast.success(`Welcome, ${data.user?.username || data.user?.email || 'user'}!`);
                try {
                    if (data.created) {
                        window.dispatchEvent(new CustomEvent('auth:needs_username'));
                    }
                    else {
                        window.dispatchEvent(new CustomEvent('auth:logged_in'));
                    }
                }
                catch { }
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, []);
    const startProvider = (provider) => {
        const url = `${API_BASE}/users/oauth/${provider}/start?origin=${encodeURIComponent(window.location.origin)}`;
        window.open(url, 'oauth', 'width=600,height=700');
    };
    // Header
    return (_jsxs("div", { className: "min-h-screen bg-white dark:bg-[#0A0A0A] text-slate-900 dark:text-white", children: [_jsx("header", { className: "border-b border-slate-200 dark:border-slate-800/50", children: _jsxs("div", { className: "container mx-auto px-6 h-16 flex items-center justify-between", children: [_jsx(Logo, {}), _jsx("div", { className: "flex items-center gap-3", children: _jsx(ThemeToggle, {}) })] }) }), _jsx("div", { className: "container mx-auto px-6 py-16 flex items-start justify-center", children: _jsxs("div", { className: "w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm", children: [_jsxs("div", { className: "mb-6", children: [_jsxs("div", { className: "flex items-center justify-between text-sm text-slate-600 dark:text-slate-400", children: [_jsx("span", { children: "Step 1 of 3" }), _jsx("span", { children: "33%" })] }), _jsx("div", { className: "mt-2 h-1 rounded bg-slate-200 dark:bg-slate-800", children: _jsx("div", { className: "h-1 w-1/3 rounded bg-indigo-600 dark:bg-indigo-500" }) })] }), _jsx("h1", { className: "text-xl font-semibold mb-2", children: "Welcome to Planara" }), _jsx("p", { className: "text-slate-600 dark:text-slate-400 mb-6", children: "Choose how you'd like to sign up and get started" }), _jsxs("div", { className: "space-y-3", children: [_jsxs(Button, { variant: "outline", className: "w-full justify-start border-slate-200 dark:border-slate-800", onClick: () => startProvider('github'), children: [_jsx(Github, { className: "w-4 h-4 mr-2" }), "Continue with GitHub"] }), _jsxs(Button, { variant: "outline", className: "w-full justify-start border-slate-200 dark:border-slate-800", onClick: () => startProvider('google'), children: [_jsx(Mail, { className: "w-4 h-4 mr-2" }), "Continue with Google"] }), _jsxs(Button, { variant: "outline", className: "w-full justify-start border-slate-200 dark:border-slate-800", onClick: () => startProvider('slack'), children: [_jsx(MessageSquare, { className: "w-4 h-4 mr-2" }), "Continue with Slack"] })] }), _jsx("div", { className: "mt-6 text-center", children: _jsx(Button, { variant: "ghost", className: "text-slate-600 dark:text-slate-400", onClick: onSkip, children: "Skip for now" }) }), _jsx("div", { className: "mt-6 text-center", children: _jsx(Button, { className: "bg-indigo-600 hover:bg-indigo-700", onClick: onChooseEmail, children: "Sign up with email" }) }), _jsxs("div", { className: "mt-8 flex items-center justify-center gap-2 text-slate-400 dark:text-slate-600", children: [_jsx("span", { className: "inline-block w-8 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500" }), _jsx("span", { className: "inline-block w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" }), _jsx("span", { className: "inline-block w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" })] })] }) })] }));
}
