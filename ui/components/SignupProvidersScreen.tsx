import { Button } from './ui/button';
import { Github, Mail, MessageSquare } from 'lucide-react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { API_BASE, setToken, setCurrentUser } from '../lib/api';

interface SignupProvidersScreenProps {
  onChooseEmail: () => void;
  onChooseProvider: (provider: 'github' | 'google' | 'slack') => void;
  onSkip: () => void;
}

export function SignupProvidersScreen({ onChooseEmail, onChooseProvider, onSkip }: SignupProvidersScreenProps) {
  // Listen for OAuth completion messages from popup
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const data = (e && (e as any).data) || null;
      // If verification is required, route to email verification
      if (data && data.type === 'oauth' && data.verificationRequired) {
        try {
          toast.message('Check your email for a verification code');
          const email = data.email || data.user?.email;
          const needsUsername = !!data.created;
          window.dispatchEvent(new CustomEvent('auth:verification_required', { detail: { email, needsUsername, provider: data.provider } }));
        } catch {}
        return;
      }
      if (data && data.type === 'oauth' && data.token) {
        try {
          setToken(data.token);
          if (data.user) setCurrentUser(data.user);
        } catch {}
        const userEmail = data.user?.email;
        const userVerified = !!(data.user && (data.user.isVerified || data.user.verified));
        const isNewUser = !!data.created;
        if (!userVerified) {
          toast.message('Verify your email to finish signing in');
          try {
            window.dispatchEvent(new CustomEvent('auth:needs_verification', { detail: { email: userEmail, needsUsername: isNewUser } }));
          } catch {}
          return;
        }
        toast.success(`Welcome, ${data.user?.username || data.user?.email || 'user'}!`);
        try {
          if (isNewUser) {
            window.dispatchEvent(new CustomEvent('auth:needs_username'));
          } else {
            window.dispatchEvent(new CustomEvent('auth:logged_in'));
          }
        } catch {}
      }
    };
    window.addEventListener('message', handler as any);
    return () => window.removeEventListener('message', handler as any);
  }, []);

  function startProvider(provider: 'github' | 'google' | 'slack') {
    const url = `${API_BASE}/users/oauth/${provider}/start?origin=${encodeURIComponent(window.location.origin)}`;
    window.open(url, 'oauth', 'width=600,height=700');
  }

  // Header
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
              <span>Step 1 of 3</span>
              <span>33%</span>
            </div>
            <div className="mt-2 h-1 rounded bg-slate-200 dark:bg-slate-800">
              <div className="h-1 w-1/3 rounded bg-indigo-600 dark:bg-indigo-500" />
            </div>
          </div>

          <h1 className="text-xl font-semibold mb-2">Welcome to Planara</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">Choose how you'd like to sign up and get started</p>

          <div className="space-y-3">
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

          <div className="mt-6 text-center">
            <Button variant="ghost" className="text-slate-600 dark:text-slate-400" onClick={onSkip}>
              Skip for now
            </Button>
          </div>

          <div className="mt-6 text-center">
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={onChooseEmail}>
              Sign up with email
            </Button>
          </div>

          {/* Dots */}
          <div className="mt-8 flex items-center justify-center gap-2 text-slate-400 dark:text-slate-600">
            <span className="inline-block w-8 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500" />
            <span className="inline-block w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
            <span className="inline-block w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
          </div>
        </div>
      </div>
    </div>
  );
}