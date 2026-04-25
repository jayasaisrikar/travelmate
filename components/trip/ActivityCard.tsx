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
        selected ? 'border-[#6C63FF] bg-[#EEEDFE]' : 'border-[#DDDCE8] bg-[#FBFAFF]'
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8A869C]">
            {dayLabel}
          </div>
          <div className="mt-1 text-base font-bold text-[#3F3D56]">
            {[time, name].filter(Boolean).join(' · ')}
          </div>
          <div className="mt-2 inline-flex rounded-full bg-[#EEEDFE] px-3 py-1 text-xs font-semibold text-[#6C63FF]">
            {category}
          </div>
          {description && <p className="mt-3 text-sm leading-6 text-[#6F6C82]">{description}</p>}
          {(address || latitude || longitude) && (
            <div className="mt-3 rounded-[16px] border border-[#DDDCE8] bg-white px-3 py-2 text-xs leading-6 text-[#6F6C82]">
              {address || 'Address unavailable'}
              {typeof latitude === 'number' && typeof longitude === 'number' && (
                <span className="ml-2 font-semibold text-[#3F3D56]">
                  ({latitude.toFixed(4)}, {longitude.toFixed(4)})
                </span>
              )}
            </div>
          )}
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {cost !== null && cost !== undefined && (
            <div className="rounded-full bg-[#FFEAF0] px-3 py-1 text-sm font-bold text-[#FF6584]">
              ${cost}
            </div>
          )}

          {onRegenerate && (
            <button
              type="button"
              disabled={disableActions}
              onClick={onRegenerate}
              className="inline-flex items-center gap-1 rounded-full border border-[#3F3D56] bg-white px-3 py-2 text-sm font-semibold text-[#3F3D56] transition hover:bg-[#FBFAFF] disabled:cursor-not-allowed disabled:opacity-50"
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
              className="inline-flex items-center gap-1 rounded-full border border-[#3F3D56] bg-white px-3 py-2 text-sm font-semibold text-[#3F3D56] transition hover:bg-[#FBFAFF] disabled:cursor-not-allowed disabled:opacity-50"
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
              className="inline-flex items-center gap-1 rounded-full border border-[#3F3D56] bg-white px-3 py-2 text-sm font-semibold text-[#3F3D56] transition hover:bg-[#FBFAFF] disabled:cursor-not-allowed disabled:opacity-50"
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
