'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/services/supabase-browser';
import { Brand } from '@/components/common/Brand';

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
    <div className="min-h-screen bg-[#fbf4ea] px-4 py-8 text-[#3a2540] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="border border-[#3a2540] bg-white p-6 shadow-none sm:p-8">
            <Brand href="/" className="mb-5" />
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">Set a new password</h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-[#7c6a72]">
              Choose a new password for your wayflo account. After saving, you will be sent back to the login page.
            </p>
          </div>

          <div className="border border-[#3a2540] bg-white p-6 shadow-none sm:p-8">
            <div className="flex items-center justify-between border-b border-[#eaddc7] pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#9b8b92]">New password</div>
                <h2 className="mt-1 text-2xl font-black tracking-tight">Reset form</h2>
              </div>
              <div className="h-10 w-10 border border-[#3a2540] bg-[#f43f5e]" />
            </div>

            {checking && (
              <div className="mt-6 border border-[#eaddc7] bg-[#fffbf2] px-4 py-3 text-sm font-medium text-[#3a2540]">
                Checking your reset session...
              </div>
            )}

            {!checking && ready && (
              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#7c6a72]">
                    New password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    required
                    minLength={6}
                    className="w-full border border-[#3a2540] bg-[#fffbf2] px-4 py-3 text-base text-[#3a2540] outline-none placeholder:text-[#9b8b92] focus:bg-white"
                    placeholder="At least 6 characters"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#7c6a72]">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    required
                    minLength={6}
                    className="w-full border border-[#3a2540] bg-[#fffbf2] px-4 py-3 text-base text-[#3a2540] outline-none placeholder:text-[#9b8b92] focus:bg-white"
                    placeholder="Repeat the new password"
                  />
                </div>

                {error && (
                  <div className="border border-[#be123c] bg-[#ffe4e6] px-4 py-3 text-sm font-medium text-[#be123c]">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="border border-[#ea580c] bg-[#ffedd5] px-4 py-3 text-sm font-medium text-[#3a2540]">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full border border-[#3a2540] bg-[#3a2540] px-4 py-3 font-semibold text-white transition hover:bg-[#2c1b33] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Updating...' : 'Save new password'}
                </button>
              </form>
            )}

            {!checking && !ready && (
              <div className="mt-6 border border-[#eaddc7] bg-[#fffbf2] px-4 py-3 text-sm font-medium text-[#3a2540]">
                <Link href="/forgot-password" className="underline">
                  Request a new reset link
                </Link>
              </div>
            )}

            <div className="mt-6 border-t border-[#eaddc7] pt-4 text-sm text-[#7c6a72]">
              <Link href="/login" className="font-semibold text-[#3a2540] underline">
                Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
