import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-[#DDDCE8] bg-white p-4 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
