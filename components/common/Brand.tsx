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
  const logoSize = compact ? 28 : 36;
  const wordmarkHeight = compact ? 18 : 24;

  const content = (
    <>
      <Image
        src="/images/logo.png"
        alt="TravelMate logo"
        width={logoSize}
        height={logoSize}
        className="h-auto w-auto object-contain"
        priority
      />
      {showWordmark && (
        <Image
          src="/images/title.png"
          alt="TravelMate"
          width={440}
          height={61}
          className="h-auto w-auto object-contain"
          style={{ height: `${wordmarkHeight}px` }}
          priority
        />
      )}
    </>
  );

  if (!asLink) {
    return <div className={clsx('inline-flex items-center gap-3', className)}>{content}</div>;
  }

  return (
    <Link href={href} className={clsx('inline-flex items-center gap-3', className)}>
      {content}
    </Link>
  );
}
