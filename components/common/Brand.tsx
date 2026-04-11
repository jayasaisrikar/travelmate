'use client';

import Image from 'next/image';
import Link from 'next/link';
import clsx from 'clsx';

interface BrandProps {
  href?: string;
  className?: string;
  showWordmark?: boolean;
  compact?: boolean;
  asLink?: boolean;
}

export function Brand({
  href = '/',
  className,
  showWordmark = true,
  compact = false,
  asLink = true,
}: BrandProps) {
  const logoHeight = compact ? 'clamp(20px, 3vw, 28px)' : 'clamp(24px, 4vw, 36px)';
  const wordmarkHeight = compact ? 'clamp(14px, 2.2vw, 18px)' : 'clamp(16px, 3vw, 24px)';

  const content = (
    <>
      <Image
        src="/images/logo.png"
        alt="TravelMate logo"
        width={36}
        height={36}
        className="h-auto w-auto object-contain"
        style={{ height: logoHeight }}
        priority
      />
      {showWordmark && (
        <Image
          src="/images/title.png"
          alt="TravelMate"
          width={440}
          height={61}
          className="h-auto w-auto object-contain"
          style={{ height: wordmarkHeight }}
          priority
        />
      )}
    </>
  );

  if (!asLink) {
    return <div className={clsx('inline-flex items-center gap-2 sm:gap-3', className)}>{content}</div>;
  }

  return (
    <Link href={href} className={clsx('inline-flex items-center gap-2 sm:gap-3', className)}>
      {content}
    </Link>
  );
}
