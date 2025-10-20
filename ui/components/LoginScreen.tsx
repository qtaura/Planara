import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { Github, Mail, MessageSquare } from 'lucide-react';
import { login, setToken, API_BASE, setCurrentUser } from '@lib/api';
import { ThemeToggle } from './ThemeToggle';

interface LoginScreenProps {
  onSuccess: () => void;
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const data = (e && (e as any).data) || null;
      if (data && data.type === 'oauth' && data.token) {
        try {
          setToken(data.token);
          if (data.user) setCurrentUser(data.user);
        } catch {}
        toast.success(`Welcome back, ${data.user?.username || data.user?.email || 'user'}!`);
        try { window.dispatchEvent(new CustomEvent('auth:logged_in')); } catch {}
        onSuccess();
      }
    };
    window.addEventListener('message', handler as any);
    return () => window.removeEventListener('message', handler as any);
  }, [onSuccess]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { token, user } = await login(usernameOrEmail, password);
      setToken(token);
      toast.success(`Welcome back, ${user.username || user.email || 'user'}!`);
      window.dispatchEvent(new CustomEvent('auth:logged_in'));
      onSuccess();
    } catch (err: any) {
      const baseMsg = err?.message || 'Login failed';
      const msg = capsLockOn ? `${baseMsg}. Caps Lock is on.` : baseMsg;
      // Normalize the common invalid credentials case
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function startProvider(provider: 'github' | 'google' | 'slack') {
    const url = `${API_BASE}/users/oauth/${provider}/start?origin=${encodeURIComponent(window.location.origin)}`;
    window.open(url, 'oauth', 'width=600,height=700');
  }

  function handlePasswordKeyEvent(e: React.KeyboardEvent<HTMLInputElement>) {
    try {
      const on = e.getModifierState && e.getModifierState('CapsLock');
      setCapsLockOn(!!on);
    } catch {}
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-white dark:bg-[#0A0A0A] px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">Sign in</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Use your username or email and password</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">Username or Email</label>
            <Input
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              placeholder="alex or alex@example.com"
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handlePasswordKeyEvent}
              onKeyUp={handlePasswordKeyEvent}
              onFocus={(e) => {
                try {
                  const on = (e as any).target?.getModifierState?.('CapsLock');
                  setCapsLockOn(!!on);
                } catch {}
              }}
              placeholder="••••••••"
              required
            />
            {capsLockOn && (
              <p className="mt-1 text-xs text-amber-600">Caps Lock is on</p>
            )}
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">Or continue with</p>
          <Button
            variant="outline"
            className="w-full justify-start border-slate-200 dark:border-slate-800"
            onClick={() => startProvider('github')}
          >
            <Github className="w-4 h-4 mr-2" />
            Continue with GitHub
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start border-slate-200 dark:border-slate-800"
            onClick={() => startProvider('google')}
          >
            <Mail className="w-4 h-4 mr-2" />
            Continue with Google
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start border-slate-200 dark:border-slate-800"
            onClick={() => startProvider('slack')}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Continue with Slack
          </Button>
        </div>
      </div>
    </div>
  );
}