import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded-xl border border-[#DDDCE8] bg-[#FBFAFF] px-4 py-3 text-base text-[#3F3D56] outline-none transition placeholder:text-[#8A869C] focus:border-[#6C63FF] focus:bg-white focus:ring-2 focus:ring-[#6C63FF]/30 disabled:cursor-not-allowed disabled:opacity-60',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
