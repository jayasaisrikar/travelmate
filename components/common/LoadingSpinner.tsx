import { cn } from '@/lib/cn';

type LoadingSpinnerProps = {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeStyles = {
  sm: 'h-5 w-5 border-2',
  md: 'h-8 w-8 border-[3px]',
  lg: 'h-12 w-12 border-4',
};

export function LoadingSpinner({ label, size = 'md', className }: LoadingSpinnerProps) {
  return (
    <div role="status" className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'inline-block rounded-full border-[#6C63FF]/20 border-t-[#6C63FF] animate-spin motion-reduce:animate-pulse',
          sizeStyles[size]
        )}
      />
      <span className={label ? 'text-sm font-medium text-[#6F6C82]' : 'sr-only'}>
        {label ?? 'Loading'}
      </span>
    </div>
  );
}
