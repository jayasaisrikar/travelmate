import Link from 'next/link';
import { Brand } from './Brand';
import { CookiePreferencesButton } from './CookiePreferencesButton';

interface FooterProps {
  className?: string;
}

export function Footer({ className = '' }: FooterProps) {
  return (
    <footer className={`border-t border-white/60 px-4 py-8 sm:px-6 ${className}`.trim()}>
      <div className="mx-auto flex max-w-6xl flex-col gap-5 text-sm text-[#7c6a72] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Brand href="/" compact className="shrink-0" />
          <p className="shrink-0">© 2026 wayflo</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
          <Link href="/dashboard" className="transition hover:text-[#3a2540]">
            Dashboard
          </Link>
          <Link href="/dashboard/onboarding" className="transition hover:text-[#3a2540]">
            New trip
          </Link>
          <Link href="/privacy-policy" className="transition hover:text-[#3a2540]">
            Privacy
          </Link>
          <Link href="/terms-of-service" className="transition hover:text-[#3a2540]">
            Terms
          </Link>
          <CookiePreferencesButton className="transition hover:text-[#3a2540]" />
        </div>
      </div>
    </footer>
  );
}
