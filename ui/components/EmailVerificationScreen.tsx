import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { toast } from 'sonner';
import {
  sendVerificationCode,
  verifyEmailCode,
  getVerificationStatus,
  getCurrentUser,
  setCurrentUser,
} from '@lib/api';
import { isOffline, waitForOnline } from '@lib/network';
import { OtpInput } from './OtpInput';

interface EmailVerificationScreenProps {
  email?: string;
  onVerified: () => void;
  onCancel: () => void;
}

export function EmailVerificationScreen({
  email: initialEmail,
  onVerified,
  onCancel,
}: EmailVerificationScreenProps) {
  const [email, setEmail] = useState(initialEmail || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sent' | 'verifying' | 'verified'>('idle');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ariaMessage, setAriaMessage] = useState('');
  const pendingAction = useRef<null | 'send' | 'verify'>(null);

  const now = Date.now();
  const cooldownSeconds = useMemo(() => {
    if (!cooldownUntil) return 0;
    const diff = Math.max(0, Math.ceil((cooldownUntil.getTime() - now) / 1000));
    return diff;
  }, [cooldownUntil, now]);

  const expirySeconds = useMemo(() => {
    if (!expiresAt) return 0;
    const diff = Math.max(0, Math.ceil((expiresAt.getTime() - now) / 1000));
    return diff;
  }, [expiresAt, now]);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  // tick timers
  useEffect(() => {
    const id = setInterval(() => {
      // force re-render to update useMemo values
      setAriaMessage((m) => m);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-send verification code when we land on this screen with an email
  useEffect(() => {
    if (!email) return;
    if (status !== 'idle') return;
    (async () => {
      try {
        setLoading(true);
        // Offline-aware: wait until back online before attempting
        if (isOffline()) {
          toast.message("You're offline — will send when back online.");
          setAriaMessage('Offline. Will retry sending when online.');
          await waitForOnline(120000);
        }
        const res = await sendVerificationCode(email);
        setStatus('sent');
        setErrorMsg(null);
        setAttempts(0);
        // Server-provided expiry
        if (res?.expiresAt) setExpiresAt(new Date(res.expiresAt));
        // Client-side resend cooldown: 60s
        setCooldownUntil(new Date(Date.now() + 60_000));
        if (res?.devCode) toast.message(`Dev code: ${res.devCode}`);
        toast.message('Verification code sent');
        setAriaMessage('Verification code sent');
      } catch (err: any) {
        const msg = err?.message || 'Failed to send verification code';
        toast.error(msg);
        setErrorMsg(msg);
        setAriaMessage('Error sending verification code');
      } finally {
        setLoading(false);
      }
    })();
  }, [email, status]);

  async function handleSendCode() {
    const normalized = String(email || '')
      .trim()
      .toLowerCase();
    if (!normalized) {
      toast.error('Enter your email');
      setErrorMsg('Please enter your email address');
      return;
    }
    setLoading(true);
    try {
      if (isOffline()) {
        toast.message("You're offline — will send when back online.");
        setAriaMessage('Offline. Will retry sending when online.');
        pendingAction.current = 'send';
        await waitForOnline(120000);
      }
      const res = await sendVerificationCode(normalized);
      setStatus('sent');
      setErrorMsg(null);
      setAttempts(0);
      if (res?.expiresAt) setExpiresAt(new Date(res.expiresAt));
      setCooldownUntil(new Date(Date.now() + 60_000));
      if (res?.devCode) toast.message(`Dev code: ${res.devCode}`);
      toast.message('Verification code sent');
      setAriaMessage('Verification code sent');
    } catch (e: any) {
      const msg = e?.message || 'Failed to send code';
      toast.error(msg);
      setErrorMsg(msg);
      setAriaMessage('Error sending verification code');
    } finally {
      pendingAction.current = null;
      setLoading(false);
    }
  }

  async function handleVerify(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setErrorMsg(null);
    const normalized = String(email || '')
      .trim()
      .toLowerCase();
    if (!normalized || !code || code.length !== 6) {
      const msg = 'Enter the 6-digit code';
      toast.error(msg);
      setErrorMsg(msg);
      return;
    }

    // Simple client-side attempt limit to prevent brute force: 5 attempts then 60s lockout
    if (attempts >= 5) {
      const msg = 'Too many attempts. Please wait 60 seconds and try again.';
      toast.error(msg);
      setErrorMsg(msg);
      setCooldownUntil(new Date(Date.now() + 60_000));
      return;
    }

    setLoading(true);
    setStatus('verifying');
    try {
      if (isOffline()) {
        toast.message("You're offline — will verify when back online.");
        setAriaMessage('Offline. Will retry verification when online.');
        pendingAction.current = 'verify';
        await waitForOnline(120000);
      }
      const res = await verifyEmailCode(normalized, code);
      if (res?.success) {
        setStatus('verified');
        toast.success('Email verified');
        setAriaMessage('Email verified');
        // Confirm status and persist verification locally
        try {
          await getVerificationStatus(normalized);
        } catch {}
        try {
          const user = getCurrentUser();
          if (user) {
            const updated = { ...user, isVerified: true };
            setCurrentUser(updated);
            window.dispatchEvent(
              new CustomEvent('auth:verified', { detail: { email: normalized } })
            );
          }
        } catch {}
        onVerified();
      } else {
        const msg = 'Invalid verification code';
        toast.error(msg);
        setErrorMsg(msg);
        setStatus('sent');
      }
    } catch (e: any) {
      const msg: string = e?.message || 'Verification failed';
      toast.error(msg);
      setErrorMsg(msg);
      setStatus('sent');

      // Map server messages to helpful UI states
      if (msg.toLowerCase().includes('expired')) {
        // Let user resend immediately if expired
        setExpiresAt(null);
        setAriaMessage('Code expired. You can request a new code.');
      } else if (msg.toLowerCase().includes('invalid')) {
        setAriaMessage('Invalid code. Please check and try again.');
      } else if (msg.toLowerCase().includes('network')) {
        setAriaMessage('Network error. Please check your connection.');
      }

      setAttempts((a) => a + 1);
    } finally {
      pendingAction.current = null;
      setLoading(false);
    }
  }

  const canResend = cooldownSeconds === 0;
  const expired = expirySeconds === 0 && !!expiresAt;

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
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            We sent a verification code to your email. Enter it below to finish signing in.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                required
              />
            </div>

            {status !== 'verified' && (
              <div className="space-y-3">
                <label className="text-xs text-slate-600 dark:text-slate-400 mb-1 block">
                  6-digit code
                </label>
                <OtpInput value={code} onChange={setCode} disabled={loading} autoFocus />

                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleSendCode}
                    disabled={loading || !canResend}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {loading
                      ? 'Sending…'
                      : canResend
                        ? 'Resend Code'
                        : `Resend in ${cooldownSeconds}s`}
                  </Button>
                  <Button
                    onClick={handleVerify}
                    disabled={loading || code.length !== 6}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? 'Verifying…' : 'Verify'}
                  </Button>
                  <Button variant="outline" onClick={onCancel} disabled={loading}>
                    Cancel
                  </Button>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 flex gap-4">
                  {expiresAt && !expired && (
                    <span>
                      Code expires in {Math.floor(expirySeconds / 60)}m {expirySeconds % 60}s
                    </span>
                  )}
                  {expired && (
                    <span className="text-amber-600 dark:text-amber-400">
                      Code expired — request a new one.
                    </span>
                  )}
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="rounded-md border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200 p-2 text-xs"
                  >
                    {errorMsg}
                  </div>
                )}
                <div aria-live="polite" className="sr-only">
                  {ariaMessage}
                </div>
              </div>
            )}

            {status === 'verified' && (
              <div
                role="status"
                aria-live="polite"
                className="rounded-lg bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-200 p-3 text-sm"
              >
                Email verified. Redirecting…
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}