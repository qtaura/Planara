import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { signup, login, setToken, updateUser, getCurrentUser, getCurrentUserFromAPI, setCurrentUser } from '@lib/api';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
export function SetUsernameScreen({ email, password, onSuccess }) {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        try {
            if (email && password) {
                await signup({ username, email, password });
                const { token, user } = await login(email, password);
                setToken(token);
                toast.success(`Welcome, ${user.username || user.email || 'new user'}!`);
                window.dispatchEvent(new CustomEvent('auth:logged_in'));
            }
            else {
                // OAuth case: update the current user's username via API
                let user = getCurrentUser();
                if (!user) {
                    user = await getCurrentUserFromAPI();
                }
                if (!user?.id)
                    throw new Error('No current user found');
                const updated = await updateUser(Number(user.id), { username });
                setCurrentUser(updated);
                toast.success(`Welcome, ${updated.username || updated.email || 'user'}!`);
                window.dispatchEvent(new CustomEvent('auth:logged_in'));
            }
            onSuccess();
        }
        catch (err) {
            toast.error(err?.message || 'Could not complete signup');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsxs("div", { className: "min-h-screen bg-white dark:bg-[#0A0A0A] text-slate-900 dark:text-white", children: [_jsx("header", { className: "border-b border-slate-200 dark:border-slate-800/50", children: _jsxs("div", { className: "container mx-auto px-6 h-16 flex items-center justify-between", children: [_jsx(Logo, {}), _jsx("div", { className: "flex items-center gap-3", children: _jsx(ThemeToggle, {}) })] }) }), _jsx("div", { className: "container mx-auto px-6 py-16 flex items-start justify-center", children: _jsxs("div", { className: "w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm", children: [_jsxs("div", { className: "mb-6", children: [_jsxs("div", { className: "flex items-center justify-between text-sm text-slate-600 dark:text-slate-400", children: [_jsx("span", { children: "Step 3 of 3" }), _jsx("span", { children: "100%" })] }), _jsx("div", { className: "mt-2 h-1 rounded bg-slate-200 dark:bg-slate-800", children: _jsx("div", { className: "h-1 w-full rounded bg-indigo-600 dark:bg-indigo-500" }) })] }), _jsx("h1", { className: "text-xl font-semibold mb-2", children: "Create your username" }), _jsx("p", { className: "text-slate-600 dark:text-slate-400 mb-6", children: "Pick a unique username for your profile" }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-600 dark:text-slate-400 mb-1 block", children: "Username" }), _jsx(Input, { value: username, onChange: (e) => setUsername(e.target.value), placeholder: "alex", required: true })] }), _jsx(Button, { type: "submit", disabled: loading, className: "bg-indigo-600 hover:bg-indigo-700 w-full", children: loading ? 'Finish…' : 'Finish' })] }), _jsxs("div", { className: "mt-8 flex items-center justify-center gap-2 text-slate-400 dark:text-slate-600", children: [_jsx("span", { className: "inline-block w-8 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500" }), _jsx("span", { className: "inline-block w-8 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500" }), _jsx("span", { className: "inline-block w-8 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500" })] })] }) })] }));
}
