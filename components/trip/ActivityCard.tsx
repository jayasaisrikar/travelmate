'use client';

import { ChevronDown, ChevronUp, RefreshCcw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';

type ActivityCardProps = {
  dayLabel: string;
  time: string;
  name: string;
  category: string;
  description?: string;
  address?: string | null;
  cost?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  selected?: boolean;
  onSelect?: () => void;
  onRegenerate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  disableActions?: boolean;
};

export function ActivityCard({
  dayLabel,
  time,
  name,
  category,
  description,
  address,
  cost,
  latitude,
  longitude,
  selected = false,
  onSelect,
  onRegenerate,
  onMoveUp,
  onMoveDown,
  disableActions = false,
}: ActivityCardProps) {
  return (
    <div
      className={cn(
        'rounded-[22px] border p-4 transition',
        selected ? 'border-[#ea580c] bg-[#ffedd5]' : 'border-[#eaddc7] bg-[#fffbf2]'
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#9b8b92]">
            {dayLabel}
          </div>
          <div className="mt-1 text-base font-bold text-[#3a2540]">
            {[time, name].filter(Boolean).join(' · ')}
          </div>
          <div className="mt-2 inline-flex rounded-full bg-[#ffedd5] px-3 py-1 text-xs font-semibold text-[#ea580c]">
            {category}
          </div>
          {description && <p className="mt-3 text-sm leading-6 text-[#7c6a72]">{description}</p>}
          {(address || latitude || longitude) && (
            <div className="mt-3 rounded-[16px] border border-[#eaddc7] bg-white px-3 py-2 text-xs leading-6 text-[#7c6a72]">
              {address || 'Address unavailable'}
              {typeof latitude === 'number' && typeof longitude === 'number' && (
                <span className="ml-2 font-semibold text-[#3a2540]">
                  ({latitude.toFixed(4)}, {longitude.toFixed(4)})
                </span>
              )}
            </div>
          )}
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {cost !== null && cost !== undefined && (
            <div className="rounded-full bg-[#ffe4e6] px-3 py-1 text-sm font-bold text-[#f43f5e]">
              ${cost}
            </div>
          )}

          {onRegenerate && (
            <button
              type="button"
              disabled={disableActions}
              onClick={onRegenerate}
              className="inline-flex items-center gap-1 rounded-full border border-[#3a2540] bg-white px-3 py-2 text-sm font-semibold text-[#3a2540] transition hover:bg-[#fffbf2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles size={14} />
              Refresh
            </button>
          )}

          {onMoveUp && (
            <button
              type="button"
              disabled={disableActions}
              onClick={onMoveUp}
              className="inline-flex items-center gap-1 rounded-full border border-[#3a2540] bg-white px-3 py-2 text-sm font-semibold text-[#3a2540] transition hover:bg-[#fffbf2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronUp size={14} />
              Up
            </button>
          )}

          {onMoveDown && (
            <button
              type="button"
              disabled={disableActions}
              onClick={onMoveDown}
              className="inline-flex items-center gap-1 rounded-full border border-[#3a2540] bg-white px-3 py-2 text-sm font-semibold text-[#3a2540] transition hover:bg-[#fffbf2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronDown size={14} />
              Down
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
