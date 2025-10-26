import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import {
  signup,
  login,
  setToken,
  updateUser,
  getCurrentUser,
  getCurrentUserFromAPI,
  setCurrentUser,
} from '@lib/api';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

interface SetUsernameScreenProps {
  email?: string;
  password?: string;
  onSuccess: () => void;
}

export function SetUsernameScreen({ email, password, onSuccess }: SetUsernameScreenProps) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (email && password) {
        // Email signup path: account was created provisionally earlier.
        // Log in to get token and current user, then update username.
        const { token, user } = await login(email, password);
        setToken(token);
        if (!user?.id) throw new Error('Login failed: no user id');
        const updated = await updateUser(Number(user.id), { username });
        setCurrentUser(updated);
        toast.success(`Welcome, ${updated.username || updated.email || 'user'}!`);
        window.dispatchEvent(new CustomEvent('auth:logged_in'));
      } else {
        // OAuth case: update the current user's username via API
        let user = getCurrentUser();
        if (!user) {
          user = await getCurrentUserFromAPI();
        }
        if (!user?.id) throw new Error('No current user found');
        const updated = await updateUser(Number(user.id), { username });
        setCurrentUser(updated);
        toast.success(`Welcome, ${updated.username || updated.email || 'user'}!`);
        window.dispatchEvent(new CustomEvent('auth:logged_in'));
      }
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || 'Could not complete signup');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] text-slate-900 dark:text-white">
      <header className="border-b border-slate-200 dark:border-slate-800/50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-16 flex items-start justify-center">
        <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
              <span>Step 3 of 3</span>
              <span>100%</span>
            </div>
            <div className="mt-2 h-1 rounded bg-slate-200 dark:bg-slate-800">
              <div className="h-1 w-full rounded bg-indigo-600 dark:bg-indigo-500" />
            </div>
          </div>

          <h1 className="text-xl font-semibold mb-2">Create your username</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Pick a unique username for your profile
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">
                Username
              </label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="alex"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 w-full"
            >
              {loading ? 'Finish…' : 'Finish'}
            </Button>
          </form>

          {/* Dots */}
          <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 dark:text-slate-600">
            <span className="inline-block w-8 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500" />
            <span className="inline-block w-8 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500" />
            <span className="inline-block w-8 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
