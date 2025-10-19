import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { login, setToken } from '@lib/api';

interface LoginScreenProps {
  onSuccess: () => void;
}

export function LoginScreen({ onSuccess }: LoginScreenProps) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
      toast.error(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0A0A0A] px-4">
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
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}