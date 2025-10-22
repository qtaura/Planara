import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { Github, Mail, MessageSquare } from 'lucide-react';
import { login, setToken, API_BASE, setCurrentUser } from '@lib/api';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './Logo';
export function LoginScreen({ onSuccess }) {
    const [usernameOrEmail, setUsernameOrEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [capsLockOn, setCapsLockOn] = useState(false);
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
                toast.success(`Welcome back, ${data.user?.username || data.user?.email || 'user'}!`);
                try {
                    window.dispatchEvent(new CustomEvent('auth:logged_in'));
                }
                catch { }
                onSuccess();
            }
        };
        window.addEventListener('message', handler);
        return () => window.removeEventListener('message', handler);
    }, [onSuccess]);
    async function handleLogin(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const { token, user } = await login(usernameOrEmail, password);
            setToken(token);
            toast.success(`Welcome back, ${user.username || user.email || 'user'}!`);
            window.dispatchEvent(new CustomEvent('auth:logged_in'));
            onSuccess();
        }
        catch (err) {
            const baseMsg = err?.message || 'Login failed';
            const msg = capsLockOn ? `${baseMsg}. Caps Lock is on.` : baseMsg;
            // Normalize the common invalid credentials case
            toast.error(msg);
        }
        finally {
            setLoading(false);
        }
    }
    function startProvider(provider) {
        const url = `${API_BASE}/users/oauth/${provider}/start?origin=${encodeURIComponent(window.location.origin)}`;
        window.open(url, 'oauth', 'width=600,height=700');
    }
    function handlePasswordKeyEvent(e) {
        try {
            const on = e.getModifierState && e.getModifierState('CapsLock');
            setCapsLockOn(!!on);
        }
        catch { }
    }
    return (_jsxs("div", { className: "min-h-screen relative flex items-center justify-center bg-white dark:bg-[#0A0A0A] px-4", children: [_jsx("div", { className: "absolute top-4 right-4", children: _jsx(ThemeToggle, {}) }), _jsxs("div", { className: "w-full max-w-sm p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm", children: [_jsx("div", { className: "flex justify-center mb-4", children: _jsx(Logo, { size: "lg" }) }), _jsx("h1", { className: "text-xl font-semibold text-slate-900 dark:text-white mb-1", children: "Sign in" }), _jsx("p", { className: "text-sm text-slate-500 dark:text-slate-400 mb-6", children: "Use your username or email and password" }), _jsxs("form", { onSubmit: handleLogin, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-600 dark:text-slate-400 mb-1 block", children: "Username or Email" }), _jsx(Input, { value: usernameOrEmail, onChange: (e) => setUsernameOrEmail(e.target.value), placeholder: "alex or alex@example.com", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-slate-600 dark:text-slate-400 mb-1 block", children: "Password" }), _jsx(Input, { type: "password", value: password, onChange: (e) => setPassword(e.target.value), onKeyDown: handlePasswordKeyEvent, onKeyUp: handlePasswordKeyEvent, onFocus: (e) => {
                                            try {
                                                const on = e.target?.getModifierState?.('CapsLock');
                                                setCapsLockOn(!!on);
                                            }
                                            catch { }
                                        }, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", required: true }), capsLockOn && (_jsx("p", { className: "mt-1 text-xs text-amber-600", children: "Caps Lock is on" }))] }), _jsx(Button, { type: "submit", disabled: loading, className: "w-full bg-indigo-600 hover:bg-indigo-700 text-white", children: loading ? 'Signing in…' : 'Sign in' })] }), _jsxs("div", { className: "mt-6 space-y-3", children: [_jsx("p", { className: "text-xs text-slate-500 dark:text-slate-400", children: "Or continue with" }), _jsxs(Button, { variant: "outline", className: "w-full justify-start border-slate-200 dark:border-slate-800", onClick: () => startProvider('github'), children: [_jsx(Github, { className: "w-4 h-4 mr-2" }), "Continue with GitHub"] }), _jsxs(Button, { variant: "outline", className: "w-full justify-start border-slate-200 dark:border-slate-800", onClick: () => startProvider('google'), children: [_jsx(Mail, { className: "w-4 h-4 mr-2" }), "Continue with Google"] }), _jsxs(Button, { variant: "outline", className: "w-full justify-start border-slate-200 dark:border-slate-800", onClick: () => startProvider('slack'), children: [_jsx(MessageSquare, { className: "w-4 h-4 mr-2" }), "Continue with Slack"] })] })] })] }));
}
