'use client';

import Link from 'next/link';
import clsx from 'clsx';

interface BrandProps {
  href?: string;
  className?: string;
  showWordmark?: boolean;
  compact?: boolean;
  asLink?: boolean;
}

function WayfloMark({ compact = false }: { compact?: boolean }) {
  const sizeClass = compact ? 'h-10 w-10' : 'h-12 w-12';

  return (
    <svg
      viewBox="0 0 56 56"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx(sizeClass, 'shrink-0 drop-shadow-[0_12px_24px_rgba(108,99,255,0.2)]')}
      aria-hidden="true"
    >
      <rect width="56" height="56" rx="14" fill="#6C63FF" />
      <path d="M14 28 Q20 18 28 22 Q36 26 42 16" stroke="#FF6584" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path
        d="M14 34 Q20 24 28 28 Q36 32 42 22"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
      <path
        d="M14 40 Q20 30 28 34 Q36 38 42 28"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}

export function Brand({
  href = '/',
  className,
  showWordmark = true,
  compact = false,
  asLink = true,
}: BrandProps) {
  const content = (
    <>
      <WayfloMark compact={compact} />
      {showWordmark && (
        <div className="min-w-0">
          <div
            className={clsx(
              'leading-none tracking-[-0.04em]',
              compact ? 'text-[clamp(1.2rem,2vw,1.55rem)]' : 'text-[clamp(1.45rem,3vw,2.1rem)]'
            )}
          >
            <span className="font-medium text-[#6C63FF]">way</span>
            <span className="font-medium text-[#FF6584]">flo</span>
          </div>
          {!compact && (
            <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-[#7E7A92] sm:text-[11px]">
              travel. flow. freedom.
            </div>
          )}
        </div>
      )}
    </>
  );

  const sharedClassName = clsx('inline-flex items-center gap-3', className);

  if (!asLink) {
    return <div className={sharedClassName}>{content}</div>;
  }

  return (
    <Link href={href} aria-label="wayflo home" className={sharedClassName}>
      {content}
    </Link>
  );
}
