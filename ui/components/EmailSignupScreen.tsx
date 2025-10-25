import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { toast } from 'sonner';
import { signup, setCurrentUser } from '@lib/api';

interface EmailSignupScreenProps {
  onNext: (data: { email: string; password: string }) => void;
}

export function EmailSignupScreen({ onNext }: EmailSignupScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function generateTempUsername(email: string) {
    const base = String(email.split('@')[0] || 'user').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 12);
    const suffix = Math.random().toString(36).slice(2, 8);
    return `${base || 'user'}_${suffix}`.toLowerCase();
  }

  function isValidEmail(value: string): boolean {
    return /.+@.+\..+/.test(String(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setEmailError(null);

    if (!isValidEmail(email)) {
      const msg = 'Invalid email address';
      setEmailError(msg);
      toast.error(msg);
      return;
    }
    if (!password) {
      const msg = 'Password is required';
      setFormError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      const tempUsername = generateTempUsername(email);
      const res = await signup({ username: tempUsername, email, password });
      if (res?.user) {
        try { setCurrentUser(res.user); } catch {}
      }
      onNext({ email, password });
    } catch (err: any) {
      const raw = String(err?.message || 'Could not start email signup');
      let msg = raw;
      const lower = raw.toLowerCase();
      if (lower.includes('banned')) msg = 'This email is banned from signing up';
      else if (lower.includes('already exists')) msg = 'Username or email already exists';
      else if (lower.includes('required')) msg = 'username, email and password are required';
      else if (lower.includes('network')) msg = 'Network error during signup. Please try again.';
      setFormError(msg);
      toast.error(msg);
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
              <span>Step 2 of 3</span>
              <span>66%</span>
            </div>
            <div className="mt-2 h-1 rounded bg-slate-200 dark:bg-slate-800">
              <div className="h-1 w-2/3 rounded bg-indigo-600 dark:bg-indigo-500" />
            </div>
          </div>

          <h1 className="text-xl font-semibold mb-2">Sign up with email</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">We will verify your email and secure your account</p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@example.com" required aria-invalid={!!emailError} aria-describedby={emailError ? 'email-error' : undefined} />
              {emailError && (
                <p id="email-error" className="mt-1 text-xs text-red-600 dark:text-red-400">{emailError}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {formError && (
              <div role="alert" aria-live="polite" className="rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200 p-3 text-xs">{formError}</div>
            )}
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 w-full">
              {loading ? 'Continue…' : 'Continue'}
            </Button>
          </form>

          {/* Dots */}
          <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 dark:text-slate-600">
            <span className="inline-block w-8 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500" />
            <span className="inline-block w-8 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500" />
            <span className="inline-block w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
          </div>
        </div>
      </div>
    </div>
  );
}