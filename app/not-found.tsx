import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page not found',
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9F9FC] px-4 text-[#3F3D56]">
      <div className="w-full max-w-md rounded-[28px] border border-[#DDDCE8] bg-white p-8 text-center shadow-[0_16px_48px_rgba(46,40,51,0.06)]">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8A869C]">404</div>
        <h1 className="mt-2 text-2xl font-black tracking-tight">This route isn&rsquo;t on the map</h1>
        <p className="mt-3 text-sm leading-6 text-[#6F6C82]">
          The page you&rsquo;re looking for doesn&rsquo;t exist, was moved, or is no longer shared.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-[#6C63FF] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#5A51F0]"
          >
            Back to home
          </Link>
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
