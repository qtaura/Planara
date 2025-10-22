import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { login, setToken } from '@lib/api';
import { signup } from '@lib/api';
export function SignupScreen({ onSuccess }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    async function handleSignup(e) {
        e.preventDefault();
        setLoading(true);
        try {
            await signup({ username, email, password });
            const { token, user } = await login(username || email, password);
            setToken(token);
            toast.success(`Welcome, ${user.username || user.email || 'new user'}!`);
            window.dispatchEvent(new CustomEvent('auth:logged_in'));
            onSuccess();
        }
        catch (err) {
            const msg = err?.message || 'Signup failed';
            toast.error(msg);
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-white dark:bg-[#0A0A0A] px-4", children: _jsxs("div", { className: "w-full max-w-sm p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm", children: [_jsx("h1", { className: "text-xl font-semibold text-slate-900 dark:text-white mb-1", children: "Create your account" }), _jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400 mb-6", children: "Sign up with a username, email, and password" }), _jsxs("form", { onSubmit: handleSignup, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-600 dark:text-slate-400 mb-1 block", children: "Username" }), _jsx(Input, { value: username, onChange: (e) => setUsername(e.target.value), placeholder: "alex", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-600 dark:text-slate-400 mb-1 block", children: "Email" }), _jsx(Input, { type: "email", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "alex@example.com", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-600 dark:text-slate-400 mb-1 block", children: "Password" }), _jsx(Input, { type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", required: true })] }), _jsx(Button, { type: "submit", disabled: loading, className: "w-full bg-indigo-600 hover:bg-indigo-700 text-white", children: loading ? 'Creating account…' : 'Sign up' })] })] }) }));
}
