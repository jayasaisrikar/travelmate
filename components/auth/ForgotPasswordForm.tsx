'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/services/supabase-browser';

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
      const { error: resetError } = await supabaseBrowser.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        throw resetError;
      }

      setMessage('Check your email for a password reset link.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfaf7] px-4 py-8 text-[#2e2833] sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="border border-[#2e2833] bg-white p-6 shadow-none sm:p-8">
            <div className="inline-flex border border-[#2e2833] bg-[#f6d23c] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-[#2e2833]">
              TravelMate
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">Reset your password</h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-[#756978]">
              We will send a secure link to your email. Open it to set a new password and return to your account.
            </p>

            <div className="mt-8 space-y-3">
              {[
                'The link goes to your reset screen.',
                'You can log back in after changing it.',
                'Passwords are handled through Supabase auth.',
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
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#a79aaa]">Password reset</div>
                <h2 className="mt-1 text-2xl font-black tracking-tight">Send reset link</h2>
              </div>
              <div className="h-10 w-10 border border-[#2e2833] bg-[#5aa7e8]" />
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
                {loading ? 'Sending...' : 'Send reset email'}
              </button>
            </form>

            <div className="mt-6 border-t border-[#eadde5] pt-4 text-sm text-[#756978]">
              <span>
                Remembered it?{' '}
                <Link href="/login" className="font-semibold text-[#2e2833] underline">
                  Back to login
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
