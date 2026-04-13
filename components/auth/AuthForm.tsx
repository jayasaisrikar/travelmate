'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/services/supabase-browser';
import { Brand } from '@/components/common/Brand';

type AuthMode = 'login' | 'signup';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@travelmate.com').trim().toLowerCase();

interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authNotice = useMemo(() => searchParams.get('message'), [searchParams]);
  const nextPath = useMemo(() => searchParams.get('next') || '/dashboard/onboarding', [searchParams]);
  const safeNextPath = nextPath.startsWith('/') ? nextPath : '/dashboard/onboarding';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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

      setMessage(data?.message || 'Check your email to confirm your account.');
      router.replace('/login?message=verify-email');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfaf7] px-4 py-8 text-[#2e2833] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="border border-[#2e2833] bg-white p-6 shadow-none sm:p-8">
            <Brand href="/" className="mb-5" />
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
              {mode === 'login' ? 'Log in to TravelMate' : 'Create your TravelMate account'}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-[#756978]">
              {mode === 'login'
                ? 'Use your account to save trips, reopen itineraries, and keep your planning history in one place.'
                : 'Create an account to save trips, revisit them later, and keep your planning history in one place.'}
            </p>

            {noticeMessage && (
              <div className="mt-6 border border-[#f6d23c] bg-[#fff8e6] px-4 py-3 text-sm font-medium text-[#2e2833]">
                {noticeMessage}
              </div>
            )}

            <div className="mt-8 space-y-3">
              {[
                mode === 'login' ? 'Saved trips stay in your account.' : 'Accounts are confirmed by email before login.',
                'Trip planning works after sign in.',
                'You can sign out from the dashboard when you are done.',
              ].map(item => (
                <div key={item} className="border border-[#eadde5] bg-[#fffdf9] px-4 py-3 text-sm font-medium text-[#2e2833]">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[#2e2833] bg-white p-6 shadow-none sm:p-8">
            <div className="flex items-center justify-between border-b border-[#eadde5] pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#a79aaa]">
                  {mode === 'login' ? 'Login' : 'Signup'}
                </div>
                <h2 className="mt-1 text-2xl font-black tracking-tight">
                  {mode === 'login' ? 'Welcome back' : 'Set up your account'}
                </h2>
              </div>
              <div className="h-10 w-10 border border-[#2e2833] bg-[#f6d23c]" />
            </div>

            <div className="mt-6 border border-[#2e2833] bg-[#fffdf9] px-4 py-3 text-sm font-medium text-[#2e2833]">
              {mode === 'login'
                ? 'All user accounts can sign in here. Admin logs in with the control account and lands on the dashboard.'
                : 'Create your account here to start saving travel plans.'}
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#756978]">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  required
                  className="w-full border border-[#2e2833] bg-[#fffdf9] px-4 py-3 text-base text-[#2e2833] outline-none placeholder:text-[#a79aaa] focus:bg-white"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#756978]">
                    Password
                  </label>
                  {mode === 'login' ? (
                    <Link href="/forgot-password" className="text-xs font-semibold text-[#2e2833] underline">
                      Forgot password?
                    </Link>
                  ) : null}
                </div>
                <input
                  type="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  required
                  minLength={6}
                  className="w-full border border-[#2e2833] bg-[#fffdf9] px-4 py-3 text-base text-[#2e2833] outline-none placeholder:text-[#a79aaa] focus:bg-white"
                  placeholder="At least 6 characters"
                />
              </div>

              {error && (
                <div className="border border-[#a65372] bg-[#fff3f7] px-4 py-3 text-sm font-medium text-[#a65372]">
                  {error}
                </div>
              )}

              {message && (
                <div className="border border-[#5aa7e8] bg-[#eef7ff] px-4 py-3 text-sm font-medium text-[#2e2833]">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full border border-[#2e2833] bg-[#2e2833] px-4 py-3 font-semibold text-white transition hover:bg-[#1f1b23] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 border-t border-[#eadde5] pt-4 text-sm text-[#756978]">
              {mode === 'login' ? (
                <span>
                  Forgot the password?{' '}
                  <Link href="/forgot-password" className="font-semibold text-[#2e2833] underline">
                    Reset it here
                  </Link>
                </span>
              ) : (
                <span>
                  Already have an account?{' '}
                  <Link href={`/login?next=${encodeURIComponent(safeNextPath)}`} className="font-semibold text-[#2e2833] underline">
                    Log in
                  </Link>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
