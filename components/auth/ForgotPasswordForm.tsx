'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Brand } from '@/components/common/Brand';

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

      setMessage(data?.message || 'Check your email for a password reset link.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
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
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">Reset your password</h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-[#7c6a72]">
              We will send a secure link to your email. Open it to set a new password and return to your account.
            </p>

            <div className="mt-8 space-y-3">
              {[
                'The link goes to your reset screen.',
                'You can log back in after changing it.',
                'Passwords are handled through Supabase auth.',
              ].map(item => (
                <div key={item} className="border border-[#eaddc7] bg-[#fffbf2] px-4 py-3 text-sm font-medium text-[#3a2540]">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[#3a2540] bg-white p-6 shadow-none sm:p-8">
            <div className="flex items-center justify-between border-b border-[#eaddc7] pb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-[#9b8b92]">Password reset</div>
                <h2 className="mt-1 text-2xl font-black tracking-tight">Send reset link</h2>
              </div>
              <div className="h-10 w-10 border border-[#3a2540] bg-[#ea580c]" />
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-[#7c6a72]">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  required
                  className="w-full border border-[#3a2540] bg-[#fffbf2] px-4 py-3 text-base text-[#3a2540] outline-none placeholder:text-[#9b8b92] focus:bg-white"
                  placeholder="you@example.com"
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
                {loading ? 'Sending...' : 'Send reset email'}
              </button>
            </form>

            <div className="mt-6 border-t border-[#eaddc7] pt-4 text-sm text-[#7c6a72]">
              <span>
                Remembered it?{' '}
                <Link href="/login" className="font-semibold text-[#3a2540] underline">
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
