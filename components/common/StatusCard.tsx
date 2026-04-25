'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';

type StatusTone = 'neutral' | 'primary' | 'warning';

type StatusCardProps = {
  eyebrow?: string;
  title: string;
  description: string;
  tone?: StatusTone;
  actions?: ReactNode;
  className?: string;
};

const toneStyles: Record<StatusTone, { badge: string; panel: string; icon: ReactNode }> = {
  neutral: {
    badge: 'border-[#DDDCE8] bg-white text-[#8A869C]',
    panel: 'border-[#DDDCE8] bg-white text-[#3F3D56]',
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
  },
  primary: {
    badge: 'border-[#6C63FF]/20 bg-[#EEEDFE] text-[#6C63FF]',
    panel: 'border-[#DDDCE8] bg-[#FBFAFF] text-[#3F3D56]',
    icon: <Sparkles className="h-4 w-4" />,
  },
  warning: {
    badge: 'border-[#f0d7de] bg-[#FFF0F4] text-[#C14D72]',
    panel: 'border-[#f0d7de] bg-[#FFF0F4] text-[#C14D72]',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
};

export function StatusCard({
  eyebrow,
  title,
  description,
  tone = 'neutral',
  actions,
  className,
}: StatusCardProps) {
  const styles = toneStyles[tone];

  return (
    <div className={cn('rounded-[28px] border p-5 shadow-[0_16px_48px_rgba(46,40,51,0.06)] sm:p-6', styles.panel, className)}>
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border',
            styles.badge
          )}
        >
          {styles.icon}
        </div>

        <div className="min-w-0 flex-1">
          {eyebrow && (
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8A869C]">
              {eyebrow}
            </div>
          )}
          <h3 className="mt-1 text-xl font-black tracking-tight text-[#3F3D56]">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6F6C82]">{description}</p>

          {actions && <div className="mt-4 flex flex-wrap gap-3">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
