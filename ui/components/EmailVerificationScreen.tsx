import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { toast } from 'sonner';
import { sendVerificationCode, verifyEmailCode, getVerificationStatus, getCurrentUser, setCurrentUser } from '@lib/api';

interface EmailVerificationScreenProps {
  email?: string;
  onVerified: () => void;
  onCancel: () => void;
}

export function EmailVerificationScreen({ email: initialEmail, onVerified, onCancel }: EmailVerificationScreenProps) {
  const [email, setEmail] = useState(initialEmail || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sent' | 'verifying' | 'verified'>('idle');

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  // Auto-send verification code when we land on this screen with an email
  useEffect(() => {
    if (!email) return;
    if (status !== 'idle') return;
    (async () => {
      try {
        setLoading(true);
        await sendVerificationCode(email);
        setStatus('sent');
        toast.message('Verification code sent');
      } catch (err: any) {
        toast.error(err?.message || 'Failed to send verification code');
      } finally {
        setLoading(false);
      }
    })();
  }, [email, status]);

  async function handleSendCode() {
    if (!email) { toast.error('Enter your email'); return; }
    setLoading(true);
    try {
      await sendVerificationCode(email);
      setStatus('sent');
      toast.message('Verification code sent');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !code || code.length !== 6) { toast.error('Enter the 6-digit code'); return; }
    setLoading(true);
    setStatus('verifying');
    try {
      const res = await verifyEmailCode(email, code);
      if (res?.success) {
        setStatus('verified');
        toast.success('Email verified');
        // Confirm status and persist verification locally
        try { await getVerificationStatus(email); } catch {}
        try {
          const user = getCurrentUser();
          if (user) {
            const updated = { ...user, isVerified: true };
            setCurrentUser(updated);
            window.dispatchEvent(new CustomEvent('auth:verified', { detail: { email } }));
          }
        } catch {}
        onVerified();
      } else {
        toast.error('Invalid code');
        setStatus('sent');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Verification failed');
      setStatus('sent');
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
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
          <h1 className="text-xl font-semibold mb-2">Verify your email</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">We sent a verification code to your email. Enter it below to finish signing in.</p>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alex@example.com" required />
            </div>

            {status !== 'verified' && (
              <div className="space-y-2">
                <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">6-digit code</label>
                <Input type="text" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g,''))} placeholder="123456" maxLength={6} />

                <div className="flex items-center gap-3">
                  <Button onClick={handleSendCode} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">{loading ? 'Sending…' : 'Send Code'}</Button>
                  <Button onClick={handleVerify} disabled={loading || code.length !== 6} className="bg-green-600 hover:bg-green-700">{loading ? 'Verifying…' : 'Verify'}</Button>
                  <Button variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
                </div>
              </div>
            )}

            {status === 'verified' && (
              <div className="rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-200 p-3 text-sm">Email verified. Redirecting…</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}