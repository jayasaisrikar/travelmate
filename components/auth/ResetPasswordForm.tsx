'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/services/supabase-browser';
import { Brand } from '@/components/common/Brand';
import { Button } from '@/components/ui/button';

export function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data } = await getSupabaseBrowser().auth.getSession();

      if (!mounted) {
        return;
      }

      if (!data.session) {
        setError('Open the password reset link from your email first.');
        setChecking(false);
        return;
      }

      setReady(true);
      setChecking(false);
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match.');
      }

      const { error: updateError } = await getSupabaseBrowser().auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      await getSupabaseBrowser().auth.signOut();
      router.replace('/login?message=password-updated');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="flex flex-col justify-center border-2 border-ink bg-secondary p-8 text-secondary-foreground shadow-brutal-lg">
            <Brand href="/" className="mb-8" />
            <h1 className="text-headline text-secondary-foreground">Set a new password.</h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-secondary-foreground/70">
              Choose a new password for your wayflo account. After saving, you&apos;ll be sent back to the login page.
            </p>
          </div>

          <div className="surface-brutal p-6 sm:p-8">
            <div className="flex items-center justify-between border-b-2 border-ink pb-4">
              <div>
                <div className="eyebrow">New password</div>
                <h2 className="mt-1 text-title">Reset form</h2>
              </div>
              <div className="h-10 w-10 border-2 border-ink bg-accent" />
            </div>

            {checking && (
              <div className="mt-6 border-2 border-ink bg-muted px-4 py-3 text-sm font-medium">
                Checking your reset session…
              </div>
            )}

            {!checking && ready && (() => {
              const mismatch =
                confirmPassword.length > 0 && password !== confirmPassword;
              const fieldBase =
                'w-full rounded-md border-2 bg-background px-4 py-3 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-offset-2 focus:ring-offset-background';
              const okField = `${fieldBase} border-ink focus:ring-ring`;
              const errField = `${fieldBase} border-destructive focus:ring-destructive`;
              return (
              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    New password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    required
                    minLength={6}
                    className={mismatch ? errField : okField}
                    placeholder="At least 6 characters"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    required
                    minLength={6}
                    className={mismatch ? errField : okField}
                    placeholder="Repeat the new password"
                    aria-invalid={mismatch}
                  />
                  {mismatch && (
                    <p className="mt-2 text-xs font-semibold text-destructive">
                      Passwords don’t match yet.
                    </p>
                  )}
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

                <Button type="submit" variant="brutal" size="lg" disabled={loading || mismatch} className="w-full">
                  {loading ? 'Updating…' : 'Save new password'}
                </Button>
              </form>
              );
            })()}

            {!checking && !ready && (
              <div className="mt-6 border-2 border-ink bg-muted px-4 py-3 text-sm font-medium">
                <Link href="/forgot-password" className="font-bold text-primary underline">
                  Request a new reset link
                </Link>
              </div>
            )}

            <div className="mt-6 border-t-2 border-ink pt-4 text-sm text-muted-foreground">
              <Link href="/login" className="font-bold text-primary underline">
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
