'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled route error:', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9F9FC] px-4 text-[#3F3D56]">
      <div className="w-full max-w-md rounded-[28px] border border-[#f0d7de] bg-white p-8 text-center shadow-[0_16px_48px_rgba(46,40,51,0.06)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-[#f0d7de] bg-[#FFF0F4] text-[#C14D72]">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-2xl font-black tracking-tight">Something went off course</h1>
        <p className="mt-3 text-sm leading-6 text-[#6F6C82]">
          An unexpected error interrupted this page. Your trips and data are safe — try again, or head back to your dashboard.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs text-[#8A869C]">Error reference: {error.digest}</p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-[#6C63FF] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#5A51F0]"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="rounded-full border border-[#DDDCE8] bg-white px-5 py-2.5 text-sm font-bold text-[#3F3D56] hover:border-[#6C63FF]/40 hover:text-[#6C63FF]"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
