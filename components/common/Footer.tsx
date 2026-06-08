import Link from 'next/link';
import { Brand } from './Brand';
import { CookiePreferencesButton } from './CookiePreferencesButton';

interface FooterProps {
  className?: string;
}

export function Footer({ className = '' }: FooterProps) {
  return (
    <footer className={`border-t border-white/60 px-4 py-8 sm:px-6 ${className}`.trim()}>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-[#6F6C82] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Brand href="/" compact className="shrink-0" />
          <p>© 2026 wayflo</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/dashboard" className="transition hover:text-[#3F3D56]">
            Dashboard
          </Link>
          <Link href="/dashboard/onboarding" className="transition hover:text-[#3F3D56]">
            New trip
          </Link>
          <Link href="/privacy-policy" className="transition hover:text-[#3F3D56]">
            Privacy
          </Link>
          <Link href="/terms-of-service" className="transition hover:text-[#3F3D56]">
            Terms
          </Link>
          <CookiePreferencesButton className="transition hover:text-[#3F3D56]" />
        </div>
      </div>
    </footer>
  );
}
