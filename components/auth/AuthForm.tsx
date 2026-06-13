'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/services/supabase-browser';
import { Brand } from '@/components/common/Brand';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';

type AuthMode = 'login' | 'signup';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@wayflo.app').trim().toLowerCase();

interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authNotice = useMemo(() => searchParams.get('message'), [searchParams]);
  const nextPath = useMemo(() => searchParams.get('next') || '/dashboard', [searchParams]);
  const safeNextPath = nextPath.startsWith('/') ? nextPath : '/dashboard';
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const toast = useToast();

  useEffect(() => {
    let mounted = true;

    const redirectIfAuthenticated = async () => {
      try {
        const { data } = await getSupabaseBrowser().auth.getSession();

        if (!mounted) {
          return;
        }

        if (data.session) {
          router.replace('/dashboard');
          return;
        }
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    };

    void redirectIfAuthenticated();

    return () => {
      mounted = false;
    };
  }, [router]);

  const noticeMessage =
    authNotice === 'admin-only'
      ? 'Admin dashboard access is reserved for the control account.'
      : authNotice === 'verify-email'
        ? 'Check your email to confirm your account before logging in.'
      : authNotice === 'password-updated'
        ? 'Your password was updated. Please log in again.'
        : '';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'login') {
        const isAdminLogin = email.trim().toLowerCase() === ADMIN_EMAIL;

        if (isAdminLogin) {
          const bootstrapResponse = await fetch('/api/auth/admin/bootstrap', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          const bootstrapData = await bootstrapResponse.json().catch(() => null);

          if (!bootstrapResponse.ok) {
            throw new Error(bootstrapData?.error || 'Failed to prepare admin account');
          }
        }

        const { error: signInError } = await getSupabaseBrowser().auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        router.replace(isAdminLogin ? '/dashboard' : safeNextPath);
        router.refresh();
        return;
      }

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to create account');
      }

      const confirmation = data?.message || 'Check your email to confirm your account.';
      setMessage(confirmation);
      toast.success(confirmation);
      router.replace('/login?message=verify-email');
    } catch (err: unknown) {
      const messageText = err instanceof Error ? err.message : 'Authentication failed';
      setError(messageText);
      toast.error(messageText);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="surface-brutal px-6 py-5 font-semibold">Checking your session…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          {/* ── Editorial left panel ── */}
          <div className="flex flex-col justify-between border-2 border-ink bg-secondary p-8 text-secondary-foreground shadow-brutal-lg">
            <div>
              <Brand href="/" className="mb-8" />
              <h1 className="text-headline text-secondary-foreground">
                {mode === 'login' ? 'Log in to wayflo.' : 'Create your wayflo account.'}
              </h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-secondary-foreground/70">
                {mode === 'login'
                  ? 'Save trips, reopen itineraries, and keep your planning history in one place.'
                  : 'Save trips, revisit them later, and keep your planning history in one place.'}
              </p>
            </div>

            <div className="mt-8 space-y-3">
              {[
                mode === 'login' ? 'Saved trips stay in your account.' : 'Accounts are confirmed by email before login.',
                'Trip planning works after sign in.',
                'Sign out from the dashboard when you are done.',
              ].map(item => (
                <div key={item} className="border-2 border-secondary-foreground/20 bg-secondary-foreground/5 px-4 py-3 text-sm font-medium">
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* ── Form panel ── */}
          <div className="surface-brutal p-6 sm:p-8">
            <div className="flex items-center justify-between border-b-2 border-ink pb-4">
              <div>
                <div className="eyebrow">{mode === 'login' ? 'Login' : 'Signup'}</div>
                <h2 className="mt-1 text-title">{mode === 'login' ? 'Welcome back' : 'Set up your account'}</h2>
              </div>
              <div className="h-10 w-10 border-2 border-ink bg-accent" />
            </div>

            {noticeMessage && (
              <div className="mt-6 border-2 border-ink bg-accent/20 px-4 py-3 text-sm font-semibold">
                {noticeMessage}
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  required
                  className="w-full rounded-md border-2 border-ink bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Password</label>
                  {mode === 'login' && (
                    <Link href="/forgot-password" className="text-xs font-bold text-primary underline">Forgot password?</Link>
                  )}
                </div>
                <input
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-md border-2 border-ink bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                  placeholder="At least 6 characters"
                />
              </div>

              {error && (
                <div role="alert" className="border-2 border-destructive bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                  ✕ {error}
                </div>
              )}

              {message && !error && (
                <div role="status" className="border-2 border-primary bg-primary/10 px-4 py-3 text-sm font-semibold text-foreground">
                  ✓ {message}
                </div>
              )}

              <Button type="submit" variant="brutal" size="lg" disabled={loading} className="w-full">
                {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
              </Button>
            </form>

            <div className="mt-6 border-t-2 border-ink pt-4 text-sm text-muted-foreground">
              {mode === 'login' ? (
                <span>
                  New here?{' '}
                  <Link href="/signup" className="font-bold text-primary underline">Create an account</Link>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <Link href={`/login?next=${encodeURIComponent(safeNextPath)}`} className="font-bold text-primary underline">Log in</Link>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
