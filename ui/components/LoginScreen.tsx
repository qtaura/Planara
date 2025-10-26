import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { Github, Mail, MessageSquare } from 'lucide-react';
import { login, setToken, API_BASE, setCurrentUser, setRefreshToken } from '@lib/api';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './Logo';

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
      if (data && data.type === 'oauth' && (data.token || data.verificationRequired)) {
        try {
          if (data.token) setToken(data.token);
          if (data.user) setCurrentUser(data.user);
        } catch {}
        if (data.verificationRequired) {
          toast.message('Verify your email to complete sign-in');
          const email = data.email || data.user?.email;
          const needsUsername = !!data.created;
          try {
            window.dispatchEvent(
              new CustomEvent('auth:needs_verification', {
                detail: { email, needsUsername, provider: data.provider },
              })
            );
          } catch {}
        } else {
          toast.success(`Welcome, ${data.user?.username || data.user?.email || 'user'}!`);
          try {
            window.dispatchEvent(new CustomEvent('auth:logged_in'));
          } catch {}
          onSuccess();
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onSuccess]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { token, user, refreshToken } = await login(usernameOrEmail, password);
      setToken(token);
      setCurrentUser(user);
      if (refreshToken) setRefreshToken(refreshToken);

      if (user && (user.isVerified || user.verified)) {
        toast.success(`Welcome back, ${user.username || user.email || 'user'}!`);
        window.dispatchEvent(new CustomEvent('auth:logged_in'));
        onSuccess();
      } else {
        toast.message('Verify your email to complete sign-in');
        const email = user?.email;
        try {
          window.dispatchEvent(
            new CustomEvent('auth:needs_verification', { detail: { email, needsUsername: false } })
          );
        } catch {}
      }
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
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0A0A0A]">
      <div className="w-full max-w-sm p-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0A0A0A] shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <Logo />
          <ThemeToggle />
        </div>
        <h1 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Sign in</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="Username or email"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              className="bg-white dark:bg-[#0A0A0A]"
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onKeyUp={handlePasswordKeyEvent}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white dark:bg-[#0A0A0A]"
            />
            {capsLockOn && (
              <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">Caps Lock is on</p>
            )}
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className="mt-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Or sign in with</p>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={() => startProvider('github')}>
              <Github className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => startProvider('google')}>
              <Mail className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => startProvider('slack')}>
              <MessageSquare className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}