import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface LoadingSpinnerProps {
  label?: string;
  className?: string;
  size?: number;
}

export function LoadingSpinner({ label = 'Loading…', className, size = 18 }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex items-center justify-center gap-2 text-sm text-[#6F6C82]', className)}
    >
      <Loader2 className="animate-spin" style={{ width: size, height: size }} aria-hidden />
      {label && <span>{label}</span>}
    </div>
  );
}
