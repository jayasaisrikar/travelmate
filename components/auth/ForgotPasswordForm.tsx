'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Brand } from '@/components/common/Brand';
import { Button } from '@/components/ui/button';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/recover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to send reset email');
      }

      setMessage(
        data?.message ||
          'Check your email for a password reset link (it may take a minute to arrive). Then come back here to log in.'
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="flex flex-col justify-between border-2 border-ink bg-secondary p-8 text-secondary-foreground shadow-brutal-lg">
            <div>
              <Brand href="/" className="mb-8" />
              <h1 className="text-headline text-secondary-foreground">Reset your password.</h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-secondary-foreground/70">
                We&apos;ll send a secure link to your email. Open it to set a new password and return to your account.
              </p>
            </div>

            <div className="mt-8 space-y-3">
              {[
                'The link goes to your reset screen.',
                'You can log back in after changing it.',
                'Passwords are handled through Supabase auth.',
              ].map(item => (
                <div key={item} className="border-2 border-secondary-foreground/20 bg-secondary-foreground/5 px-4 py-3 text-sm font-medium">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="surface-brutal p-6 sm:p-8">
            <div className="flex items-center justify-between border-b-2 border-ink pb-4">
              <div>
                <div className="eyebrow">Password reset</div>
                <h2 className="mt-1 text-title">Send reset link</h2>
              </div>
              <div className="h-10 w-10 border-2 border-ink bg-primary" />
            </div>

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
                {loading ? 'Sending…' : 'Send reset email'}
              </Button>
            </form>

            <div className="mt-6 border-t-2 border-ink pt-4 text-sm text-muted-foreground">
              <span>
                Remembered it?{' '}
                <Link href="/login" className="font-bold text-primary underline">Back to login</Link>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
